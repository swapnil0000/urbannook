import mongoose from "mongoose";

const igOrderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true },
    customerName: { type: String, default: "Pending" },
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
    payment: {
      razorpayOrderId: { type: String, default: null },
      razorpayPaymentId: { type: String, default: null },
    },
    items: { type: Array, default: [] },
  },
  { timestamps: true }
);

igOrderSchema.index({ "payment.razorpayOrderId": 1 });

const IgOrder = mongoose.model("IgOrder", igOrderSchema, "instagramorders");
export default IgOrder;
