import Admin from "../model/admin.model.js";
import Product from "../model/product.model.js";
import { finalProductName } from "../utlis/CommonResponse.js";

const productExisting = async (productName, productQuantity) => {
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
        message: `Product already exists with name: ${res?.productName}`,
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

const admingLoginService = async (userEmail, userPassword) => {
  const res = await Admin.findOne({ userEmail });
  if (!res) {
    return {
      statusCode: 404,
      message: "User doesn't exist",
      data: null,
      success: false,
    };
  }
  //pass check
  const passCheck = (await res.passCheck(userPassword)) ? true : false;
  if (!passCheck) {
    return {
      statusCode: 401,
      message: "userPassword is wronng",
      data: userEmail,
      success: false,
    };
  }
  const refreshToken = await res.genAccessToken();

  return {
    statusCode: 200,
    message: "user details",
    data: {
      userEmail: res?.userEmail,
      refreshToken,
    },
    success: true,
  };
};
export { productExisting, admingLoginService };
