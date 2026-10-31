import mongoose from "mongoose";

/**
 * READ-ONLY view of the admin panel's ShipmentRecord collection ("shipmentrecords").
 *
 * The admin app writes these (Shipmozo push, tracking webhook). The storefront
 * only reads them to show the customer where their parcel is, so only the
 * customer-safe fields are declared. Courier charges, weights, labels, RTO
 * costs and warehouse data are deliberately NOT declared and are excluded in
 * every query (see CUSTOMER_SHIPMENT_FIELDS) — they must never reach a customer.
 */
const trackingEventSchema = new mongoose.Schema(
  { scanStatus: String, scanLocation: String, scanDateTime: Date, remarks: String },
  { _id: false },
);

const shipmentRecordSchema = new mongoose.Schema(
  {
    sourceOrderId: String,
    cloneSeq: Number,
    // Which items of the order this parcel carries (indexes into order.items). Absent = the whole order.
    itemIndexes: [Number],
    shipmentStatus: String,
    awbNumber: String,
    courierCompany: String,
    courierService: String,
    isCancelled: Boolean,
    shipmentDirection: String,
    trackingHistory: [trackingEventSchema],
    expectedDeliveryDate: Date,
    lastTrackedAt: Date,
    dispatchConfirmedAt: Date,
    createdAt: Date,
  },
  { strict: false, timestamps: false },
);

shipmentRecordSchema.index({ sourceOrderId: 1 });

// Whitelist used as the projection of every customer-facing read.
export const CUSTOMER_SHIPMENT_FIELDS =
  "sourceOrderId cloneSeq itemIndexes shipmentStatus awbNumber courierCompany courierService isCancelled shipmentDirection trackingHistory expectedDeliveryDate lastTrackedAt dispatchConfirmedAt createdAt";

export default mongoose.models.ShipmentRecord || mongoose.model("ShipmentRecord", shipmentRecordSchema, "shipmentrecords");
