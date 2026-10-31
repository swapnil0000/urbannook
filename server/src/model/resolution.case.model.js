import mongoose from "mongoose";

/**
 * READ-ONLY view of the admin panel's ResolutionCase collection ("resolutioncases").
 *
 * Cancellations, refunds, returns, replacements and exchanges are logged there by
 * the support team. The storefront reads only the facts a customer is entitled to
 * see — refund amount/status/date, replacement/exchange progress. Internal reasons,
 * notes, approver emails, costs and the event log are NOT declared and are excluded
 * in every query (see CUSTOMER_CASE_FIELDS).
 */
const resolutionCaseSchema = new mongoose.Schema(
  {
    orderId: String,
    caseType: String,
    status: String,
    refunds: [
      {
        refundType: String,
        amount: Number,
        method: String,
        status: String,
        processedAt: Date,
        createdAt: Date,
      },
    ],
    replacements: [{ status: String, createdAt: Date }],
    exchanges: [{ createdAt: Date }],
    createdAt: Date,
    updatedAt: Date,
  },
  { strict: false, timestamps: false },
);

resolutionCaseSchema.index({ orderId: 1, createdAt: -1 });

export const CUSTOMER_CASE_FIELDS =
  "orderId caseType status refunds.refundType refunds.amount refunds.method refunds.status refunds.processedAt refunds.createdAt replacements.status replacements.createdAt exchanges.createdAt createdAt updatedAt";

export default mongoose.models.ResolutionCase || mongoose.model("ResolutionCase", resolutionCaseSchema, "resolutioncases");
