export const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
export const firstVariant = (p) => p?.variantDetails?.[0] || {};
export const productImg = (p) => firstVariant(p)?.variantImage?.[0] || p?.productImg || p?.productImage || '/assets/logo.webp';
export const secondImg = (p) => p?.secondaryImages?.[0] || p?.variantDetails?.[1]?.variantImage?.[0] || null;
export const productHref = (p) => `/products/${p.productId}`;
