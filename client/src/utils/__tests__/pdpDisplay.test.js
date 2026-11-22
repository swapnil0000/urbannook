import { describe, expect, it } from 'vitest';
import { pdpDisplayFor, PDP_ORDER_KEYS } from '../pdpDisplay';

describe('PDP display fallback', () => {
  it('keeps legacy products visible and purchase controls locked', () => {
    const display = pdpDisplayFor({ productId: 'legacy' });
    expect(display.sections.comparison).toBe(false);
    expect(display.sections.variantPicker).toBe(true);
    expect(display.order).toEqual(PDP_ORDER_KEYS);
  });

  it('keeps product overrides independent and sanitizes legacy order values', () => {
    const a = pdpDisplayFor({ pdpDisplay: { sections: { comparison: false, lookCloser: false, variantPicker: false }, headings: { faq: '  Answers  ' }, order: ['faq', 'bogus', 'faq', 'reviews'], comparison: { eyebrow: 'Our build', rows: [{ label: 'A real feature', other: 'dash' }] } } });
    const b = pdpDisplayFor({ pdpDisplay: { sections: { comparison: true } } });
    expect(a.sections.comparison).toBe(false);
    expect(a.sections.lookCloser).toBe(false);
    expect(a.sections.variantPicker).toBe(true);
    expect(a.headings.faq).toBe('Answers');
    expect(a.order.slice(0, 2)).toEqual(['faq', 'reviews']);
    expect(a.comparison.rows).toEqual([{ label: 'A real feature', other: 'dash' }]);
    expect(b.sections.comparison).toBe(true);
  });

  it('uses any product’s own specifications when comparison has no custom rows', () => {
    const display = pdpDisplayFor({ productName: 'Generic Desk Lamp', pdpDisplay: { sections: { comparison: true } }, specifications: [{ key: 'Light source', value: 'LED' }] });
    expect(display.sections.comparison).toBe(true);
    expect(display.comparison.rows).toEqual([{ label: 'Light source: LED', other: 'dash' }]);
    expect(pdpDisplayFor({ productName: 'Generic Desk Lamp' }).comparison.rows).toEqual([{ label: 'Product: Generic Desk Lamp', other: 'dash' }]);
  });

  it('resolves comparison ON and Look closer OFF independently', () => {
    const display = pdpDisplayFor({ pdpDisplay: { sections: { comparison: true, lookCloser: false } }, specifications: [{ key: 'Power', value: 'Adapter' }] });
    expect(display.sections.comparison).toBe(true);
    expect(display.sections.lookCloser).toBe(false);
    expect(display.comparison.rows).toEqual([{ label: 'Power: Adapter', other: 'dash' }]);
  });

  it('keeps media automatic until a product is curated and preserves empty custom lists', () => {
    expect(pdpDisplayFor({}).media).toEqual({ lookCloserByVariant: null, customerPhotos: null });
    const display = pdpDisplayFor({ pdpDisplay: { media: { lookCloserByVariant: [{ sku: 'red', images: ['a.webp'] }], customerPhotos: [] } } });
    expect(display.media.lookCloserByVariant).toEqual([{ sku: 'red', images: ['a.webp'] }]);
    expect(display.media.customerPhotos).toEqual([]);
  });
});
