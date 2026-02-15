import mongoose from "mongoose";
import bcrypt from "bcrypt";
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
  password: String,
});
nfcImageSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

nfcImageSchema.methods.passCheck = async function (password) {
  return await bcrypt.compare(password, this.password);
};
const nfcImage = mongoose.model("nfcImage", nfcImageSchema);
export default nfcImage;
