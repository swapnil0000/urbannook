import mongoose from "mongoose";

/* ===============================================================
   WHATSAPP LOGIN TOKEN
   ---------------------------------------------------------------
   Short-lived login session ka state. Redis ki jagah Mongo TTL
   index use kar rahe hain — wahi pattern jo otp.model.js me hai,
   isliye koi naya infra deploy nahi karna padta.

   Lifecycle:
     PENDING   -> token bana, user ne abhi WhatsApp pe bheja nahi
     VERIFIED  -> inbound webhook pe phone verify ho gaya
     (deleted) -> frontend ne status poll karke consume kar liya,
                  ya TTL expire ho gaya

   JWT yahan store NAHI hota — sirf userId rakhte hain aur token
   consume hote waqt fresh access/refresh mint karte hain.
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
    // Verify hone ke baad hi bharte hain — 10-digit normalized
    mobileNumber: {
      type: Number,
      default: null,
    },
    userId: {
      type: String,
      default: null,
    },
    // Kis IP ne token manga — abuse trace karne ke liye
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

// TTL index — Mongo expire hote hi document khud delete kar dega
whatsappLoginTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const WhatsAppLoginToken = mongoose.model(
  "WhatsAppLoginToken",
  whatsappLoginTokenSchema,
);

export default WhatsAppLoginToken;
