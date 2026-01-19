import mongoose from "mongoose";

const addressSchema = mongoose.Schema({
  addressId: {
    type: String,
    required: [true, "addresssId is required"],
  },
  lat: {
    type: String,
    required: [true, "lat is required"],
  },
  long: {
    type: String,
    required: [true, "long is required"],
  },
  city: {
    type: String,
    required: [true, "city is required"],
  },
  state: {
    type: String,
    required: [true, "state is required"],
  },
  pinCode: {
    type: Number,
    required: [true, "userPinCode is required"],
  },
  formattedAdress: {
    type: String,
    required: [true, "formattedAdress is required"],
  },
});

const Address = mongoose.model("Address", addressSchema);
export default Address;
