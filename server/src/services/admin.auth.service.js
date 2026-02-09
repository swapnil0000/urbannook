import Admin from "../model/admin.model.js";
import Product from "../model/product.model.js";
import { v7 as uuidv7 } from "uuid";
import { productUpdateFieldMissing } from "../utlis/ValidateRes.js";
const createNewProductService = async (
  adminEmail,
  productName,
  productImg,
  productDes,
  sellingPrice,
  productCategory,
  productQuantity,
  productStatus,
  tags,
  productSubDes,
  productSubCategory,
) => {
  if (!adminEmail) {
    return {
      statusCode: 401,
      message: "Unauthorized",
      data: null,
      success: false,
    };
  }

  const updatedProductQunatity = {
    productName: productName?.length > 0 ? productName : null,
    productImg: productImg?.length > 0 ? productImg : null,
    productDes: productDes?.length > 0 ? productDes : null,
    sellingPrice: sellingPrice >= 10 ? sellingPrice : null,
    productCategory: productCategory?.length > 0 ? productCategory : null,
    productQuantity: productQuantity > 0 ? productQuantity : 0,
    productStatus: productStatus?.length > 0 ? productStatus : null,
    productSubDes: productSubDes?.length > 0 ? productSubDes : null,
    productSubCategory:
      productSubCategory?.length > 0 ? productSubCategory : null,
  };
  for (let [key, val] of Object.entries(updatedProductQunatity)) {
    if (!val)
      return {
        statusCode: 400,
        message: `Can't create the product — ${key} is missing`,
        data: null,
        success: false,
      };
  }
  const createdUiProdNameAndIds = await Product.find(
    {},
    { productName: 1, _id: 0 },
  ).lean();
  const productWithSameExist = createdUiProdNameAndIds.filter(
    (el) => el?.productName == productName,
  );

  if (productWithSameExist?.length > 0) {
    return {
      statusCode: 409,
      message: `Can't create the product with name — ${productName} already exist`,
      data: null,
      success: false,
    };
  }

  const lastCreatedUiProdId =
    createdUiProdNameAndIds[createdUiProdNameAndIds.length - 1]; // accessing the last one // UN-PROD-130
  // console.log(lastCreatedUiProdId.uiProductId.split("-")[2]); // accessing the num value eg 130 from UN-PROD
  let newCreatedUiProdId = lastCreatedUiProdId?.uiProductId?.split("-")[2];
  const createdProduct = await Product.create({
    productName,
    productId: uuidv7(),
    uiProductId:
      `UN-PROD-${Number(newCreatedUiProdId) + 1}` || `UN-PROD-${uuidv7()}`,
    productImg,
    productDes,
    sellingPrice,
    productCategory,
    productQuantity: productQuantity || 1,
    productStatus,
    tags,
    productSubDes,
    productSubCategory,
  });
  return {
    statusCode: 201,
    message: `Product created with product id ${createdProduct?.productId}`,
    data: createdProduct,
    success: true,
  };
};

const viewProductDetailsService = async (adminEmail, productId) => {
  if (!adminEmail) {
    return {
      statusCode: 401,
      message: "Unauthorized",
      data: null,
      success: false,
    };
  }
  if (!productId) {
    return {
      statusCode: 404,
      message: `${productId} is missing`,
      data: null,
      success: false,
    };
  }
  const productDetails = await Product.find({
    productId: productId,
  }).select("-__v -_id");

  if (productDetails?.length == 0 || !productDetails) {
    return {
      statusCode: 404,
      message: `Can't find the product with id — ${productId}`,
      data: null,
      success: false,
    };
  }
  return {
    statusCode: 202,
    message: `Product details with product id ${productDetails?.productId}`,
    data: productDetails,
    success: true,
  };
};

const existingProductUpdateService = async (
  adminEmail,
  productId,
  productName,
  uiProductId,
  productImg,
  productDes,
  sellingPrice,
  productCategory,
  productQuantity,
  productStatus,
  tags,
  productSubDes,
  productSubCategory,
  action,
) => {
  try {
    if (!adminEmail) {
      return {
        statusCode: 401,
        message: "Unauthorized",
        data: null,
        success: false,
      };
    }
    if (!productId) {
      return {
        statusCode: 401,
        message:
          "Product Id is required to fetch and update the product details",
        data: null,
        success: false,
      };
    }

    const productFields = {
      productName,
      uiProductId,
      productImg,
      productDes,
      sellingPrice,
      productCategory,
      productQuantity,
      productStatus,
      tags,
      productSubDes,
      productSubCategory,
    };
    const notPresentProductDetailsToUpdate = {};
    const presentProductDetailsToUpdate = {};
    for (let [key, val] of Object.entries(productFields)) {
      !val && val == null
        ? (notPresentProductDetailsToUpdate[key] = val)
        : (presentProductDetailsToUpdate[key] = val);
    }

    //Validate the presentProductDetailsToUpdate
    const exisitingProductName = await Product.find(
      {},
      { productName: 1, uiProductId: 1 },
    ).lean();

    const productExistWithSameNameOrUiProductId = exisitingProductName.find(
      (el) => {
        return (
          el.productId !== productId &&
          el.uiProductId !== uiProductId &&
          (el.productName === productName || el.uiProductId === uiProductId)
        );
      },
    );

    if (productExistWithSameNameOrUiProductId) {
      let conflictFields = [];

      if (productExistWithSameNameOrUiProductId.productName === productName) {
        conflictFields.push("Product Name");
      }

      if (productExistWithSameNameOrUiProductId.uiProductId === uiProductId) {
        conflictFields.push("UI Product ID");
      }

      return {
        statusCode: 409,
        message: `${conflictFields.join(" & ")} already exists`,
        data: null,
        success: false,
      };
    }

    const presentProductDetailsToUpdateValidation = productUpdateFieldMissing(
      presentProductDetailsToUpdate,
    );
    if (!presentProductDetailsToUpdateValidation) {
      return {
        statusCode: presentProductDetailsToUpdateValidation?.statusCode,
        message: presentProductDetailsToUpdateValidation?.message,
        data: presentProductDetailsToUpdateValidation?.data,
        success: presentProductDetailsToUpdateValidation?.success,
      };
    }

    const existingProductDetails = await Product.findOne({
      productId,
    });

    if (!existingProductDetails) {
      return {
        statusCode: 409,
        message: `Product with Product Id is ${productId} doesn't exist`,
        data: null,
        success: false,
      };
    }

    const setObj = {};
    const setObjWithQuantiy = {};
    const updatingQuery = {};
    for (const [key, val] of Object.entries(presentProductDetailsToUpdate)) {
      if (key === "productQuantity") {
        setObjWithQuantiy.productQuantity = val;
      } else {
        setObj[key] = val;
      }
    }

    if (action && ["add", "sub"].includes(action)) {
      const value = Number(presentProductDetailsToUpdate.productQuantity) || 1;
      setObjWithQuantiy.productQuantity = action === "add" ? value : -value;
    }

    if (Object.keys(setObj).length > 0) {
      updatingQuery.$set = setObj;
    }
    if (Object.keys(setObjWithQuantiy).length > 0) {
      updatingQuery.$inc = setObjWithQuantiy;
    }
    const product = await Product.findOneAndUpdate(
      { productId },
      updatingQuery,
      {
        new: true,
      },
    ).select("-_id -__v -createdAt -updatedAt");

    if (!product) {
      return {
        statusCode: 400,
        message: `Fail to update the Product with ${productId}`,
        data: null,
        success: false,
      };
    }

    return {
      statusCode: 200,
      message: `Product Details Update: ${product?.productName}`,
      data: {
        productName: product?.productName,
        productQuantity: product?.productQuantity,
        productId: product?.productId,
        uiProductId: product?.uiProductId,
        productImg: product?.productImg,
        productDes: product?.productDes,
        sellingPrice: product?.sellingPrice,
        productCategory: product?.productCategory,
        productStatus: product?.productStatus,
        tags: product?.tags,
        productSubDes: product?.productSubDes,
        productSubCategory: product?.productSubCategory,
      },
      success: true,
    };
  } catch (error) {
    return {
      statusCode: 500,
      message: `Error - ${error}`,
      data: null,
      success: false,
    };
  }
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
export {
  createNewProductService,
  viewProductDetailsService,
  existingProductUpdateService,
  adminLoginService,
  totalProductService,
};
