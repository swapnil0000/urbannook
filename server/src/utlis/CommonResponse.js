const fieldMissing = (email, password, mobileNumber, action) => {
  let calledController;
  action == "login";
  action == "login"
    ? (calledController = !email || !password)
    : (calledController = !email || !password || !mobileNumber);
  if (calledController) {
    return {
      statusCode: 400,
      message: "All fields are required",
      data: [],
      success: false,
    };
  }
  return {
    statusCode: 200,
    message: "All fields are present",
    data: [],
    success: true,
  };
};

const productUpdateFieldMissing = (
  productName,
  sellingPrice,
  productCategory,
  productStatus
) => {
  if (!productName || !sellingPrice || !productCategory || !productStatus) {
    return {
      statusCode: 400,
      message: "All fields are required",
      data: [],
      success: false,
    };
  }
  return {
    statusCode: 200,
    message: "All fields are present",
    data: [],
    success: true,
  };
};

const addToCartDetailsMissing = (email, productName) => {
  if (!email || !productName) {
    return {
      statusCode: 400,
      message: "All fields are required for adding to cart",
      data: [],
      success: false,
    };
  }
  return {
    statusCode: 200,
    message: "All fields are present",
    data: [],
    success: true,
  };
};

const finalProductName = (productName) => {
  // remove space b/w two words and replace it with _
  return productName.replace(/\s+/g, "_").toUpperCase();
};

export {
  fieldMissing,
  finalProductName,
  addToCartDetailsMissing,
  productUpdateFieldMissing,
};
