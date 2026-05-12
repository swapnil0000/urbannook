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
  if (!pincode || !cartItems || !Array.isArray(cartItems)) {
    throw new ValidationError("Pincode and cart items are required");
  }

  const productIds = cartItems.map((item) => item.productId);
  const dbProducts = await Product.find({ productId: { $in: productIds } })
    .select("productId weight sellingPrice dimensions ")
    .lean();

  if (dbProducts.length === 0) {
    throw new NotFoundError("Products not found in database");
  }
  const finalOrderItems = cartItems.map((cartItem) => {
    const productDetail = dbProducts.find(p => p.productId === cartItem.productId);

    return {
        ...productDetail,          
        price: cartItem.price,    
        variant: cartItem.selectedVariant, 
        quantity: cartItem.quant   
    };
}).filter(item => item !== null)

  let totalWeight = 0;
  let totalAmount = 0;
  const dimensions = [];
  let hasMultiQuantity = false;

  const safeFloat = (val, fallback = 0) => {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? fallback : parsed;
  };

  for (const item of finalOrderItems) {
    const quant = safeFloat(item.quant, 1);
    if (quant > 1) hasMultiQuantity = true;
    
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
      length: safeFloat(dim.length).toString(),
      width: safeFloat(dim.breadth).toString(),
      height: safeFloat(dim.height).toString(),
    });
  }

  try {
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
      return null;
    }

    const allServices = response.data.data;
    const surfaceServices = allServices.filter(el => 
      el.name.toLowerCase().includes("surface")
    );
    
    if (surfaceServices.length === 0) return null;

    let selectedService = surfaceServices.find(el => el.name.startsWith("DTDC Surface"));
    
    if (!selectedService) {
      selectedService = surfaceServices.find(el => el.name.startsWith("Delhivery Surface"));
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
        return selectedService;
      }
    }

    // Fallback if no specific service is found or charges are 0
    return { name: "Standard Shipping", total_charges: 179 };
  } catch (error) {
    console.error("Shipping Service Error:", error.response?.data || error.message);
    return null;
  }
};

export { checkPincodeServiceability, calculateShippingRate };
