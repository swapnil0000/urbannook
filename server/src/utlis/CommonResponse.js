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
  lat,
  long,
  city,
  state,
  pinCode,
  formattedAdress,
}) => {
  const missingFields = {};

  if (lat === undefined) missingFields.lat = "lat is required";
  if (long === undefined) missingFields.long = "long is required";
  if (city === undefined) missingFields.city = "city is required";
  if (state === undefined) missingFields.state = "state is required";
  if (pinCode === undefined) missingFields.pinCode = "pinCode is required";
  if (formattedAdress === undefined)
    missingFields.formattedAdress = "formattedAdress is required";

  if (Object.keys(missingFields).length > 0) {
    return {
      statusCode: 400,
      message: `Below fields are missing: ${Object.keys(missingFields).join(", ")}`,
      data: null,
      success: false,
    };
  }

  const latRegex = /^-?(?:90(?:\.0+)?|[0-8]?\d(?:\.\d+)?)$/;
  const longRegex =
    /^-?(?:180(?:\.0+)?|1[0-7]\d(?:\.\d+)?|[0-9]?\d(?:\.\d+)?)$/;
  const cityStateRegex = /^[A-Za-z\s]{2,50}$/;
  const pinCodeRegex = /^[1-9][0-9]{5}$/;
  const formattedAddressRegex = /^[A-Za-z0-9\s,./#-]{5,150}$/;
  // latitude
  if (lat !== undefined) {
    if (typeof lat !== "string") {
      return {
        statusCode: 400,
        message: "Invalid lat type, number required",
        success: false,
      };
    }

    if (!latRegex.test(String(lat))) {
      return {
        statusCode: 400,
        message: "Invalid lat value",
        success: false,
      };
    }
  }

  // longitude
  if (long !== undefined) {
    if (typeof long !== "string") {
      return {
        statusCode: 400,
        message: "Invalid long type, number required",
        success: false,
      };
    }

    if (!longRegex.test(String(long))) {
      return {
        statusCode: 400,
        message: "Invalid long value",
        success: false,
      };
    }
  }

  if (city !== undefined) {
    if (typeof city !== "string") {
      return {
        statusCode: 400,
        message: "Invalid city",
        data: null,
        success: false,
      };
    }

    if (!cityStateRegex.test(city)) {
      return {
        statusCode: 400,
        message: "city contains invalid characters",
        data: null,
        success: false,
      };
    }
  }
  if (state !== undefined) {
    if (typeof state !== "string") {
      return {
        statusCode: 400,
        message: "Invalid state",
        data: null,
        success: false,
      };
    }
    if (!cityStateRegex.test(String(state))) {
      return {
        statusCode: 400,
        message: "Invalid state format",
        success: false,
      };
    }
  }

  if (formattedAdress !== undefined) {
    if (typeof formattedAdress !== "string") {
      return {
        statusCode: 400,
        message: "Invalid formattedAdress",
        data: null,
        success: false,
      };
    }

    if (!formattedAddressRegex.test(formattedAdress)) {
      return {
        statusCode: 400,
        message: "formattedAdress contains invalid characters",
        data: null,
        success: false,
      };
    }
  }
  if (pinCode !== undefined) {
    if (typeof pinCode !== "number") {
      return {
        statusCode: 400,
        message: "Invalid pinCode",
        data: null,
        success: false,
      };
    }
    if (!pinCodeRegex.test(String(pinCode))) {
      return {
        statusCode: 400,
        message: "Invalid pinCode format",
        success: false,
      };
    }
  }
  return {
    statusCode: 200,
    message: "Validation passed",
    data: `Good to go with ${{
      lat,
      long,
      city,
      state,
      pinCode,
      formattedAdress,
    }} `,
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
};
