import axios from "axios";
import Product from "../model/product.model.js";
import { ValidationError, NotFoundError } from "../utils/errors.js";

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

    const safeFloat = (val, fallback = 0) => {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? fallback : parsed;
    };

    // Calculate total volumetric and actual weight
    let totalVolumetricWeight = 0; // in grams
    let totalActualWeight = 0; // in grams
    let totalAmount = 0;
    let totalBoxes = 0;
    const dimensions = [];

    console.log("\n" + "=".repeat(80));
    console.log("[SHIPPING RATE] 🚀 Starting shipping rate calculation");
    console.log("[SHIPPING RATE] Cart Items:", cartItems.length);
    console.log("=".repeat(80) + "\n");

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

        console.log(`[SHIPPING RATE] 📤 API Request:`, JSON.stringify(requestPayload, null, 2));

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
        console.log(`[SHIPPING RATE] 📄 FULL API RESPONSE:`, JSON.stringify(response.data, null, 2));

        if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
          console.error(`[SHIPPING RATE] ❌ Invalid response structure`);
          throw new Error("Invalid response format from shipping API");
        }

        const allServices = response.data.data;
        console.log(`\n[SHIPPING RATE] 📦 Received ${allServices.length} services from API`);

        // Filter for preferred couriers (Delhivery, DTDC, BlueDart, XpressBees)
        // Include both surface and non-surface variants
        const courierPriorityNames = ["delhivery", "dtdc", "xpressbees", "bluedart"];
        const filteredServices = allServices.filter(svc => {
          const nameLower = svc.name.toLowerCase();
          return courierPriorityNames.some(courier => nameLower.includes(courier));
        });

        console.log(`[SHIPPING RATE] 🚚 Found ${filteredServices.length} services from preferred couriers`);

        if (filteredServices.length === 0) {
          console.error(`[SHIPPING RATE] ❌ No services available from preferred couriers`);
          throw new Error("Pincode not serviceable - No preferred courier available");
        }

        // Helper function to extract weight from service name (e.g., "Delhivery 2Kg" -> 2)
        const extractWeightFromName = (name) => {
          const match = name.match(/([0-9.]+)\s*k?g/i);
          return match ? parseFloat(match[1]) : null;
        };

        // Group services by courier
        const courierPriority = ["delhivery", "dtdc", "xpressbees", "bluedart"];
        const servicesByCourier = {};

        filteredServices.forEach(svc => {
          const nameLower = svc.name.toLowerCase();
          for (const courier of courierPriority) {
            if (nameLower.includes(courier)) {
              if (!servicesByCourier[courier]) {
                servicesByCourier[courier] = [];
              }
              servicesByCourier[courier].push(svc);
              break;
            }
          }
        });

        console.log(`\n[SHIPPING RATE] 🏢 Services grouped by courier:`);
        Object.keys(servicesByCourier).forEach(courier => {
          console.log(`  - ${courier.toUpperCase()}: ${servicesByCourier[courier].length} slabs`);
          servicesByCourier[courier].forEach(svc => {
            const weight = extractWeightFromName(svc.name);
            console.log(`    • ${svc.name} - ${weight}kg - ₹${svc.total_charges}`);
          });
        });

        // Try each courier in priority order and select FIRST available nearest higher slab
        let selectedService = null;

        for (const courier of courierPriority) {
          if (servicesByCourier[courier] && servicesByCourier[courier].length > 0) {
            const courierServices = servicesByCourier[courier];

            // Find the nearest higher weight slab
            let bestMatch = null;
            let minDiff = Infinity;

            for (const svc of courierServices) {
              const slabWeight = extractWeightFromName(svc.name);
              if (slabWeight === null) continue;

              // We want nearest HIGHER slab (slab >= chargeable weight)
              if (slabWeight >= totalChargeableWeightInKg) {
                const diff = slabWeight - totalChargeableWeightInKg;
                if (diff < minDiff) {
                  minDiff = diff;
                  bestMatch = svc;
                }
              }
            }

            // If no higher slab found, take the highest available slab
            if (!bestMatch && courierServices.length > 0) {
              bestMatch = courierServices.reduce((max, svc) => {
                const slabWeight = extractWeightFromName(svc.name) || 0;
                const maxWeight = extractWeightFromName(max.name) || 0;
                return slabWeight > maxWeight ? svc : max;
              });
            }

            if (bestMatch) {
              selectedService = bestMatch;
              console.log(`\n[SHIPPING RATE] 🎯 Selected ${courier.toUpperCase()}: ${bestMatch.name} - ₹${bestMatch.total_charges}`);
              break;
            }
          }
        }

        // If no priority courier found, throw error
        if (!selectedService) {
          console.error(`[SHIPPING RATE] ❌ No suitable courier found from priority list`);
          throw new Error("Pincode not serviceable - No preferred courier available");
        }

        const finalCharge = Math.ceil(safeFloat(selectedService.total_charges));

        console.log(`\n[SHIPPING RATE] 💰 Final Calculation:`);
        console.log(`  - Service: ${selectedService.name}`);
        console.log(`  - Base Charge (incl. GST): ₹${selectedService.total_charges}`);
        console.log(`  - Final Charge: ₹${finalCharge}`);

        const result = {
          total_charges: finalCharge,
          type: "dynamic",
          totalWeight: Math.ceil(totalChargeableWeight),
          expectedNoOfBoxes: totalBoxes,
          serviceName: selectedService.name,
          courierName: selectedService.name.split(' ')[0], // Extract courier name
          estimatedDays: selectedService.estimated_delivery || "3-4 Days",
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

export { calculateShippingRate };
