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

const Event = mongoose.model("Event", eventSchema);

export default Event;
