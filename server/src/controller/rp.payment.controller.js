import {
  razorpayCreateOrderService,
  razorpayPaymentVerificationService,
} from "../services/rp.payement.service.js";
import ApiError from "../utlis/ApiError.js";
import ApiRes from "../utlis/ApiRes.js";
import dotenv from "dotenv";
import User from "../model/user.model.js";
dotenv.config({
  path: "./.env",
});
const razorpayKeyGetController = async (_, res) => {
  if (!process.env.RP_LOCAL_TEST_KEY_ID)
    return res.status(404).json(new ApiError(404, `Rp - Key`, null, false));
  return res
    .status(200)
    .json(new ApiRes(200, `Rp - Key`, process.env.RP_LOCAL_TEST_KEY_ID, true));
};

const razorpayCreateOrderController = async (req, res) => {
  const { amount, currency } = req.body;
  const razorpayInstance = await razorpayCreateOrderService(amount, currency);
  return res
    .status(200)
    .json(
      new ApiRes(200, `Order Created Details`, razorpayInstance?.data, true)
    );
};

const razorpayPaymentVerificationController = async (req, res) => {
  try {
    const { userEmail } = req.user;

    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } =
      req.body;
    const isPaymentVerifiedOrNot = razorpayPaymentVerificationService(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );
    if (!isPaymentVerifiedOrNot) {
      return res
        .status(Number(isPaymentVerifiedOrNot?.statusCode))
        .json(
          new ApiError(
            Number(isPaymentVerifiedOrNot?.statusCode),
            isPaymentVerifiedOrNot?.message,
            isPaymentVerifiedOrNot?.data,
            isPaymentVerifiedOrNot?.success
          )
        );
    }
    // saving data in db - User
    const user = await User.findOne({ userEmail }).populate(
      "addedToCart.productId"
    );
    if (!user || user.addedToCart.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }
    const newOrders = user.addedToCart.map((item) => ({
      orderId: "ORD" + Date.now(),
      productId: item.productId._id,
      quantity: item.quantity,
      paymentDetails: {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      },
    }));

    await User.updateOne(
      { userEmail },
      {
        $push: { userPreviousOrder: { $each: newOrders } },
        $set: { addedToCart: [] },
      }
    );

    return res.status(Number(isPaymentVerifiedOrNot?.statusCode)).json(
      new ApiRes(
        Number(isPaymentVerifiedOrNot?.statusCode),
        "Payment successful and order saved",
        {
          newOrders,
          redirectUrl: `http://localhost:5173/paymentsuccess?reference=${razorpay_payment_id}`,
        },
        isPaymentVerifiedOrNot?.success
      )
    );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Internal Server Error - ${error}`, [], false));
  }
};

export {
  razorpayCreateOrderController,
  razorpayPaymentVerificationController,
  razorpayKeyGetController,
};
