import mongoose from "mongoose";

const nfcImageSchema = new mongoose.Schema({
  userId: {
    type: String,
    require: true,
  },
  uploadedImagesUrl: {
    type: [String],
  },
  status: {
    type: String,
    enum: ["CREATED", "EMPTY", "UPLOADED"],
    default: "CREATED",
  },
  isAssigned: {
    type: Boolean,
    default: false,
  },
  uploadedText: {
    type: [String],
  },
});

const nfcImage = mongoose.model("nfcImage", nfcImageSchema);
export default nfcImage;
