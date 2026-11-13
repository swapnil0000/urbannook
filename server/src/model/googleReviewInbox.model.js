import mongoose from "mongoose";

// READ-ONLY view of the admin's Google Business Profile review inbox (collection "googleReviewInbox", written only by
// urbannook-admin's daily sync / Takeout import). The storefront never writes to it and never selects reviewer ids or
// admin decision fields. Keep field names in step with urbannook-admin/server/models/googleReviewInbox.model.js.
const googleReviewInboxSchema = new mongoose.Schema(
  {
    googleReviewId: String,
    reviewerName: String,
    reviewerPhotoUrl: String,
    isAnonymous: Boolean,
    rating: Number, // 0 = Google gave no star rating
    text: String,
    reply: String,
    createTime: Date,
    status: String, // new | added | ignored (ignored = hidden by the team)
    lastSeenAt: Date,
  },
  { strict: false },
);

export default mongoose.models.GoogleReviewInbox || mongoose.model("GoogleReviewInbox", googleReviewInboxSchema, "googleReviewInbox");
