import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    userEmail: { type: String, required: true },
    userId: { type: String, required: true },
    userName: { type: String },
    userMobile: { type: String },

    orderId: { type: String, required: true },
    items: [
      {
        _id: false,
        productId: { type: String, required: true },


        /* Saving this because the price could be changed when the user is viewing the history */
        productSnapshot: {
          productName: { type: String, required: true },
          productImg: { type: String, required: true },
          quantity: { type: Number, required: true, min: 1 },
          productCategory: String,
          productSubCategory: String,
          priceAtPurchase: { type: Number, required: true },
          shipping: String,
          selectedVariant: { type: String, default: "N/A" },
          // Snapshotted at purchase time so a later admin edit to the
          // product's template can't retroactively change how a past order
          // reads. Blank = order predates this field, or product never set one.
          variantTitleTemplate: { type: String, default: "" },
          // Stable identifier for the exact variant purchased — set at order
          // time and never changed afterward, unlike selectedVariant (a display
          // name an admin can rename later). Blank = order predates this field.
          variantSku: { type: String, default: "" },
          // Promotion Engine V2 — true for a synthetic ₹0 line added by a
          // free_product reward (see rp.payment.controller.js), so
          // admin/order views can tell a granted-free item apart from a
          // paid one at a glance. Absent/false for every pre-existing order.
          isPromotionalGift: { type: Boolean, default: false },
          // Explicit item identity: a free gift the customer CLAIMED vs a product they PAID for (the same
          // SKU can be both, on separate lines). `originalUnitPrice` is the list price at purchase so
          // discounts / free gifts can be audited and refunded correctly; `giftPromotionId` +
          // `giftEntitlementKey` tie a gift to the promotion entitlement that granted it.
          lineType: { type: String, enum: ["PAID", "FREE_GIFT"], default: "PAID" },
          originalUnitPrice: { type: Number },
          giftPromotionId: { type: String },
          giftEntitlementKey: { type: String },
        },
      },
    ],
    // Promotion Engine V2 — which V2 promotions (if any) applied to this
    // order, snapshotted at creation time so support/admin can see exactly
    // what fired without recomputing the engine against since-changed
    // promotion config. Empty array for every order that predates this or
    // that only used the legacy offers/cart_rule system.
    // Free products granted by promotions (the exact product id + SKU to pack and ship), so
    // fulfilment does not have to infer them from the ₹0 lines. Empty when none.
    promotionalGifts: {
      type: [
        {
          _id: false,
          productId: String,
          variantSku: { type: String, default: "" },
          productName: String,
          selectedVariant: String,
          quantity: { type: Number, default: 1 },
          promotionId: String,
          promotionName: String,
        },
      ],
      default: [],
    },
    appliedPromotions: {
      type: [
        {
          _id: false,
          promotionId: String,
          name: String,
          rewardTypes: [String],
          // ₹ actually granted by THIS promotion on this order (product-line
          // discounts it won + its own order-level discount if it won that
          // too) — snapshotted at order-creation time so PromotionUsage's
          // discountAmount (see rp.payment.controller.js's webhook) isn't
          // left at its schema default of 0 forever (audit 2026-10-10,
          // finding A10). Absent/0 on any order created before this field
          // existed, same "doesn't predate the engine" convention as
          // rewardTypes above.
          discountAmount: { type: Number, default: 0 },
          // Which products this promotion actually discounted/gifted on this
          // order — snapshotted at creation time (additive, 2026-10-10) so
          // the webhook can copy it straight onto PromotionUsage.discounted
          // Products without recomputing the engine. Empty for a whole-order
          // reward (percent_off_order/flat_off_order).
          discountedProducts: {
            type: [{ productId: String, productName: String, quantity: Number, _id: false }],
            default: [],
          },
        },
      ],
      default: [],
    },
    // Product subtotal BEFORE any Promotion V2 discount was applied —
    // snapshotted at order-creation time, since `items[].productSnapshot
    // .priceAtPurchase` already holds the POST-discount price by the time
    // the order is saved (the discount loop mutates it in place). Without
    // this, PromotionUsage.cartValueBeforeDiscount could only ever be
    // reconstructed from the already-discounted saved items — i.e. it would
    // silently hold the post-discount value under the pre-discount name
    // (audit 2026-10-10, finding A10). 0/absent for any order with no
    // matched promotions or predating this field.
    promotionGrossProductSubtotal: { type: Number, default: 0 },
    invoiceData: {
      isGenerated: { type: Boolean, default: false },
      s3FileKey: { type: String, default: null },
    },
    // Seasonal gift-wrap add-on (not a catalog product — see
    // utils/giftWrapOffer.util.js). price is snapshotted from the live offer
    // config at order-creation time, exactly like productSnapshot.priceAtPurchase
    // above, and is what's actually included in `amount`.
    giftWrap: {
      selected: { type: Boolean, default: false },
      price: { type: Number, default: 0 },
      quantity: { type: Number, default: 0 },
      title: { type: String, default: "" },
      // Which note(s) the customer picked when adding gift wrap (multi-select).
      noteOptions: { type: [String], default: ["none"] },
    },
    amount: { type: Number, required: true },
    coupon: {
      couponCodeId: { type: String, default: null },
      couponCodeName: { type: String, default: null },
      discountAmount: { type: Number, default: 0 },
      isApplied: { type: Boolean, default: false },
    },

    // Denormalized snapshot for fast order-history display — see admin
    // repo's order.model.js for the field-by-field rationale. LoyaltyLedger
    // (this collection, shared) is always the balance source of truth.
    loyalty: {
      balanceBeforeOrder: { type: Number, default: 0 },
      pointsRedeemed: { type: Number, default: 0 },
      discountFromPoints: { type: Number, default: 0 },
      balanceAfterRedeem: { type: Number, default: 0 },

      pointsEarned: { type: Number, default: 0 },
      isEarnCredited: { type: Boolean, default: false },
      earnCreditedAt: { type: Date, default: null },
      balanceAfterEarn: { type: Number, default: null },
      // Written by the admin earn sweep when an order that earned is later
      // returned / refunded / cancelled / RTO (points taken back).
      isEarnReversed: { type: Boolean, default: false },
      earnReversedAt: { type: Date, default: null },
      pointsReversed: { type: Number, default: 0 },
      // Points used on this order given back after a return (admin sweep).
      isRedeemRefunded: { type: Boolean, default: false },
      redeemRefundedAt: { type: Date, default: null },
    },
    deliveryAddress: {
      addressId: String,
      fullName: String,
      mobileNumber: String,
      addressLine: String,
      city: String,
      state: String,
      formattedAddress: String,
      deliveryAddressFull: String, // canonical user-built string for ShipMozo/couriers
      lat: Number,
      long: Number,
      landmark: String,
      flatOrFloorNumber: String,
      pinCode: Number,
    },
    shippingInfo: {
      amount: { type: Number, default: 0 },
      type: { type: String, enum: ["standard", "dynamic"], default: "standard" },
      expectedNoOfBoxes: { type: Number, default: 0 },
      totalWeight: { type: Number, default: 0 }, // in grams
      serviceName: { type: String, default: null }
    },

    senderMobile: {
      type: String,
      required: false,
      validate: {
        validator: function (v) {
          return !v || /^[0-9]{10}$/.test(v);
        },
        message: "Sender mobile must be exactly 10 digits",
      },
    },

    receiverMobile: {
      type: String,
      required: false,
      validate: {
        validator: function (v) {
          return !v || /^[0-9]{10}$/.test(v);
        },
        message: "Receiver mobile must be exactly 10 digits",
      },
    },

    payment: {
      razorpayOrderId: String,
      razorpayPaymentId: String,
      // Set only from a captured gateway payment; never client/shipping input.
      guestClaimContact: { type: String },
      razorpaySignature: String,
      errorCode: String,
      errorDescription: String,
    },

    status: {
      type: String,
      enum: [
        "CREATED",
        "PAID",
        "CONFIRMED",
        "PROCESSING",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED",
        "FAILED",
      ],
      default: "CREATED",
    },

    statusHistory: [
      {
        _id: false,
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        note: { type: String, default: "" },
      },
    ],
    trackingInfo: {
      carrier: { type: String, default: null },
      trackingNumber: { type: String, default: null },
      estimatedDelivery: { type: Date, default: null },
    },

    // Admin-owned fields (admin repo's order.controller.js is the only writer).
    // Declared here read-only so the storefront can display delivery state and
    // the loyalty earn-cron's anchor timestamp on the order-history page.
    fulfillmentStatus: {
      type: String,
      enum: ["PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"],
      default: "PROCESSING",
    },
    fulfillmentDeliveredAt: { type: Date, default: null },

    paymentMethod: {
      type: String,
      enum: ["PREPAID", "COD"],
      default: "PREPAID",
    },
    codDetails: {
      partialAmountPaid: { type: Number, default: 0 },
      remainingAmount: { type: Number, default: 0 },
    },

    isGuestOrder: { type: Boolean, default: false },
    isNewGuestAccount: { type: Boolean, default: false },
    // Razorpay Magic Checkout (1CC) order: the address and the final shipping
    // fee arrive from Razorpay after payment, so the webhook fills
    // deliveryAddress instead of order-create. Always PREPAID.
    isMagicOrder: { type: Boolean, default: false },
    // An INTERNAL_TEST coupon pins the order at ₹1. Kept on the order so the
    // Magic serviceability callback can answer ₹0 shipping — otherwise
    // Razorpay adds a real shipping fee on top and the test order is no
    // longer ₹1.
    isInternalTestOrder: { type: Boolean, default: false },
    // Whether free shipping was unlocked when the order was created (offer,
    // cart rule, or subtotal threshold). Magic rates shipping in a later
    // callback, which cannot see the cart rules — without this the customer
    // is charged shipping the cart told them they would not pay.
    freeShippingUnlocked: { type: Boolean, default: false },
    guestInfo: {
      name: { type: String, default: null },
      email: { type: String, default: null },
      mobile: { type: String, default: null },
    },
    guestAccountClaim: {
      previousUserId: String,
      claimedAt: Date,
    },
    metaTracking: {
      fbp: { type: String, default: null },
      fbc: { type: String, default: null },
      // Persistent per-browser device id. Declared explicitly because Mongoose
      // strict mode silently drops undeclared nested paths — collectMetaTracking
      // in rp.payment.controller.js has always sent this, but without this line
      // it never reached the DB, so the guest CAPI externalId fallback and
      // channel attribution on the server-side purchase both had nothing to use.
      anonymousId: { type: String, default: null },
      clientIp: { type: String, default: null },
      clientUserAgent: { type: String, default: null },
      eventSourceUrl: { type: String, default: null },
      // GA4 `_ga` client id + session id from the checkout browser, so the
      // webhook's Measurement Protocol fallback purchase lands on the same
      // GA4 user/session (dedupe + Google Ads click attribution).
      gaClientId: { type: String, default: null },
      gaSessionId: { type: String, default: null },
    },
  },
  { timestamps: true },
);

orderSchema.index({ orderId: 1 }, { unique: true });
orderSchema.index({ userId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ userId: 1, createdAt: -1 }); // Compound index for user order history
orderSchema.index({ "payment.razorpayOrderId": 1 });
orderSchema.index({ "payment.razorpayPaymentId": 1 });
orderSchema.index({ "payment.guestClaimContact": 1 }, { sparse: true });
orderSchema.index({ createdAt: -1 });

const Order = mongoose.model("Order", orderSchema);
export default Order;
