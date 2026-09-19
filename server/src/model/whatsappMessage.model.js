import mongoose from "mongoose";

/* Messages are kept for six months. Customers reply to order updates with
   real questions, and those are worth having history on — but not forever,
   and this collection would otherwise grow without limit. */
const RETENTION_DAYS = 180;

/**
 * Every inbound WhatsApp message, stored so someone can actually read them.
 *
 * Once a number moves to the WhatsApp Business API it can no longer be opened
 * in the WhatsApp or WhatsApp Business app — Meta does not allow both. So the
 * webhook is the only place these messages exist, and without this they were
 * being read for a login code and then discarded, including the ones where a
 * customer was asking a question.
 */
const whatsappMessageSchema = mongoose.Schema(
  {
    // 10 digit, normalized the same way as User.mobileNumber so the two join
    mobileNumber: {
      type: Number,
      required: [true, "mobileNumber is required"],
    },
    // Raw sender string as the provider sent it, e.g. "919876543210"
    rawFrom: {
      type: String,
      default: null,
    },
    text: {
      type: String,
      default: "",
    },
    /**
     * What the login handler made of it:
     *   LOGIN_VERIFIED — carried a valid code and signed someone in
     *   LOGIN_FAILED   — looked like a code but did not match anything live
     *   CUSTOMER       — no code at all, so almost certainly a real question
     */
    kind: {
      type: String,
      enum: ["LOGIN_VERIFIED", "LOGIN_FAILED", "CUSTOMER"],
      default: "CUSTOMER",
    },
    // Set once someone has dealt with it, so an inbox can hide handled items
    handledAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + RETENTION_DAYS * 24 * 60 * 60 * 1000),
    },
  },
  { timestamps: true },
);

whatsappMessageSchema.index({ createdAt: -1 });
whatsappMessageSchema.index({ kind: 1, handledAt: 1, createdAt: -1 });
whatsappMessageSchema.index({ mobileNumber: 1, createdAt: -1 });
whatsappMessageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const WhatsAppMessage = mongoose.model(
  "WhatsAppMessage",
  whatsappMessageSchema,
);

export default WhatsAppMessage;
