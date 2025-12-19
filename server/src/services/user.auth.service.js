import User from "../model/user.model.js";
const loginService = async (email, password) => {
  const res = await User.findOne({ email });

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
      message: "Password is wronng",
      data: email,
      success: false,
    };
  }
  const accessToken = await res.genAccessToken();
  res.userRefreshToken = accessToken;
  await res.save();
  return {
    statusCode: 200,
    message: "user details",
    data: {
      email: res?.email,
      mobileNumber: res?.mobileNumber,
      previousOrder: res?.previousOrder,
      role: res?.role,
      accessToken,
    },
    success: true,
  };
};

const registerService = async (email, mobileNumber) => {
  const res = await User.findOne({ $or: [{ mobileNumber }, { email }] });

  // check for pre-exist
  if (res) {
    return {
      statusCode: 409,
      message: "User Already exist",
      data: email,
      success: false,
    };
  }
};

const addToCart = async (email, productName, productQuanity) => {
  console.log(email, productName, productQuanity);

  const quantityToAdd = productQuanity || 1;

  const updatedUser = await User.findOneAndUpdate(
    { email },
    {
      $inc: { [`addedToCart.${productName}`]: quantityToAdd },
    },
    { new: true }
  ).select("-password -userRefreshToken -__v -_id -createdAt");

  if (!updatedUser) {
    return {
      statusCode: 400,
      message: "Failed to add to cart",
      data: [],
      success: false,
    };
  }

  return {
    statusCode: 200,
    message: `Added to cart: ${productName}`,
    data: {
      productName,
      productQuanityAdded: quantityToAdd,
    },
    success: true,
  };
};

export { loginService, registerService, addToCart };
