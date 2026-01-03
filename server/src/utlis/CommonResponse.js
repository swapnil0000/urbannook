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

const cartDetailsMissing = (userEmail, productName) => {
  if (!userEmail || !productName) {
    return {
      statusCode: 400,
      message:
        "All fields (userEmail and productName) are required for adding to cart",
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
  let missing = fieldMissing({
    userName,
    userAddress,
    userPinCode,
    action: "Update",
  });
  if (!missing?.success) {
    return {
      statusCode: Number(missing?.statusCode),
      message: missing?.message,
      data: missing?.data || null,
      success: missing?.success,
    };
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const userNameRegex = /^(?=.*[A-Z])(?=.*[@!#$%^&*])[A-Za-z0-9@!#$%^&*]{1,7}$/;
  const userAddressRegex = /^[A-Za-z0-9\s,./#-]{5,100}$/;
  if (!emailRegex.test(userEmail)) {
    return {
      statusCode: 400,
      message: "Invalid email format",
      data: null,
      success: false,
    };
  }

  if (userName === undefined || userName === null) {
    return {
      statusCode: 400,
      message: "Username is required",
      data: null,
      success: false,
    };
  }

  if (typeof userName !== "string") {
    return {
      statusCode: 400,
      message: "Username must be a string",
      data: null,
      success: false,
    };
  }

  if (!userName.trim()) {
    return {
      statusCode: 400,
      message: "Username cannot be empty",
      data: null,
      success: false,
    };
  }

  if (userName.length > 7) {
    return {
      statusCode: 400,
      message: "Username must not exceed 7 characters",
      data: null,
      success: false,
    };
  }

  if (!userNameRegex.test(userName)) {
    return {
      statusCode: 400,
      message:
        "Username must contain at least 1 capital letter and 1 special symbol",
      data: null,
      success: false,
    };
  }

  if (userAddress === undefined || userAddress === null) {
    return {
      statusCode: 400,
      message: "Address is required",
      data: null,
      success: false,
    };
  }

  if (typeof userAddress !== "string") {
    return {
      statusCode: 400,
      message: "Address must be a string",
      data: null,
      success: false,
    };
  }

  if (!userAddress.trim()) {
    return {
      statusCode: 400,
      message: "Address cannot be empty",
      data: null,
      success: false,
    };
  }

  if (userAddress.length < 5 || userAddress.length > 100) {
    return {
      statusCode: 400,
      message: "Address length must be between 5 and 100 characters",
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
  cartDetailsMissing,
  productUpdateFieldMissing,
};
