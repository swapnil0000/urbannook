// Shop grids list one card per sellable variant (gyaanstore-style), so card
// counts and Availability counts match what a customer can actually buy.
// Shared by CategoryPage and AllProductsPage.
// One card per sellable variant, linking to that variant's own page - a
// category with one product and four variants (BMW, Ferrari, …) shows four
// cards. Variants hidden by admin (isActive:false) are skipped.
export const toItems = (products = []) => {
  const perProduct = products.map((p) => {
    const variants = (p.variantDetails || []).filter((v) => v && v.isActive !== false);
    if (!variants.length) return [{ key: p.productId, p, group: p.productName, href: `/product/${p.productId}`, soldOut: p.productStatus === 'out_of_stock', price: Number(p.effectivePrice || 0) }];
    return variants.map((v, i) => ({
      key: `${p.productId}-${v.sku || i}`,
      // Card shows this variant's name/image/price; second image would be
      // another variant's, so it's dropped.
      p: { ...p, productName: v.variantName || p.productName, variantDetails: [v], secondaryImages: [], effectivePrice: undefined, effectiveMrp: undefined },
      href: v.sku ? `/product/${p.productId}/${v.sku}` : `/product/${p.productId}`,
      soldOut: v.variantOutOfStock === true || (v.variantQuantity != null && v.variantQuantity <= 0),
      price: Number(v.variantPrice || 0),
      group: p.productName, // the product this variant belongs to (Type filter)
      // The product's tag badge (Bestseller/Trending/New) only on its first
      // card; repeated on all ten pen-stand colours it was just noise.
      badge: i === 0 ? undefined : null,
    }));
  });
  // Grouped: all of one product's variants together (BMW, Porsche, … side by
  // side), product after product in the server's order.
  const out = perProduct.flat();
  // Sold-out cards go after everything you can buy (stable, so the
  // grouped order holds otherwise).
  return [...out.filter((x) => !x.soldOut), ...out.filter((x) => x.soldOut)];
};

