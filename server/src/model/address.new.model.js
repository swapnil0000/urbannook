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
        type: [Number], // [lng, lat]
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
      enum: ["Home", "Work", "Other"],
      default: "Home",
    },

    landmark: String,
    flatOrFloorNumber: String,

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
