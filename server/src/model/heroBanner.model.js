import mongoose from "mongoose";

// Read-only mirror of the admin repo's server/models/heroBanner.model.js —
// same schema, same "herobanners" collection. Admin owns writes; the
// storefront only reads (see heroBanner.controller.js). Keep both in sync.
const slideSchema = new mongoose.Schema(
  {
    desktopImage: { type: String, required: true, trim: true },
    mobileImage: { type: String, trim: true, default: "" },
    link: { type: String, trim: true, default: "" },
    // Real pixel size of each uploaded image (read in the admin browser at upload). The storefront
    // reserves a box of exactly this shape, so any artwork shape shows uncropped with no layout shift.
    desktopW: { type: Number, default: 0 },
    desktopH: { type: Number, default: 0 },
    mobileW: { type: Number, default: 0 },
    mobileH: { type: Number, default: 0 },
    // Edge colours sampled from the artwork: fill the space beside it when the banner height is capped.
    bgTop: { type: String, trim: true, default: "" },
    bgBottom: { type: String, trim: true, default: "" },
    // Tiny fine-print line shown in white over the bottom-left of the banner, e.g. "* Applicable items only". "" = none.
    note: { type: String, trim: true, default: "", maxlength: 60 },
    alt: { type: String, required: true, trim: true },
    enabled: { type: Boolean, default: true },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
  },
  { _id: true },
);

const heroBannerSchema = new mongoose.Schema(
  {
    key: { type: String, default: "home", unique: true },
    slides: { type: [slideSchema], default: [] },
    autoplay: {
      enabled: { type: Boolean, default: true },
      seconds: { type: Number, default: 5 },
    },
  },
  { timestamps: true, collection: "herobanners" },
);

export default mongoose.model("HeroBanner", heroBannerSchema);
