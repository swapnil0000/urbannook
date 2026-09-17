import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    // What happened
    eventName: { type: String, required: true, index: true },

    // Who (identity)
    userId: { type: String, default: null, index: true }, // app userId when logged in
    anonymousId: { type: String, required: true, index: true }, // persistent device id
    sessionId: { type: String, default: null, index: true }, // 30-min activity window

    // Event payload — flexible per event type (value, items[], coupon, etc.)
    properties: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Page context
    url: { type: String, default: null },
    path: { type: String, default: null },
    referrer: { type: String, default: null },

    // First-touch marketing attribution (utm_*, gclid, fbclid, landing_page)
    attribution: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Network / device (server-enriched, never trusted from client)
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },

    // Client-side event timestamp (createdAt below = server receive time)
    eventTime: { type: Date, default: null },

    // Idempotency key for events that can legitimately arrive twice from two
    // different writers — today only `purchase`, which the browser fires on the
    // Razorpay success handler AND the server fires from the payment.captured
    // webhook. Both use `purchase:<orderId>`, and the unique index below makes
    // the second write a no-op instead of double-counting revenue.
    // Sparse: ordinary events leave it unset and are never deduplicated.
    dedupeKey: { type: String, default: undefined },
  },
  { timestamps: true } // createdAt / updatedAt
);

// Funnel queries (per event type, time-ordered)
eventSchema.index({ eventName: 1, createdAt: -1 });
// Logged-in user journey
eventSchema.index({ userId: 1, createdAt: -1 });
// Anonymous / device journey + identity stitching
eventSchema.index({ anonymousId: 1, createdAt: -1 });
// Session reconstruction (chronological within a visit)
eventSchema.index({ sessionId: 1, createdAt: 1 });
// Idempotency for dual-writer events (see dedupeKey above). Sparse so the
// millions of events without a key are not indexed and can never collide.
eventSchema.index({ dedupeKey: 1 }, { unique: true, sparse: true });
// Channel reporting — "how much of this came from Google organic search?"
// (attribution.channel is set client-side by classifyChannel in analytics.js)
eventSchema.index({ "attribution.channel": 1, createdAt: -1 });

const Event = mongoose.model("Event", eventSchema);

export default Event;
