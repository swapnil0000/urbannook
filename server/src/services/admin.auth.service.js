import Admin from "../model/admin.model.js";
import Product from "../model/product.model.js";
import { v7 as uuidv7 } from "uuid";
import { productUpdateFieldMissing } from "../utils/ValidateRes.js";
import { 
  ValidationError, 
  NotFoundError, 
  AuthenticationError,
  ConflictError,
  InternalServerError 
} from "../utils/errors.js";

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
    throw new AuthenticationError("Unauthorized");
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
    if (!val) {
      throw new ValidationError(`Can't create the product — ${key} is missing`);
    }
  }
  
  const createdUiProdNameAndIds = await Product.find(
    {},
    { productName: 1, _id: 0 },
  ).lean();
  
  const productWithSameExist = createdUiProdNameAndIds.filter(
    (el) => el?.productName == productName,
  );

  if (productWithSameExist?.length > 0) {
    throw new ConflictError(`Can't create the product with name — ${productName} already exist`);
  }

  const lastCreatedUiProdId =
    createdUiProdNameAndIds[createdUiProdNameAndIds.length - 1];
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
    throw new AuthenticationError("Unauthorized");
  }
  
  if (!productId) {
    throw new ValidationError("Product ID is missing");
  }
  
  const productDetails = await Product.find({
    productId: productId,
  }).select("-__v -_id");

  if (productDetails?.length == 0 || !productDetails) {
    throw new NotFoundError(`Can't find the product with id — ${productId}`);
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
  if (!adminEmail) {
    throw new AuthenticationError("Unauthorized");
  }
  
  if (!productId) {
    throw new ValidationError("Product Id is required to fetch and update the product details");
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

    throw new ConflictError(`${conflictFields.join(" & ")} already exists`);
  }

  const presentProductDetailsToUpdateValidation = productUpdateFieldMissing(
    presentProductDetailsToUpdate,
  );
  
  if (!presentProductDetailsToUpdateValidation) {
    throw new ValidationError(
      presentProductDetailsToUpdateValidation?.message,
      presentProductDetailsToUpdateValidation?.data
    );
  }

  const existingProductDetails = await Product.findOne({
    productId,
  });

  if (!existingProductDetails) {
    throw new NotFoundError(`Product with Product Id ${productId} doesn't exist`);
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
    throw new InternalServerError(`Fail to update the Product with ${productId}`);
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
};

const adminLoginService = async (email, password) => {
  const res = await Admin.findOne({ email });
  
  if (!res) {
    throw new NotFoundError("User doesn't exist");
  }
  
  //pass check
  const passCheck = (await res.passCheck(password)) ? true : false;

  if (!passCheck) {
    throw new AuthenticationError("Password is wrong");
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
    throw new NotFoundError("No Product in inventory");
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
