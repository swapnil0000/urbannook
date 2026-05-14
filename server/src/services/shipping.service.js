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
  const FALLBACK_SHIPPING = { 
    name: "Standard Shipping", 
    total_charges: 179,
    shippingType: "FALLBACK"
  };

  if (!pincode || !cartItems || !Array.isArray(cartItems)) {
    return FALLBACK_SHIPPING;
  }

  try {
    const productIds = cartItems.map((item) => item.productId);
    const dbProducts = await Product.find({ productId: { $in: productIds } })
      .select("productId weight sellingPrice dimensions ")
      .lean();

    if (dbProducts.length === 0) {
      console.log("LOG: Shipping Fallback - No products found in DB");
      return FALLBACK_SHIPPING;
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
    const dimensions = [];
    let hasMultiQuantity = false;

    const safeFloat = (val, fallback = 0) => {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? fallback : parsed;
    };

    for (const item of finalOrderItems) {
      const quant = safeFloat(item.quantity, 1);
      if (quant > 1) hasMultiQuantity = true;
      
      let weightVal = 0;
      if (item.weight) {
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
      }

      // If weight is missing or zero, trigger immediate fallback
      if (weightVal <= 0) {
        console.log(`LOG: Shipping Fallback - Missing weight for product ${item.productId}`);
        return FALLBACK_SHIPPING;
      }

      totalWeight += weightVal * quant;
      totalAmount += safeFloat(item?.price, 0) * quant;

      const dim = item.dimensions || {};
      const L = safeFloat(dim.length);
      const W = safeFloat(dim.breadth);
      const H = safeFloat(dim.height);

      // If dimensions are missing or zero, trigger immediate fallback
      if (L <= 0 || W <= 0 || H <= 0) {
        console.log(`LOG: Shipping Fallback - Missing dimensions for product ${item.productId}`);
        return FALLBACK_SHIPPING;
      }

      dimensions.push({
        no_of_box: quant.toString(),
        length: L.toString(),
        width: W.toString(),
        height: H.toString(),
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
      console.log("LOG: Shipping Fallback - API returned no data");
      return FALLBACK_SHIPPING;
    }

    const allServices = response.data.data;
    const surfaceServices = allServices.filter(el => 
      el.name.toLowerCase().includes("surface")
    );
    
    if (surfaceServices.length === 0) {
      console.log("LOG: Shipping Fallback - No surface services available for this pincode");
      return FALLBACK_SHIPPING;
    }

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
        selectedService.total_charges = finalCharge;
        selectedService.shippingType = "DYNAMIC"; // Mark as dynamic
        return selectedService;
      }
    }

    console.log("LOG: Shipping Fallback - Selected service had 0 charges");
    return FALLBACK_SHIPPING;
  } catch (error) {
    console.error("LOG: Shipping Fallback - API Error:", error.response?.data || error.message);
    return FALLBACK_SHIPPING;
  }
};

export { checkPincodeServiceability, calculateShippingRate };
