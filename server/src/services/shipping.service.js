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
      if (!(c.slabKg > 0)) {
        console.warn(`[SHIPPING RATE] ⚠️  Dropped "${c.name}" - unreadable minimum_chargeable_weight (${c.raw.minimum_chargeable_weight})`);
        return false;
      }
      if (!(c.charges > 0)) {
        console.warn(`[SHIPPING RATE] ⚠️  Dropped "${c.name}" - invalid total_charges (${c.raw.total_charges})`);
        return false;
      }
      // Cross-check the slab in the name against minimum_chargeable_weight, so a malformed
      // API row can't silently price the parcel on the wrong slab.
      if (c.nameKg === null) {
        console.warn(`[SHIPPING RATE] ⚠️  Dropped "${c.name}" - no slab in name to verify against ${c.slabKg}kg`);
        return false;
      }
      if (Math.abs(c.nameKg - c.slabKg) > 0.001) {
        console.warn(`[SHIPPING RATE] 🚨 Dropped "${c.name}" - slab mismatch: name says ${c.nameKg}kg, API says ${c.slabKg}kg`);
        return false;
      }
      return true;
    });

  console.log(`\n[SHIPPING RATE] 🚚 ${candidates.length} verified services from allowlisted couriers:`);
  [...candidates]
    .sort((a, b) => a.slabKg - b.slabKg || a.charges - b.charges)
    .forEach((c) => console.log(`    • [${c.slabKg}kg slab] ${c.name} - ₹${c.charges}`));

  // Step 1 — the slab, purely on weight. 1.68kg → 2kg. 1.3kg → 2kg. 0.3kg → 0.5kg.
  const availableSlabs = [...new Set(candidates.map((c) => c.slabKg))].sort((a, b) => a - b);
  let targetSlab = availableSlabs.find((slab) => slab >= chargeableWeightInKg);

  if (targetSlab === undefined && availableSlabs.length > 0) {
    // Parcel outweighs every slab on offer — bill the largest rather than under-charging.
    targetSlab = availableSlabs[availableSlabs.length - 1];
    console.warn(`[SHIPPING RATE] 🚨 Parcel (${chargeableWeightInKg.toFixed(2)}kg) exceeds every available slab. Falling back to largest slab: ${targetSlab}kg`);
  }

  // Step 2 — within that slab only, pick by courier priority.
  let selected = null;
  if (targetSlab !== undefined) {
    const atSlab = candidates.filter((c) => c.slabKg === targetSlab);
    console.log(`\n[SHIPPING RATE] 🎯 Chargeable ${chargeableWeightInKg.toFixed(2)}kg → target slab ${targetSlab}kg (${atSlab.length} services)`);

    for (const courier of COURIER_PRIORITY) {
      const fromCourier = atSlab
        .filter((c) => c.courier === courier)
        .sort((a, b) => a.charges - b.charges); // cheapest if one courier has several at this slab
      if (fromCourier.length > 0) {
        selected = fromCourier[0];
        break;
      }
      console.log(`[SHIPPING RATE]    ${courier.toUpperCase()} has no ${targetSlab}kg service → next courier`);
    }
  }

  return { selected, targetSlab, candidates };
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

      console.log(`[SHIPPING RATE] 📦 Product: ${item.productId}`);
      console.log(`  - Quantity: ${quantity}`);
      console.log(`  - Dimensions: ${length} x ${breadth} x ${height} cm`);
      console.log(`  - Actual Weight/unit: ${actualWeightPerUnit}g`);
      console.log(`  - Volumetric Weight/unit: ${volumetricWeightPerUnit.toFixed(2)}g`);
      console.log(`  - Chargeable Weight/unit: ${Math.max(actualWeightPerUnit, volumetricWeightPerUnit).toFixed(2)}g`);

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

    console.log(`\n[SHIPPING RATE] 📊 Weight Summary:`);
    console.log(`  - Total Actual Weight: ${totalActualWeight}g (${(totalActualWeight/1000).toFixed(2)}kg)`);
    console.log(`  - Total Volumetric Weight: ${totalVolumetricWeight.toFixed(2)}g (${(totalVolumetricWeight/1000).toFixed(2)}kg)`);
    console.log(`  - Total Chargeable Weight: ${totalChargeableWeight.toFixed(2)}g (${totalChargeableWeightInKg.toFixed(2)}kg)`);
    console.log(`  - Total Amount: ₹${totalAmount}`);
    console.log(`  - Total Boxes: ${totalBoxes}`);
    console.log(`  - Payment Type: ${validPaymentType}`);

    // Make API call with retry logic
    while (attempt < MAX_RETRIES) {
      attempt++;
      try {
        console.log(`\n[SHIPPING RATE] ⏳ Attempt ${attempt}/${MAX_RETRIES}`);

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

        console.log(`[SHIPPING RATE] ✅ API Response (Status ${response.status})`);
        // console.log(`[SHIPPING RATE] 📄 FULL API RESPONSE:`, JSON.stringify(response.data, null, 2));

        if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
          console.error(`[SHIPPING RATE] ❌ Invalid response structure`);
          throw new Error("Invalid response format from shipping API");
        }

        const allServices = response.data.data;
        console.log(`\n[SHIPPING RATE] 📦 Received ${allServices.length} services from API`);

        if (allServices.length === 0) {
          console.error(`[SHIPPING RATE] ❌ No services returned for this pincode`);
          throw new Error("Pincode not serviceable - No courier available");
        }

        const { selected, targetSlab } = selectCourierService(allServices, totalChargeableWeightInKg);

        // No allowlisted courier at the required slab → flat fallback
        if (!selected) {
          console.warn(`[SHIPPING RATE] 🚨 No allowlisted courier at the required slab. Using flat fallback ₹${FALLBACK_SHIPPING_CHARGE}`);
          const fallbackResult = {
            total_charges: FALLBACK_SHIPPING_CHARGE,
            type: "fallback",
            totalWeight: Math.ceil(totalChargeableWeight),
            expectedNoOfBoxes: totalBoxes,
            serviceName: null,
            courierName: null,
            estimatedDays: "3-4 Days",
            paymentType: validPaymentType,
          };
          console.log(`\n[SHIPPING RATE] 🎉 FALLBACK:`, JSON.stringify(fallbackResult, null, 2));
          console.log("=".repeat(80) + "\n");
          return fallbackResult;
        }

        const finalCharge = Math.ceil(selected.charges);

        console.log(`\n[SHIPPING RATE] 💰 Final Calculation:`);
        console.log(`  - Chargeable Weight: ${totalChargeableWeightInKg.toFixed(2)}kg → ${targetSlab}kg slab`);
        console.log(`  - Service: ${selected.name} (${selected.courier.toUpperCase()})`);
        console.log(`  - Base Charge (incl. GST): ₹${selected.charges}`);
        console.log(`  - Final Charge: ₹${finalCharge}`);

        const result = {
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

        console.log(`\n[SHIPPING RATE] 🎉 SUCCESS:`, JSON.stringify(result, null, 2));
        console.log("=".repeat(80) + "\n");

        return result;
      } catch (error) {
        lastError = error;

        console.error(`\n[SHIPPING RATE] ❌ Error on attempt ${attempt}/${MAX_RETRIES}:`);
        console.error(`[SHIPPING RATE] Error:`, error.message);

        if (error.response) {
          console.error(`[SHIPPING RATE] Response Status:`, error.response.status);
          console.error(`[SHIPPING RATE] Response Data:`, JSON.stringify(error.response.data, null, 2));
        }

        // If it's a 4xx error or "Pincode not serviceable" error, don't retry
        if (
          (error.response?.status && error.response.status >= 400 && error.response.status < 500) ||
          error.message.includes("Pincode not serviceable")
        ) {
          console.error(`[SHIPPING RATE] 🛑 Non-retryable error`);
          console.error("=".repeat(80) + "\n");
          throw error;
        }

        // For network errors, wait before retrying
        if (attempt < MAX_RETRIES) {
          const delayMs = 1500 * attempt;
          console.log(`[SHIPPING RATE] ⏸️  Waiting ${delayMs}ms before retry...\n`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    // All retries exhausted
    console.error("=".repeat(80) + "\n");
    throw new Error(lastError?.message || "Unable to calculate shipping rate after multiple attempts");
  } catch (error) {
    console.error("[Shipping Service Error]:", error.message);
    throw error;
  }
};

export { calculateShippingRate, selectCourierService };
