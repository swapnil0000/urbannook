import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({
  path: "./.env",
});

const productSchema = mongoose.Schema(
  {
    productName: {
      type: String,
      required: [true, "name is required"],
      unique: true,
    },
    productId: {
      type: String,
      required: [true, "productId is required"],
      unique: true,
    },
    productDes: {
      type: String,
      require: true,
    },
    sellingPrice: {
      type: Number,
      required: [true, "sellingPrice is required"],
    },
    productCategory: {
      type: String,
      required: [true, "productCategory is required"],
    },
    productQuantity: {
      type: Number,
    },
    productStatus: {
      type: String,
      enum: ["in_stock", "out_of_stock", "discontinued"],
    },
  },
  {
    timestamps: true,
  }
);

productSchema.index({ productStatus: 1, createdAt: -1 });
const Product = new mongoose.model("Product", productSchema);
export default Product;
