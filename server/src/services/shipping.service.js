import axios from "axios";
import Product from "../model/product.model.js";
import { ValidationError, NotFoundError } from "../utils/errors.js";

const checkPincodeServiceability = async (deliveryPinCode) => {
  if (!deliveryPinCode) {
    throw new ValidationError("Pincode is required");
  }

  const response = await axios.post(
    `https://shipping-api.com/app/api/v1/pincode-serviceability`,
    {
      pickup_pincode: 122018,
      delivery_pincode: deliveryPinCode,
    },
    {
      headers: {
        "private-key": process.env.SHIPMOZO_PRIVATE_KEY,
        "public-key": process.env.SHIPMOZO_PUBLIC_KEY,
      },
    },
  );

  return response.data;
};

const calculateShippingRate = async ({ pincode, cartItems }) => {
  // Define fallback response
  const FALLBACK_AMOUNT = 179;
  const buildFallback = (weight = 0, boxes = 0) => ({
    total_charges: FALLBACK_AMOUNT,
    type: "standard",
    totalWeight: weight,
    expectedNoOfBoxes: boxes
  });

  if (!pincode || !cartItems || !Array.isArray(cartItems)) {
    return buildFallback();
  }

  try {
    const productIds = cartItems.map((item) => item.productId);
    const dbProducts = await Product.find({ productId: { $in: productIds } })
      .select("productId weight sellingPrice dimensions ")
      .lean();

    if (dbProducts.length === 0) {
      return buildFallback();
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

    let totalWeight = 0;
    let totalAmount = 0;
    let totalBoxes = 0;
    const dimensions = [];
    let hasMultiQuantity = false;

    const safeFloat = (val, fallback = 0) => {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? fallback : parsed;
    };

    for (const item of finalOrderItems) {
      const quant = safeFloat(item.quantity, 1);
      if (quant > 1) hasMultiQuantity = true;
      totalBoxes += quant;
      
      let weightVal = 0;
      if (typeof item.weight === "string") {
        const weightStr = item.weight.toLowerCase();
        if (weightStr.includes("kg")) {
          weightVal = safeFloat(weightStr) * 1000;
        } else {
          weightVal = safeFloat(weightStr.replace(/[^0-9.]/g, ""));
        }
      } else {
        weightVal = safeFloat(item.weight);
      }

      totalWeight += weightVal * quant;
      totalAmount += safeFloat(item?.price, 0) * quant;

      const dim = item.dimensions || {};
      dimensions.push({
        no_of_box: quant.toString(),
        length: safeFloat(dim.length, 10).toString(),
        width: safeFloat(dim.breadth, 10).toString(),
        height: safeFloat(dim.height, 10).toString(),
      });
    }

    const response = await axios.post(
      `https://shipping-api.com/app/api/v1/rate-calculator`,
      {
        pickup_pincode: 122018,
        delivery_pincode: pincode,
        payment_type: "PREPAID",
        shipment_type: "FORWARD",
        order_amount: Math.ceil(totalAmount),
        type_of_package: "SPS",
        rov_type: "ROV_OWNER",
        weight: Math.ceil(totalWeight),
        dimensions: dimensions,
      },
      {
        headers: {
          "private-key": process.env.SHIPMOZO_PRIVATE_KEY,
          "public-key": process.env.SHIPMOZO_PUBLIC_KEY,
        },
      },
    );

    if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
      return buildFallback(totalWeight, totalBoxes);
    }

    const allServices = response.data.data;
    const surfaceServices = allServices.filter(el => 
      el.name.toLowerCase().includes("surface")
    );
    
    if (surfaceServices.length === 0) return buildFallback(totalWeight, totalBoxes);

    let selectedService = surfaceServices.find(el => el.name.startsWith("DTDC Surface"));
    
    if (!selectedService) {
      selectedService = surfaceServices.find(el => el.name.startsWith("Delhivery Surface"));
    }

    if (!selectedService) {
      selectedService = surfaceServices[0];
    }

    if (selectedService) {
      let baseCharge = safeFloat(selectedService.total_charges);
      if (baseCharge > 0) {
        let finalCharge = Math.ceil(baseCharge);

        if (hasMultiQuantity) {
          finalCharge = Math.ceil(finalCharge * 1.25);
        }
        finalCharge += 30;
        
        return {
          total_charges: finalCharge,
          type: "dynamic",
          totalWeight: totalWeight,
          expectedNoOfBoxes: totalBoxes,
          serviceName: selectedService.name
        };
      }
    }

    return buildFallback(totalWeight, totalBoxes);
  } catch (error) {
    console.error("Shipping Service Error:", error.response?.data || error.message);
    return buildFallback();
  }
};

export { checkPincodeServiceability, calculateShippingRate };
