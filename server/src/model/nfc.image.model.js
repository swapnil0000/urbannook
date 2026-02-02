import mongoose from "mongoose";

const nfcImageSchema = new mongoose.Schema({
  userId: {
    type: String,
    require: true,
  },
  uploadedImagesUrl: {
    type: [String],
    require: true,
  },
  status: {
    type: String,
    enum: ["empty", "uploaded"],
    default: "empty",
  },
});

const nfcImage = mongoose.model("nfcImage", nfcImageSchema);
export default nfcImage;
