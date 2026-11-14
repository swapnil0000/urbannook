// Product "card" projection for list views (grid, category page, header
// search, footer, cart drawer, PDP recommendations).
//
// Same rules the storefront client applied after download (client
// store/api/productsApi.js slimProduct) - now done on the server so the bytes
// never cross the network: drop long text the card never shows, keep the
// first variant's full gallery (home hero carousel of a single-variant
// product) and only the first image of the other variants.
const LIST_DROP = ["productDes", "productSubDes", "specifications", "materialAndCare", "disclaimer", "packagingDimensions"];
const VARIANT_DROP = ["variantDes", "specifications"];

export const toProductCard = (p) => {
  if (!p || typeof p !== "object") return p;
  const out = { ...p };
  for (const k of LIST_DROP) delete out[k];
  if (Array.isArray(p.variantDetails)) {
    out.variantDetails = p.variantDetails.map((v, i) => {
      const nv = { ...v };
      for (const k of VARIANT_DROP) delete nv[k];
      if (i > 0 && Array.isArray(v.variantImage)) nv.variantImage = v.variantImage.slice(0, 1);
      return nv;
    });
  }
  return out;
};

export const toProductCards = (list) => (Array.isArray(list) ? list.map(toProductCard) : []);
