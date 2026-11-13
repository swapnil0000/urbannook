// What GET /products (the LIST) leaves out. These are the fields only the product page reads (it uses
// GET /product/:id, which still sends everything). The storefront's productsApi.js (LIST_DROP / VARIANT_DROP) already
// threw them away after downloading the list; dropping them in the database query instead means they are never read
// from MongoDB, never held in the 10-minute cache and never sent over the wire. ?full=1 brings the old full list back.
export const LIST_DROP = ["productDes", "productSubDes", "specifications", "materialAndCare", "disclaimer", "packagingDimensions"];
export const VARIANT_DROP = ["variantDes", "specifications"];

/** Mongo exclusion projection for the list: "-_id -updatedAt -__v" plus the page-only fields above. */
export const LIST_SELECT = ["-_id", "-updatedAt", "-__v", ...LIST_DROP.map((f) => `-${f}`), ...VARIANT_DROP.map((f) => `-variantDetails.${f}`)].join(" ");
export const FULL_SELECT = "-_id -updatedAt -__v";
