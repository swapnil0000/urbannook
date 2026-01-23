import User from "../model/user.model.js";
import { fieldMissing } from "../utlis/ValidateRes.js";
import { v7 as uuid7 } from "uuid";

const loginService = async (email, password) => {
  //fieldMissing
  let missing = fieldMissing({
    email,
    password,
    action: "login",
  });

  if (!missing?.success) {
    return {
      statusCode: Number(missing?.statusCode),
      message: missing?.message,
      data: missing?.data || null,
      success: missing?.success,
    };
  }
  const res = await User.findOne({ email: email.toLowerCase() });

  if (!res) {
    return {
      statusCode: 404,
      message: `User - ${email} doesn't exist`,
      data: null,
      success: false,
    };
  }
  //pass check
  const passCheck = (await res.passCheck(password)) ? true : false;
  if (!passCheck) {
    return {
      statusCode: 401,
      message: "Current Password is wronng",
      data: null,
      success: false,
    };
  }

  const userRefreshToken = await res?.genRefreshToken();
  const userAccessToken = await res?.genAccessToken();

  res.userRefreshToken = userRefreshToken;
  res.save();
  return {
    statusCode: 200,
    message: "user details",
    data: {
      name: res?.name,
      email: res?.email,
      mobileNumber: res?.mobileNumber,
      userAddress: res?.userAddress,
      userPinCode: res?.userPinCode,
      addedToCart: res?.addedToCart,
      role: res?.role,
      userRefreshToken,
      userAccessToken,
    },
    success: true,
  };
};

const registerService = async (name, email, password, mobileNumber) => {
  let missing = fieldMissing({
    name,
    email,
    password,
    mobileNumber,
    action: "register",
  });

  if (!missing?.success) {
    return {
      statusCode: Number(missing?.statusCode),
      message: missing?.message,
      data: missing?.data || null,
      success: missing?.success,
    };
  }
  const reservedNames = [
    "admin",
    "root",
    "support",
    "system",
    "owner",
    "urbannook",
    "superuser",
  ];

  if (reservedNames.includes(name.toLowerCase())) {
    return {
      statusCode: 403,
      message: `Oops 😅 ${name} is a VIP name reserved for the system. Please pick something uniquely *you* — we promise we won't steal it 😉`,
      data: { email, name } || null,
      success: false,
    };
  }
  const fullNameRegex = /^[A-Za-z]+(?:\s+[A-Za-z]+)*$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,15}$/;
  const mobileRegex = /^[6-9]\d{9}$/;

  if (!fullNameRegex.test(name.trim())) {
    return {
      statusCode: 400,
      message: "Full name must contain only alphabets and single spaces ",
      success: false,
    };
  }

  if (!emailRegex.test(email.trim())) {
    return {
      statusCode: 400,
      message: "Invalid email format",
      success: false,
    };
  }

  if (!passwordRegex.test(password)) {
    return {
      statusCode: 400,
      message:
        "Password must be at least 8 characters with uppercase, lowercase, number & special character",
      success: false,
    };
  }

  if (!mobileRegex.test(Number(mobileNumber))) {
    return {
      statusCode: 400,
      message: "Invalid mobile number (must be 10 digits, start with 6–9)",
      success: false,
    };
  }

  const res = await User.findOne({
    $or: [{ mobileNumber }, { email: email.toLowerCase() }],
  });

  if (res) {
    let matchedValue;
    if (res?.email == email) matchedValue = email;
    else if (res?.mobileNumber == mobileNumber) matchedValue = mobileNumber;

    return {
      statusCode: 409,
      message: `User Already exist with - ${matchedValue}`,
      data: `${matchedValue}`,
      success: false,
    };
  }
  const userId = uuid7();
  const newRegisteringUser = await User.create({
    name: name.toLowerCase(),
    email: email.toLowerCase(),
    password,
    mobileNumber,
    userId,
  });
  // when user registers - for first time we are generating token so we can move them directly to home page
  const userAccessToken = newRegisteringUser.genAccessToken();
  const userRefreshToken = newRegisteringUser.genRefreshToken();
  newRegisteringUser.userRefreshToken = userRefreshToken;
  if (!newRegisteringUser)
    return {
      statusCode: 400,
      message: `Failed to create user with ${email}`,
      data: email,
      success: false,
    };
  newRegisteringUser.save({ validateBeforeSave: false }).catch((err) => {
    console.error("Refresh token save failed:", err);
  });

  return {
    statusCode: 200,
    message: `Created user with - ${email}`,
    data: {
      user: {
        id: newRegisteringUser.userId,
        email: newRegisteringUser.email,
      },
      userAccessToken,
    },
    success: true,
  };
};

export { loginService, registerService };
