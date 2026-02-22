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
    uiProductId: {
      type: String,
      required: [true, "uiProductId is required"],
      unique: true,
    },
    productImg: {
      type: String,
      required: [true, "productImg is required"],
      unique: true,
    },
    secondaryImages: {
      type: [String],
      default: [],
    },
    productDes: {
      type: String,
      required: [true, "productDes is required"],
    },
    listedPrice: {
      type: Number,
      required: [true, "listedPrice is required"],
    },
    sellingPrice: {
      type: Number,
      required: [true, "sellingPrice is required"],
    },
    listedPrice: {
      type: Number,
      required: [true, "listedPrice is required"],
    },
    productCategory: {
      type: String,
      required: [true, "productCategory is required"],
    },
    productQuantity: {
      type: Number,
    },
    dimensions: {
      length: Number,
      breadth: Number,
      height: Number,
    },
    productStatus: {
      type: String,
      enum: ["in_stock", "out_of_stock", "discontinued"],
    },
    tags: {
      type: [String],
      enum: ["featured", "new_arrival", "best_seller", "trending"],
    },
    isPublished: Boolean,
    productSubDes: String,
    productSubCategory: String,
    isPublished: {
      type: Boolean,
      require: true,
    },
  },
  {
    timestamps: true,
  },
);
// Indexes for performance optimization
// Note: productId, productName, uiProductId, productImg already have unique indexes from schema
productSchema.index({ productCategory: 1 });
productSchema.index({ productStatus: 1 });
productSchema.index({ productCategory: 1, productStatus: 1 }); // Compound index for filtering
productSchema.index({ productName: "text", productDes: "text" }); // Text search
productSchema.index({ tags: 1 }); // For filtering by tags
productSchema.index({ isPublished: 1 });

const Product = new mongoose.model("Product", productSchema);
export default Product;
