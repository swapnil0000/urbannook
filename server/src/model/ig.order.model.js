import mongoose from "mongoose";

const igOrderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true },
    customerName: { type: String, default: "" },
    customerEmail: { type: String, default: null },
    customerMobile: { type: String, default: null },
    productName: { type: String, default: "" },
    productImg: { type: String, default: "" },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["CREATED", "PENDING", "PAID"],
      default: "CREATED",
    },
    notes: { type: String, default: "" },
    paymentLinkId: { type: String, default: null },
    paymentLinkShortUrl: { type: String, default: null },
    customerInstaId: { type: String, default: null },
    shippingAddress: { type: String, default: null },
    shippingCity: { type: String, default: null },
    shippingState: { type: String, default: null },
    shippingPinCode: { type: String, default: null },
    payment: {
      razorpayOrderId: { type: String, default: null },
      razorpayPaymentId: { type: String, default: null },
    },
    items: { type: Array, default: [] },
  },
  { timestamps: true }
);

igOrderSchema.index({ "payment.razorpayOrderId": 1 });
igOrderSchema.index({ status: 1 });
igOrderSchema.index({ createdAt: -1 });

const IgOrder = mongoose.model("IgOrder", igOrderSchema, "instagramorders");
export default IgOrder;
