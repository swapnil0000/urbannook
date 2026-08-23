// One-off script: creates the "Gift Wrap" add-on product in STAGE DB.
// Real product (so it can go through the normal cart-add flow), but
// isAddon:true keeps it out of the browsable "All Products" grid.
// Run once: node scripts/createGiftWrapProduct.js
import dotenv from "dotenv";
import mongoose from "mongoose";
import { randomUUID } from "crypto";

dotenv.config({ path: ".env.staging" });

const PLACEHOLDER_IMAGE = "https://urbannook.in/assets/logo.webp";

async function run() {
  await mongoose.connect(`${process.env.DB_URI}/${process.env.DB_NAME}`);
  const db = mongoose.connection.db;
  const products = db.collection("products");

  const existing = await products.findOne({ isAddon: true, productName: "Gift Wrap" });
  if (existing) {
    console.log("Gift Wrap product already exists:", existing.productId);
    await mongoose.disconnect();
    return;
  }

  const productId = randomUUID();
  const now = new Date();

  const doc = {
    productName: "Gift Wrap",
    productId,
    productImg: PLACEHOLDER_IMAGE,
    secondaryImages: [],
    productDes: "Make it a gift — includes gift wrap and a handwritten note.",
    productCategory: "Add-on",
    productSubCategory: "Gift Wrap",
    productSubDes: "Includes gift wrap & note",
    productQuantity: 9999,
    variantDetails: [
      {
        variantName: "Standard",
        variantImage: [PLACEHOLDER_IMAGE],
        variantMrp: 200,
        variantPrice: 200,
        variantDes: "Make it a gift — includes gift wrap and a handwritten note.",
        variantSwatchType: "color",
        variantSwatchValue: "#F5DEB3",
        sku: "GIFTWRAPSTD",
        isActive: true,
        variantQuantity: 9999,
        variantOutOfStock: false,
      },
    ],
    variantTitleTemplate: "",
    color: [],
    productStatus: "in_stock",
    tags: [],
    isPublished: true,
    isAddon: true,
    priority: 0,
    recommendedProducts: [],
    comboProductIds: [],
    warranty: null,
    disclaimer: "",
    materialAndCare: "",
    specifications: [],
    categoryCode: "ADD",
    familyCode: "GFT",
    packagingDimensions: { length: 20, breadth: 15, height: 2, weight: 50 },
    disableAutoPush: true,
    sku: "ADDGFTWRPS",
    hsnCode: "",
    gstRate: 0,
    categoryId: "",
    categorySlug: "",
    subCategoryId: "",
    subCategorySlug: "",
    createdAt: now,
    updatedAt: now,
  };

  const result = await products.insertOne(doc);
  console.log("Gift Wrap product created:", productId, "| insertedId:", result.insertedId);

  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
