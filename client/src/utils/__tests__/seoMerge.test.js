import { describe, it, expect } from 'vitest';
import { mergeSeo, normalizeSeoPath } from '../seoMerge';

const page = {
  fullTitle: 'Lamp | UrbanNook', description: 'Page desc', canonicalUrl: 'https://www.urbannook.in/category/lamp',
  image: 'page.webp', noIndex: false, ogTitle: 'Lamp | UrbanNook', ogDescription: 'Page desc', structuredData: [{ '@type': 'ItemList' }],
};

describe('mergeSeo', () => {
  it('no admin entry → exactly the page values', () => {
    expect(mergeSeo(page, null)).toBe(page);
  });

  it('empty admin fields keep the page values', () => {
    const out = mergeSeo(page, { metaTitle: '', metaDescription: '  ', canonicalUrl: '', robots: 'default', ogImage: '', customJsonLd: '' });
    expect(out).toEqual(page);
  });

  it('partial entry: title overrides title and OG title only', () => {
    const out = mergeSeo(page, { metaTitle: 'Desk Lamps – Buy Online | UrbanNook' });
    expect(out.fullTitle).toBe('Desk Lamps – Buy Online | UrbanNook');
    expect(out.ogTitle).toBe('Desk Lamps – Buy Online | UrbanNook');
    expect(out.description).toBe('Page desc');
    expect(out.canonicalUrl).toBe(page.canonicalUrl);
  });

  it('full entry overrides everything and appends custom JSON-LD', () => {
    const out = mergeSeo({ ...page, noIndex: true }, {
      metaTitle: 'T', metaDescription: 'D', canonicalUrl: '/category/lamps', robots: 'index',
      ogTitle: 'OG T', ogDescription: 'OG D', ogImage: 'https://x/og.jpg',
      customJsonLd: '{"@type":"Thing"}',
    });
    expect(out).toMatchObject({
      fullTitle: 'T', description: 'D', canonicalUrl: 'https://www.urbannook.in/category/lamps', noIndex: false,
      ogTitle: 'OG T', ogDescription: 'OG D', image: 'https://x/og.jpg',
    });
    expect(out.structuredData).toEqual([{ '@type': 'ItemList' }, { '@type': 'Thing' }]);
  });

  it('noindex from admin wins; broken JSON-LD is ignored', () => {
    const out = mergeSeo(page, { robots: 'noindex', customJsonLd: '{bad' });
    expect(out.noIndex).toBe(true);
    expect(out.structuredData).toEqual(page.structuredData);
  });
});

describe('normalizeSeoPath', () => {
  it('matches the admin/server key', () => {
    expect(normalizeSeoPath('/Product/019DA/LMPBCLBMWS/')).toBe('/product/019da/lmpbclbmws');
    expect(normalizeSeoPath('/')).toBe('/');
  });
});
