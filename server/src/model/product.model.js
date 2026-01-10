import mongoose from "mongoose";
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
    productImg: {
      type: String,
      required: [true, "productImg is required"],
      unique: true,
    },
    productDes: {
      type: String,
      required: [true, "productDes is required"],
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
    productSubDes: String,
    productSubCategory: String,
  },
  {
    timestamps: true,
  }
);

productSchema.index({ productStatus: 1, createdAt: -1 });
const Product = new mongoose.model("Product", productSchema);
export default Product;
