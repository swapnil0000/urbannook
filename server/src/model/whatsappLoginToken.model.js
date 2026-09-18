import mongoose from "mongoose";

/* ===============================================================
   WHATSAPP LOGIN TOKEN
   ---------------------------------------------------------------
   State of a short-lived login session. Uses a Mongo TTL index rather
   than Redis — the same pattern as otp.model.js — so no new infra has
   to be deployed.

   Lifecycle:
     PENDING   -> code issued, user has not sent it on WhatsApp yet
     VERIFIED  -> the inbound webhook confirmed the phone number
     (deleted) -> the frontend consumed it while polling, or the TTL
                  expired

   No JWT is stored here. Only the userId is kept, and fresh access and
   refresh tokens are minted when the code is consumed.
================================================================ */

const whatsappLoginTokenSchema = mongoose.Schema(
  {
    token: {
      type: String,
      required: [true, "Token is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "VERIFIED"],
      default: "PENDING",
    },
    // Filled in only after verification — normalized to 10 digits
    mobileNumber: {
      type: Number,
      default: null,
    },
    userId: {
      type: String,
      default: null,
    },
    // Which IP asked for the code — useful for tracing abuse
    requestIp: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: [true, "Expiration time is required"],
    },
  },
  {
    timestamps: true,
  },
);

// TTL index — Mongo deletes the document once it expires
whatsappLoginTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const WhatsAppLoginToken = mongoose.model(
  "WhatsAppLoginToken",
  whatsappLoginTokenSchema,
);

export default WhatsAppLoginToken;
