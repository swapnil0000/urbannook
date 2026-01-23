const fieldMissing = ({ name, email, password, mobileNumber, action }) => {
  let calledController;
  if (action.toLowerCase() == "login") {
    calledController = { email, password };
  }
  if (action.toLowerCase() == "register") {
    calledController = { name, email, password, mobileNumber };
  }
  if (action.toLowerCase() == "update") {
    calledController = {
      name,
      email,
    };
  }
  for (let [key, val] of Object.entries(calledController)) {
    if (!val) {
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
  productStatus,
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

const cartDetailsMissing = (userId, productId) => {
  if (!userId) {
    return { statusCode: 401, message: "Unauthorized", success: false };
  }
  if (userId && !productId) {
    return {
      statusCode: 400,
      message: "productId is required for adding to cart",
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

const validateUserInput = ({ email, name, mobileNumber }) => {
  const fullNameRegex = /^[A-Za-z]+(?:\s[A-Za-z]+)*$/;
  const mobileRegex = /^[6-9]\d{9}$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  if (name !== undefined) {
    if (typeof name !== "string") {
      return {
        statusCode: 400,
        message: "Full name must be a string",
        data: null,
        success: false,
      };
    }

    const trimmedName = name.trim();

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
          "Full name can contain only alphabets and spaces between words",
        data: null,
        success: false,
      };
    }
  }

  if (mobileNumber !== undefined) {
    if (typeof mobileNumber !== "number") {
      return {
        statusCode: 400,
        message: "Invalid mobileNumber",
        data: null,
        success: false,
      };
    }

    if (!mobileRegex.test(mobileNumber)) {
      return {
        statusCode: 400,
        message: "mobileRegex contains invalid characters",
        data: null,
        success: false,
      };
    }
  }
  if (email !== undefined) {
    if (!emailRegex.test(String(email))) {
      return {
        statusCode: 400,
        message: "Invalid email format",
        success: false,
      };
    }
  }

  return {
    statusCode: 200,
    message: "Validation passed",
    data: `Good to go with ${name}, ${mobileNumber}`,
    success: true,
  };
};

const validateUserAddress = ({
  placeId,
  lat,
  long,
  formattedAddress,
  city,
  state,
  pinCode,
}) => {
  const missing = [];

  if (!placeId) missing.push("placeId");
  if (lat === undefined) missing.push("lat");
  if (long === undefined) missing.push("long");
  if (!formattedAddress) missing.push("formattedAddress");

  if (missing.length) {
    return {
      success: false,
      statusCode: 400,
      message: `Missing fields: ${missing.join(", ")}`,
    };
  }

  // lat / long sanity check
  if (typeof lat !== "number" || lat < -90 || lat > 90) {
    return {
      success: false,
      statusCode: 400,
      message: "Invalid latitude",
    };
  }

  if (typeof long !== "number" || long < -180 || long > 180) {
    return {
      success: false,
      statusCode: 400,
      message: "Invalid longitude",
    };
  }

  // formatted address
  if (
    typeof formattedAddress !== "string" ||
    formattedAddress.length < 5 ||
    formattedAddress.length > 200
  ) {
    return {
      success: false,
      statusCode: 400,
      message: "Invalid formattedAddress",
    };
  }

  if (city && typeof city !== "string") {
    return {
      success: false,
      statusCode: 400,
      message: "Invalid city",
    };
  }

  if (state && typeof state !== "string") {
    return {
      success: false,
      statusCode: 400,
      message: "Invalid state",
    };
  }

  if (pinCode && (!Number.isInteger(pinCode) || String(pinCode).length !== 6)) {
    return {
      success: false,
      statusCode: 400,
      message: "Invalid pinCode",
    };
  }

  return {
    success: true,
  };
};

const validateUpdateUserAddress = ({
  addressId,
  lat,
  long,
  city,
  state,
  pinCode,
  formattedAdress,
}) => {
  const missing = [];

  if (!addressId) missing.push("addressId");
  if (!placeId) missing.push("placeId");
  if (lat === undefined) missing.push("lat");
  if (long === undefined) missing.push("long");
  if (!formattedAdress) missing.push("formattedAdress");

  if (missing.length) {
    return {
      success: false,
      statusCode: 400,
      message: `Missing fields: ${missing.join(", ")}`,
    };
  }

  // lat / long sanity check
  if (typeof lat !== "number" || lat < -90 || lat > 90) {
    return {
      success: false,
      statusCode: 400,
      message: "Invalid latitude",
    };
  }

  if (typeof long !== "number" || long < -180 || long > 180) {
    return {
      success: false,
      statusCode: 400,
      message: "Invalid longitude",
    };
  }

  // formatted address
  if (
    typeof formattedAdress !== "string" ||
    formattedAdress.length < 5 ||
    formattedAdress.length > 200
  ) {
    return {
      success: false,
      statusCode: 400,
      message: "Invalid formattedAdress",
    };
  }

  if (city && typeof city !== "string") {
    return {
      success: false,
      statusCode: 400,
      message: "Invalid city",
    };
  }

  if (state && typeof state !== "string") {
    return {
      success: false,
      statusCode: 400,
      message: "Invalid state",
    };
  }

  if (pinCode && (!Number.isInteger(pinCode) || String(pinCode).length !== 6)) {
    return {
      success: false,
      statusCode: 400,
      message: "Invalid pinCode",
    };
  }

  return {
    success: true,
  };
};

export {
  fieldMissing,
  validateUserInput,
  finalProductName,
  cartDetailsMissing,
  productUpdateFieldMissing,
  validateUserAddress,
  validateUpdateUserAddress,
};
