import axios from "axios";
import Product from "../model/product.model.js";
import { ValidationError, NotFoundError } from "../utils/errors.js";

// Couriers we ship with, in the order we prefer them. Selection is slab-first:
// the parcel's weight decides the slab, and this order only breaks ties *within* that slab.
const COURIER_PRIORITY = ["delhivery", "dtdc", "bluedart", "xpressbees"];

// Charged when the API answers but no allowlisted courier serves the required slab.
const FALLBACK_SHIPPING_CHARGE = 179;

// The API's own slab field, e.g. "0.5 KG" / "10 KG". Authoritative — this drives selection.
const parseSlabKg = (value) => {
  if (value == null) return null;
  const match = String(value).match(/([\d.]+)\s*(kg|g)?/i);
  if (!match) return null;
  const amount = parseFloat(match[1]);
  if (isNaN(amount)) return null;
  return match[2]?.toLowerCase() === "g" ? amount / 1000 : amount;
};

// The slab as advertised in the service name, e.g. "Delhivery 2Kg" -> 2. Used only to
// verify parseSlabKg agrees; names without a kg figure ("Delhivery Heavy MPS") return null.
const parseWeightFromName = (name) => {
  const match = String(name || "").match(/([\d.]+)\s*kg/i);
  return match ? parseFloat(match[1]) : null;
};

const safeFloat = (val, fallback = 0) => {
  const parsed = parseFloat(val);
  return isNaN(parsed) ? fallback : parsed;
};

// Slab-first courier selection.
//
// The parcel's weight alone decides the slab (smallest tier that can hold it); COURIER_PRIORITY
// only breaks ties *within* that slab. A courier that has no service at the required slab is not
// a candidate at all — that is what stops a 1.68kg parcel being billed on a 10kg product.
//
// Returns { selected, targetSlab, candidates } — selected is null when no allowlisted courier
// serves the required slab (caller falls back to the flat rate).
const selectCourierService = (allServices, chargeableWeightInKg) => {
  const candidates = allServices
    .map((svc) => {
      const nameLower = String(svc.name || "").toLowerCase();
      return {
        raw: svc,
        name: svc.name,
        courier: COURIER_PRIORITY.find((c) => nameLower.includes(c)) || null,
        slabKg: parseSlabKg(svc.minimum_chargeable_weight),
        nameKg: parseWeightFromName(svc.name),
        charges: safeFloat(svc.total_charges, NaN),
      };
    })
    .filter((c) => {
      if (!c.courier) return false; // outside the allowlist
      if (!(c.slabKg > 0)) return false; // unreadable minimum_chargeable_weight
      if (!(c.charges > 0)) return false; // invalid total_charges
      // minimum_chargeable_weight (slabKg) is authoritative. The name is only a secondary
      // cross-check: reject a row ONLY when its name carries a weight that CONTRADICTS the
      // API slab (a genuine red flag). Names without a weight token — e.g. "Delhivery Heavy
      // MPS" — are trusted on their API slab, not discarded, so heavy-parcel services stay in.
      if (c.nameKg !== null && Math.abs(c.nameKg - c.slabKg) > 0.001) return false;
      return true;
    });

  // Step 1 — the slab, purely on weight. 1.68kg → 2kg. 1.3kg → 2kg. 0.3kg → 0.5kg.
  const availableSlabs = [...new Set(candidates.map((c) => c.slabKg))].sort((a, b) => a - b);
  let targetSlab = availableSlabs.find((slab) => slab >= chargeableWeightInKg);
  let overweight = false;

  if (targetSlab === undefined && availableSlabs.length > 0) {
    // Parcel outweighs every slab on offer — bill the largest rather than under-charging.
    targetSlab = availableSlabs[availableSlabs.length - 1];
    overweight = true;
  }

  // Step 2 — within that slab only, pick by courier priority.
  let selected = null;
  if (targetSlab !== undefined) {
    const atSlab = candidates.filter((c) => c.slabKg === targetSlab);
    for (const courier of COURIER_PRIORITY) {
      const fromCourier = atSlab
        .filter((c) => c.courier === courier)
        .sort((a, b) => a.charges - b.charges); // cheapest if one courier has several at this slab
      if (fromCourier.length > 0) {
        selected = fromCourier[0];
        break;
      }
    }
  }

  return { selected, targetSlab, candidates, overweight };
};

const calculateShippingRate = async ({ pincode, cartItems, paymentType = "PREPAID" }) => {
  if (!pincode || !cartItems || !Array.isArray(cartItems)) {
    throw new ValidationError("Pincode and cart items are required");
  }

  const validPaymentType = ["PREPAID", "COD"].includes(paymentType) ? paymentType : "PREPAID";
  const MAX_RETRIES = 5;
  let attempt = 0;
  let lastError = null;

  try {
    // Fetch product details from database
    const productIds = cartItems.map((item) => item.productId);
    const dbProducts = await Product.find({ productId: { $in: productIds } })
      .select("productId weight sellingPrice dimensions packagingDimensions")
      .lean();

    if (dbProducts.length === 0) {
      throw new NotFoundError("Products not found in database");
    }

    const finalOrderItems = cartItems.map((cartItem) => {
      const productDetail = dbProducts.find(p => p.productId === cartItem.productId);
      if (!productDetail) return null;
      return {
        ...productDetail,
        price: cartItem.price,
        variant: cartItem.selectedVariant,
        quantity: cartItem.quant || cartItem.quantity
      };
    }).filter(item => item !== null);

    // Calculate total volumetric and actual weight
    let totalVolumetricWeight = 0; // in grams
    let totalActualWeight = 0; // in grams
    let totalAmount = 0;
    let totalBoxes = 0;
    const dimensions = [];

    for (const item of finalOrderItems) {
      const quantity = safeFloat(item.quantity, 1);
      totalBoxes += quantity;

      // Parse actual weight (convert to grams)
      let actualWeightPerUnit = 0;
      const pkgDim = item.packagingDimensions || {};
      const hasPkgDim = pkgDim.length && pkgDim.breadth && pkgDim.height;

      // Use packagingDimensions.weight if available, else fall back to weight field
      if (pkgDim.weight) {
        actualWeightPerUnit = safeFloat(pkgDim.weight);
      } else if (typeof item.weight === "string") {
        const weightStr = item.weight.toLowerCase();
        if (weightStr.includes("kg")) {
          actualWeightPerUnit = safeFloat(weightStr) * 1000;
        } else {
          actualWeightPerUnit = safeFloat(weightStr.replace(/[^0-9.]/g, ""));
        }
      } else {
        actualWeightPerUnit = safeFloat(item.weight);
      }

      // Use packagingDimensions for volumetric weight, fall back to dimensions
      const dim = hasPkgDim ? pkgDim : (item.dimensions || {});
      const length = safeFloat(dim.length, 10);
      const breadth = safeFloat(dim.breadth, 10);
      const height = safeFloat(dim.height, 10);
      const volumetricWeightPerUnit = (length * breadth * height) / 5;

      totalActualWeight += actualWeightPerUnit * quantity;
      totalVolumetricWeight += volumetricWeightPerUnit * quantity;
      totalAmount += safeFloat(item?.price, 0) * quantity;

      dimensions.push({
        no_of_box: quantity.toString(),
        length: length.toString(),
        width: breadth.toString(),
        height: height.toString(),
      });
    }

    const totalChargeableWeight = Math.max(totalActualWeight, totalVolumetricWeight);
    const totalChargeableWeightInKg = totalChargeableWeight / 1000;

    // Make API call with retry logic
    while (attempt < MAX_RETRIES) {
      attempt++;
      try {
        const requestPayload = {
          pickup_pincode: 122018,
          delivery_pincode: pincode,
          payment_type: validPaymentType,
          shipment_type: "FORWARD",
          order_amount: Math.ceil(totalAmount),
          type_of_package: "SPS",
          rov_type: "ROV_OWNER",
          weight: Math.ceil(totalChargeableWeight),
          dimensions: dimensions,
          ...(validPaymentType === "COD" && { cod_amount: Math.ceil(totalAmount) }),
        };

        // console.log(`[SHIPPING RATE] 📤 API Request:`, JSON.stringify(requestPayload, null, 2));

        const response = await axios.post(
          `https://shipping-api.com/app/api/v1/rate-calculator`,
          requestPayload,
          {
            headers: {
              "private-key": process.env.SHIPMOZO_PRIVATE_KEY,
              "public-key": process.env.SHIPMOZO_PUBLIC_KEY,
            },
            timeout: 15000,
          },
        );

        if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
          throw new Error("Invalid response format from shipping API");
        }

        const allServices = response.data.data;
        if (allServices.length === 0) {
          throw new Error("Pincode not serviceable - No courier available");
        }

        const { selected, targetSlab, candidates, overweight } = selectCourierService(allServices, totalChargeableWeightInKg);

        // Weights condensed for the single summary log below.
        const wt = `actual ${(totalActualWeight / 1000).toFixed(2)}kg, vol ${(totalVolumetricWeight / 1000).toFixed(2)}kg, chargeable ${totalChargeableWeightInKg.toFixed(2)}kg`;

        // No allowlisted courier at the required slab → flat fallback
        if (!selected) {
          console.warn(`[SHIPPING] pin ${pincode} | ${validPaymentType} | ${wt} | ${totalBoxes} box(es) | ${candidates.length} candidates | no allowlisted courier at slab ${targetSlab ?? "-"}kg → FALLBACK ₹${FALLBACK_SHIPPING_CHARGE}`);
          return {
            total_charges: FALLBACK_SHIPPING_CHARGE,
            type: "fallback",
            totalWeight: Math.ceil(totalChargeableWeight),
            expectedNoOfBoxes: totalBoxes,
            serviceName: null,
            courierName: null,
            estimatedDays: "3-4 Days",
            paymentType: validPaymentType,
          };
        }

        const finalCharge = Math.ceil(selected.charges);

        // Single detailed line per rate calculation (inputs → decision → charge).
        console.log(`[SHIPPING] pin ${pincode} | ${validPaymentType} | ${wt} | ${totalBoxes} box(es) | slab ${targetSlab}kg${overweight ? " (OVERWEIGHT→largest)" : ""} | ${candidates.length} candidates | picked ${selected.courier.toUpperCase()} "${selected.name}" ₹${selected.charges} → charge ₹${finalCharge}`);

        return {
          total_charges: finalCharge,
          type: "dynamic",
          totalWeight: Math.ceil(totalChargeableWeight),
          expectedNoOfBoxes: totalBoxes,
          serviceName: selected.name,
          courierName: selected.courier,
          slabKg: targetSlab,
          chargeableWeightKg: Number(totalChargeableWeightInKg.toFixed(3)),
          estimatedDays: selected.raw.estimated_delivery || "3-4 Days",
          paymentType: validPaymentType,
        };
      } catch (error) {
        lastError = error;

        // If it's a 4xx error or "Pincode not serviceable" error, don't retry
        if (
          (error.response?.status && error.response.status >= 400 && error.response.status < 500) ||
          error.message.includes("Pincode not serviceable")
        ) {
          console.error(`[SHIPPING] pin ${pincode} | non-retryable error: ${error.message}${error.response ? ` (status ${error.response.status})` : ""}`);
          throw error;
        }

        // For network errors, wait before retrying
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, 1500 * attempt));
        }
      }
    }

    // All retries exhausted
    console.error(`[SHIPPING] pin ${pincode} | failed after ${MAX_RETRIES} attempts: ${lastError?.message || "unknown error"}`);
    throw new Error(lastError?.message || "Unable to calculate shipping rate after multiple attempts");
  } catch (error) {
    console.error(`[SHIPPING] pin ${pincode} | ${error.message}`);
    throw error;
  }
};

export { calculateShippingRate, selectCourierService };
