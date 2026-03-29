import axios from "axios";
import Product from "../model/product.model.js";
import env from "../config/envConfigSetup.js";

const calculateShippingRate = async (cartItems, userPincode, orderAmount) => {
  let dimensionsArray = [];
  let totalWeight = 0;
  const LAMP_ID = env.LAMP_ID;

  for (const item of cartItems) {
    const product = await Product.findOne({ productId: item.productId })
      .select("boxDimensionsAndWeight productId -_id")
      .lean();

    if (product) {
      const { l, b, h, w } = product.boxDimensionsAndWeight;
      const q = Number(item.quant);

      // Lamps are usually shipped in individual boxes if multiple
      if (product.productId === LAMP_ID && q > 1) {
        for (let i = 0; i < q; i++) {
          dimensionsArray.push({
            no_of_box: "1",
            length: l.toString(),
            width: b.toString(),
            height: h.toString(),
          });
        }
        totalWeight += w * q;
      } else {
        // Other items are bundled into one box (simplified logic)
        if (dimensionsArray.length === 0) {
          dimensionsArray.push({
            no_of_box: "1",
            length: l.toString(),
            width: b.toString(),
            height: h.toString(),
          });
        } else {
          let firstBox = dimensionsArray[0];
          firstBox.height = (Number(firstBox.height) + h * q).toString();
          if (l > Number(firstBox.length)) firstBox.length = l.toString();
          if (b > Number(firstBox.width)) firstBox.width = b.toString();
        }
        totalWeight += w * q;
      }
    }
  }

  try {
    const result = await axios.post(
      `${env.SHIPMOZO_BASE_URL}/rate-calculator`,
      {
        pickup_pincode: 122001,
        delivery_pincode: Number(userPincode),
        payment_type: "PREPAID",
        shipment_type: "FORWARD",
        order_amount: orderAmount,
        type_of_package: "SPS",
        rov_type: "ROV_OWNER",
        weight: totalWeight,
        dimensions: dimensionsArray,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "public-key": env.SHIPMOZO_PUBLIC_KEY,
          "private-key": env.SHIPMOZO_PRIVATE_KEY,
        },
      },
    );

    if (result.data && result.data.result === "1") {
      const rates = result.data.data;

      // Specific requirement: Use Delhivery Surface (cheapest)
      const delhiverySurface = rates.filter(
        (n) => n.name.includes("Delhivery") && !n.name.includes("Air"),
      );

      if (delhiverySurface.length > 0) {
        const cheapest = delhiverySurface.reduce((prev, curr) =>
          Number(prev.total_charges) < Number(curr.total_charges) ? prev : curr,
        );

        return {
          success: true,
          shippingCharge: Math.ceil(Number(cheapest.total_charges)),
          estimatedDelivery: cheapest.estimated_delivery || "4-5 Days",
          details: {
            totalWeight,
            boxesCount: dimensionsArray.length,
            courierUsed: cheapest.name,
          },
        };
      }
      throw new Error("No Delhivery Surface option found");
    } else {
      throw new Error(
        "Shipmozo API returned error: " +
          (result.data?.message || "Unknown error"),
      );
    }
  } catch (error) {
    console.error("[SHIPPING SERVICE] Error calculating rate:", error.message);
    // Fallback charge if API fails
    return {
      success: true,
      shippingCharge: 149,
      note: "Fallback shipping charge used",
      error: error.message,
    };
  }
};

export { calculateShippingRate };
