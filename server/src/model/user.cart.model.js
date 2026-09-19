import mongoose from "mongoose";

const cartSchema = mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    products: {
      type: Map,
      of: Object,
      default: {},
    },

    // Guest-checkout contact details, captured while typing on the Contact
    // step (before Address, before any order exists) so a guest who never
    // converts still shows up in the admin's abandoned-cart dashboard —
    // field names match what abandoned.cart.model.js / the admin sweep jobs
    // already look for on this same collection (cart.guestName, cart.guestEmail,
    // cart.mobileNumber). Only ever set for guest carts (userId starts with
    // "guest_"); left null/undefined for authenticated carts.
    guestName: {
      type: String,
      default: null,
    },
    guestEmail: {
      type: String,
      default: null,
    },
    mobileNumber: {
      type: String,
      default: null,
    },

    // Seasonal gift-wrap add-on intent (e.g. Rakhi/Diwali) — a boolean flag
    // ONLY. No price lives here; the actual charge is always looked up live
    // from the offers collection (see utils/giftWrapOffer.util.js) at cart
    // read time and again, authoritatively, at checkout — so this flag alone
    // can never be tampered with to change what gets charged.
    giftWrap: {
      type: Boolean,
      default: false,
    },
    // Which note(s) the customer wants inside the gift wrap — multi-select
    // from a fixed 3-option list. ["none"] = wrap only, no note.
    giftWrapNoteOptions: {
      type: [String],
      default: ["none"],
    },

    appliedCoupon: {
      couponCodeId: {
        type: String,
        default: null,
      },
      name: {
        type: String,
        default: null,
      },
      discountValue: {
        type: Number,
        default: 0,
      },
      isApplied: {
        type: Boolean,
        default: false,
      },
      summary: {
        subtotal: { type: Number, default: 0 },
        gst: { type: Number, default: 0 },
        shipping: { type: Number, default: 149 },
        preTotal: { type: Number, default: 0 },
        discount: { type: Number, default: 0 },
        grandTotal: { type: Number, default: 0 },
        note: { type: String, default: "" },
      },
    },
  },
  { timestamps: true },
);

cartSchema.index({ userId: 1 }, { unique: true });

const Cart = mongoose.model("Cart", cartSchema);
export default Cart;
