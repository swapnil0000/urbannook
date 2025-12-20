import User from "../model/user.model.js";
const loginService = async (userEmail, userPassword) => {
  const res = await User.findOne({ userEmail });
  if (!res) {
    return {
      statusCode: 404,
      message: "User doesn't exist",
      data: null,
      success: false,
    };
  }

  //pass check
  const passCheck = (await res.passCheck(userPassword)) ? true : false;

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
      userEmail: res?.userEmail,
      userMobileNumber: res?.userMobileNumber,
      userPreviousOrder: res?.userPreviousOrder,
      role: res?.role,
      accessToken,
    },
    success: true,
  };
};

const registerService = async (userEmail, userMobileNumber) => {
  const res = await User.findOne({
    $or: [{ userMobileNumber }, { userEmail }],
  });

  // check for pre-exist
  if (res) {
    return {
      statusCode: 409,
      message: "User Already exist",
      data: userEmail,
      success: false,
    };
  }
};

const addToCart = async (userEmail, productName, productQuanity) => {
  console.log(userEmail, productName, productQuanity);

  const quantityToAdd = productQuanity || 1;

  const updatedUser = await User.findOneAndUpdate(
    { userEmail },
    {
      $inc: { [`addedToCart.${productName}`]: quantityToAdd },
    },
    { new: true }
  ).select("-userPassword -userRefreshToken -__v -_id -createdAt");

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
