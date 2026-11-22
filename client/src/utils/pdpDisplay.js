// Keep keys in sync with the admin product editor and both Product schemas.
// Products without settings retain the existing storefront display.
export const PDP_SECTION_KEYS = [
  'deliveryOffer', 'questions', 'offers', 'coupons',
  'customization', 'trust', 'details', 'specifications', 'materialCare', 'shippingExchange', 'lookCloser', 'customerPhotos',
  'comparison', 'reviews', 'otherVariants', 'related', 'story', 'faq',
  'stickyBuyBar',
];

export const PDP_ORDER_KEYS = ['comparison', 'reviews', 'otherVariants', 'related', 'story', 'faq'];
export const PDP_HEADING_KEYS = ['details', 'lookCloser', 'comparison', 'reviews', 'related', 'story', 'faq'];
export const PDP_SECTION_DEFAULTS = { comparison: false };

export const pdpDisplayFor = (product) => {
  const value = product?.pdpDisplay;
  const requestedOrder = Array.isArray(value?.order) ? value.order.filter((key) => PDP_ORDER_KEYS.includes(key)) : [];
  const comparison = value?.comparison && typeof value.comparison === 'object' ? value.comparison : {};
  const media = value?.media && typeof value.media === 'object' ? value.media : {};
  const customRows = Array.isArray(comparison.rows) ? comparison.rows.slice(0, 12).filter((row) => typeof row?.label === 'string' && row.label.trim()).map((row) => ({ label: row.label.slice(0, 80), other: row.other === 'cross' ? 'cross' : 'dash' })) : [];
  const sourceSpecs = product?.specifications?.length ? product.specifications : product?.variantDetails?.find((variant) => variant.isActive !== false && variant.specifications?.length)?.specifications || [];
  const specRows = customRows.length ? [] : sourceSpecs.filter((spec) => spec?.key && spec?.value).slice(0, 6).map((spec) => ({ label: `${spec.key}: ${spec.value}`.slice(0, 80), other: 'dash' }));
  return {
    titleMode: value?.titleMode === 'product' ? 'product' : 'variant',
    sections: { variantPicker: true, ...Object.fromEntries(PDP_SECTION_KEYS.map((key) => [key, typeof value?.sections?.[key] === 'boolean' ? value.sections[key] : PDP_SECTION_DEFAULTS[key] ?? true])) },
    headings: Object.fromEntries(PDP_HEADING_KEYS.map((key) => [key, typeof value?.headings?.[key] === 'string' ? value.headings[key].trim().slice(0, 80) : ''])),
    order: [...new Set([...requestedOrder, ...PDP_ORDER_KEYS])],
    comparison: {
      eyebrow: typeof comparison.eyebrow === 'string' && comparison.eyebrow.trim() ? comparison.eyebrow.slice(0, 60) : 'At a glance',
      caption: typeof comparison.caption === 'string' && comparison.caption.trim() ? comparison.caption.slice(0, 180) : 'Other products vary by model; compare their stated specifications.',
      rows: customRows.length ? customRows : specRows.length ? specRows : [{ label: `Product: ${product?.productName || 'This product'}`.slice(0, 80), other: 'dash' }],
    },
    media: {
      lookCloserByVariant: Array.isArray(media.lookCloserByVariant) ? media.lookCloserByVariant : null,
      customerPhotos: Array.isArray(media.customerPhotos) ? media.customerPhotos : null,
    },
  };
};
