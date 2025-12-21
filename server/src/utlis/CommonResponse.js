const fieldMissing = ({
  userName,
  userEmail,
  userPassword,
  userMobileNumber,
  userAddress,
  userPinCode,
  action,
}) => {
  let calledController;

  if (action.toLowerCase() == "login")
    calledController = !userEmail || !userPassword;
  if (action.toLowerCase() == "register")
    calledController =
      !userName ||
      !userEmail ||
      !userPassword ||
      !userMobileNumber ||
      !userAddress ||
      !userPinCode;
  if (action.toLowerCase() == "update")
    calledController = !userEmail && !userName && !userAddress && !userPinCode;

  if (calledController) {
    return {
      statusCode: 400,
      message:
        action.toLowerCase() == "update"
          ? `Atleast fill one field is required`
          : "All fields are required",
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

const addToCartDetailsMissing = (userEmail, productName) => {
  if (!userEmail || !productName) {
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

const validateUserInput = ({ userName, userAddress }) => {
  const userNameRegex = /^(?=.*[A-Z])(?=.*[@!#$%^&*])[A-Za-z0-9@!#$%^&*]{1,7}$/;
  const userAddressRegex = /^[A-Za-z0-9\s,./#-]{5,100}$/;
  if (userName && !userNameRegex.test(userName)) {
    return {
      statusCode: 400,
      message:
        "Username must be max 7 characters, contain at least 1 capital letter and 1 special symbol",
      data: null,
      success: false,
    };
  }

  if (userAddress && !userAddressRegex.test(userAddress)) {
    return {
      statusCode: 400,
      message: "Address contains invalid characters or length is not valid",
      data: null,
      success: false,
    };
  }

  return {
    statusCode: 200,
    message: "Address and Username - Good to go",
    data: [],
    success: true,
  };
};

export {
  fieldMissing,
  validateUserInput,
  finalProductName,
  addToCartDetailsMissing,
  productUpdateFieldMissing,
};
