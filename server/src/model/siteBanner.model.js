import mongoose from "mongoose";

// Mirrored 1:1 from the admin repo's model (server/models/siteBanner.model.js)
// so both apps read/write the same `sitebanners` collection — this repo
// only ever reads, admin owns writes.
const siteBannerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: {
      text: { type: String, trim: true },
      imageUrl: { type: String, trim: true },
      ctaLabel: { type: String, trim: true },
      ctaUrl: { type: String, trim: true },
    },
    routePatterns: { type: [String], required: true },
    position: {
      type: String,
      enum: [
        "top-left", "top-center", "top-right",
        "middle-left", "middle-center", "middle-right",
        "bottom-left", "bottom-center", "bottom-right",
        "custom",
      ],
      default: "top-center",
      required: true,
    },
    customOffset: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
    },
    isActive: { type: Boolean, default: true },
    priority: { type: Number, default: 0 },
    orientation: { type: String, enum: ["horizontal", "vertical"], default: "horizontal" },
    deviceVisibility: { type: String, enum: ["mobile", "desktop", "both"], default: "both" },
    dismissible: { type: Boolean, default: true },
    displayFrequency: {
      type: String,
      enum: ["always", "once-per-session", "once-per-day"],
      default: "always",
    },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.model("SiteBanner", siteBannerSchema);
