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

const productUpdateFieldMissing = (presentProductDetailsToUpdate) => {
  const productFieldsBasicCheck = {
    productName: !presentProductDetailsToUpdate?.productName
      ? null
      : presentProductDetailsToUpdate?.productName?.length > 0
        ? presentProductDetailsToUpdate?.productName
        : "",
    uiProductId: !presentProductDetailsToUpdate?.uiProductId
      ? null
      : presentProductDetailsToUpdate?.uiProductId?.length > 0
        ? presentProductDetailsToUpdate?.uiProductId
        : "",
    productImg: !presentProductDetailsToUpdate?.productImg
      ? null
      : presentProductDetailsToUpdate?.productImg > 0
        ? presentProductDetailsToUpdate?.productImg
        : "",
    productDes: !presentProductDetailsToUpdate?.productDes
      ? null
      : presentProductDetailsToUpdate?.productDes?.length > 0
        ? presentProductDetailsToUpdate?.productDes
        : "",
    sellingPrice: !presentProductDetailsToUpdate?.sellingPrice
      ? null
      : presentProductDetailsToUpdate?.sellingPrice >= 10
        ? presentProductDetailsToUpdate?.sellingPrice
        : 0,
    productCategory: !presentProductDetailsToUpdate?.productCategory
      ? null
      : presentProductDetailsToUpdate?.productCategory?.length > 0
        ? presentProductDetailsToUpdate?.productCategory
        : "",
    productQuantity: !presentProductDetailsToUpdate?.productName
      ? null
      : presentProductDetailsToUpdate?.productName > 0
        ? presentProductDetailsToUpdate?.productName
        : 0,
    productStatus: !presentProductDetailsToUpdate?.productName
      ? null
      : presentProductDetailsToUpdate?.productName?.length > 0
        ? presentProductDetailsToUpdate?.productName
        : "",
    productSubDes: !presentProductDetailsToUpdate?.productName
      ? null
      : presentProductDetailsToUpdate?.productName?.length > 0
        ? presentProductDetailsToUpdate?.productName
        : "",
    productSubCategory: !presentProductDetailsToUpdate?.productName
      ? null
      : presentProductDetailsToUpdate?.productName?.length > 0
        ? presentProductDetailsToUpdate?.productName
        : "",
  };
  if (
    presentProductDetailsToUpdate?.productName &&
    productFieldsBasicCheck?.productName == ""
  ) {
    return {
      statusCode: 404,
      message: `${presentProductDetailsToUpdate?.productName} is missing`,
      data: [],
      success: true,
    };
  }

  if (
    presentProductDetailsToUpdate?.uiProductId &&
    productFieldsBasicCheck?.uiProductId == ""
  ) {
    return {
      statusCode: 404,
      message: `${presentProductDetailsToUpdate?.uiProductId} is missing`,
      data: [],
      success: true,
    };
  }

  if (
    presentProductDetailsToUpdate?.productImg &&
    productFieldsBasicCheck?.productImg == ""
  ) {
    return {
      statusCode: 404,
      message: `${presentProductDetailsToUpdate?.productImg} is missing`,
      data: [],
      success: true,
    };
  }

  if (
    presentProductDetailsToUpdate?.productDes &&
    productFieldsBasicCheck?.productDes == ""
  ) {
    return {
      statusCode: 404,
      message: `${presentProductDetailsToUpdate?.productDes} is missing`,
      data: [],
      success: true,
    };
  }

  if (
    presentProductDetailsToUpdate?.sellingPrice &&
    productFieldsBasicCheck?.sellingPrice == 0
  ) {
    return {
      statusCode: 404,
      message: `${presentProductDetailsToUpdate?.sellingPrice} is missing`,
      data: [],
      success: true,
    };
  }

  if (
    presentProductDetailsToUpdate?.productCategory &&
    productFieldsBasicCheck?.productCategory == null
  ) {
    return {
      statusCode: 404,
      message: `${presentProductDetailsToUpdate?.productCategory} is missing`,
      data: [],
      success: true,
    };
  }

  if (
    presentProductDetailsToUpdate?.productQuantity &&
    productFieldsBasicCheck?.productQuantity == 0
  ) {
    return {
      statusCode: 404,
      message: `${presentProductDetailsToUpdate?.productQuantity} is missing`,
      data: [],
      success: true,
    };
  }

  if (
    presentProductDetailsToUpdate?.productStatus &&
    productFieldsBasicCheck?.productStatus == ""
  ) {
    return {
      statusCode: 404,
      message: `${presentProductDetailsToUpdate?.productStatus} is missing`,
      data: [],
      success: true,
    };
  }

  if (
    presentProductDetailsToUpdate?.productSubDes &&
    productFieldsBasicCheck?.productSubDes == ""
  ) {
    return {
      statusCode: 404,
      message: `${presentProductDetailsToUpdate?.productSubDes} is missing`,
      data: [],
      success: true,
    };
  }

  if (
    presentProductDetailsToUpdate?.productSubCategory &&
    productFieldsBasicCheck?.productSubCategory == null
  ) {
    return {
      statusCode: 404,
      message: `${presentProductDetailsToUpdate?.productSubCategory} is missing`,
      data: [],
      success: true,
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

const validateUpdateUserAddress = ({
  lat,
  long,
  city,
  state,
  pinCode,
  formattedAddress,
  addressId,
  placeId,
}) => {
  const missing = [];

  if (!addressId) missing.push("addressId");
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

export {
  fieldMissing,
  validateUserInput,
  finalProductName,
  cartDetailsMissing,
  productUpdateFieldMissing,
  validateUpdateUserAddress,
};
