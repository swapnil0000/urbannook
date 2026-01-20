import Admin from "../model/admin.model.js";
import Product from "../model/product.model.js";
import { finalProductName } from "../utlis/CommonResponse.js";

const productUpdateExisting = async (productName, productQuantity) => {
  const normalizedName = finalProductName(productName);

  const res = await Product.findOne({ productName: normalizedName });
  return res && productQuantity == 1
    ? {
        statusCode: 200,
        message: `Product already exists with name: ${res?.productName}`,
        data: {
          productName: res?.productName,
          productId: res?.productId,
          sellingPrice: res?.sellingPrice,
          status: res?.status,
          productQuantity: res?.productQuantity,
        },
        success: true,
      }
    : {
        statusCode: 200,
        message: `Product Details: ${res?.productName}`,
        data: {
          productName: res?.productName,
          productId: res?.productId,
          sellingPrice: res?.sellingPrice,
          status: res?.status,
          productQuantity: `Product Quantity Updated:${res?.productQuantity}`,
        },
        success: true,
      };
};

const adminLoginService = async (email, password) => {
  const res = await Admin.findOne({ email });
  if (!res) {
    return {
      statusCode: 404,
      message: "User doesn't exist",
      data: null,
      success: false,
    };
  }
  //pass check
  const passCheck = (await res.passCheck(password)) ? true : false;

  if (!passCheck) {
    return {
      statusCode: 401,
      message: "password is wronng",
      data: email,
      success: false,
    };
  }
  const adminAccessToken = await res.genAccessToken();

  return {
    statusCode: 200,
    message: "user details",
    data: {
      userEmail: res?.email,
      adminAccessToken,
    },
    success: true,
  };
};

const totalProductService = async () => {
  const products = await Product.find().select("-_id").sort({ createdAt: -1 });

  if (!products.length) {
    return {
      statusCode: 404,
      message: "No Product in inventory",
      data: null,
      success: false,
    };
  }

  return {
    statusCode: 200,
    message: "Total Products",
    data: products,
    success: true,
  };
};
export { productUpdateExisting, adminLoginService, totalProductService };
