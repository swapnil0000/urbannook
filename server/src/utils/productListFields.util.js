// What GET /products (the list) leaves out: fields only the product page reads (GET /product/:id sends everything).
// Dropped in the DB query, not after download. ?full=1 brings the full list back.
export const LIST_DROP = ["productDes", "productSubDes", "specifications", "materialAndCare", "disclaimer", "packagingDimensions", "pdpDisplay"];
export const VARIANT_DROP = ["variantDes", "specifications"];

/** Mongo exclusion projection for the list: "-_id -updatedAt -__v" plus the page-only fields above. */
export const LIST_SELECT = ["-_id", "-updatedAt", "-__v", ...LIST_DROP.map((f) => `-${f}`), ...VARIANT_DROP.map((f) => `-variantDetails.${f}`)].join(" ");
export const FULL_SELECT = "-_id -updatedAt -__v";
