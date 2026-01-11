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
  if (action.toLowerCase() == "login") {
    calledController = { userEmail, userPassword };
  }
  if (action.toLowerCase() == "register") {
    calledController = { userName, userEmail, userPassword, userMobileNumber };
  }
  if (action.toLowerCase() == "update") {
    calledController = {
      userName,
      userEmail,
      userAddress,
      userPinCode,
    };
  }
  for (let [key, val] of Object.entries(calledController)) {
    if (!val) {
      console.log(key);
      return {
        statusCode: 400,
        message: `${key} field is required`,
        data: [],
        success: false,
      };
    }
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

const cartDetailsMissing = (mongooseProductId) => {
  if (!mongooseProductId) {
    return {
      statusCode: 400,
      message: "mongooseProductId is required for adding to cart",
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

const validateUserInput = ({ userName, userAddress, userPinCode }) => {
  const fullNameRegex = /^[A-Za-z]+(?:\s[A-Za-z]+)*$/;
  const userAddressRegex = /^[A-Za-z0-9\s,./#-]{5,100}$/;
  const pinCodeRegex = /^[1-9][0-9]{5}$/;

  if (userName !== undefined) {
    if (typeof userName !== "string") {
      return {
        statusCode: 400,
        message: "Full name must be a string",
        data: null,
        success: false,
      };
    }

    const trimmedName = userName.trim();

    if (!trimmedName) {
      return {
        statusCode: 400,
        message: "Full name cannot be empty",
        data: null,
        success: false,
      };
    }

    if (trimmedName.length < 3 || trimmedName.length > 50) {
      return {
        statusCode: 400,
        message: "Full name must be between 3 and 50 characters",
        data: null,
        success: false,
      };
    }

    if (!fullNameRegex.test(trimmedName)) {
      return {
        statusCode: 400,
        message:
          "Full name can contain only alphabets and single spaces between words",
        data: null,
        success: false,
      };
    }
  }

  if (userAddress !== undefined) {
    if (typeof userAddress !== "string" || !userAddress.trim()) {
      return {
        statusCode: 400,
        message: "Invalid address",
        data: null,
        success: false,
      };
    }

    if (!userAddressRegex.test(userAddress)) {
      return {
        statusCode: 400,
        message: "Address contains invalid characters",
        data: null,
        success: false,
      };
    }
  }

  if (userPinCode !== undefined) {
    if (!pinCodeRegex.test(String(userPinCode))) {
      return {
        statusCode: 400,
        message: "Pin code must be exactly 6 digits and cannot start with 0",
        data: null,
        success: false,
      };
    }
  }

  return {
    statusCode: 200,
    message: "Validation passed",
    data: `Good to go with ${userName}, ${userAddress}, ${userPinCode}`,
    success: true,
  };
};

export {
  fieldMissing,
  validateUserInput,
  finalProductName,
  cartDetailsMissing,
  productUpdateFieldMissing,
};
