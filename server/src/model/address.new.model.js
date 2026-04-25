import mongoose from "mongoose";

const addressSchema = mongoose.Schema(
  {
    addressId: {
      type: String, // UUID v7
      required: true,
      unique: true,
      index: true,
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [long, latitu]
        required: true,
      },
    },

    placeId: {
      type: String,
      required: true,
    },

    formattedAddress: {
      type: String,
      required: true,
    },

    addressType: {
      type: String,
      enum: ["Home", "Work", "Hotel", "Other"],
      default: "Home",
    },

    landmark: String,
    flatOrFloorNumber: String,

    // --- v2 address fields (AddressFormModal) ---
    buildingName: String,   // "House No. / Building"
    street: String,         // "Street / Colony"
    floor: String,          // "Floor"
    tower: String,          // "Tower / Wing"
    fullName: String,       // contact name for delivery
    mobileNumber: String,   // contact phone for delivery
    // -------------------------------------------

    // Canonical delivery string built from user-typed fields.
    // Use THIS for couriers (ShipMozo etc.) — pinCode is always the Number field.
    deliveryAddressFull: String,

    isDefault: {
      type: Boolean,
      default: true,
    },

    city: String,
    state: String,
    pinCode: Number,
  },
  { timestamps: true },
);
addressSchema.index({ location: "2dsphere" });
addressSchema.index({ placeId: 1 });
const Address = mongoose.model("Address", addressSchema);
export default Address;
