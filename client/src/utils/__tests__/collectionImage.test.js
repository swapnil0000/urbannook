import { describe, it, expect } from 'vitest';
import { imageCandidates, photoOf, LOGO } from '../collectionImage';

const prod = (category, img, extra = {}) => ({ productCategory: category, variantDetails: [{ isActive: true, variantImage: img ? [img] : [] }], ...extra });

describe('collection tile image candidates', () => {
  const products = [prod('Lamp', 'lamp.webp'), prod('Pen Stand', null, { productImg: 'pen-main.webp' }), prod('Decor', null)];

  it('prefers the admin image, then the API cover, then a real product photo of that category, then the logo', () => {
    expect(imageCandidates({ slug: 'lamp', image: 'admin.webp', cover: 'cover.webp' }, products)).toEqual(['admin.webp', 'cover.webp', 'lamp.webp', LOGO]);
    expect(imageCandidates({ slug: 'lamp', image: '', cover: '' }, products)).toEqual(['lamp.webp', LOGO]);
  });
  it('matches the category by slug ("Pen Stand" → pen-stand) and accepts the product main image', () => {
    expect(imageCandidates({ slug: 'pen-stand' }, products)).toEqual(['pen-main.webp', LOGO]);
  });
  it('falls back to the logo only when nothing real exists', () => {
    expect(imageCandidates({ slug: 'decor' }, products)).toEqual([LOGO]);
    expect(imageCandidates({ slug: 'unknown' }, [])).toEqual([LOGO]);
  });
  it('skips inactive variants and never treats a missing photo as a photo', () => {
    expect(photoOf({ variantDetails: [{ isActive: false, variantImage: ['old.webp'] }, { variantImage: ['live.webp'] }] })).toBe('live.webp');
    expect(photoOf({})).toBe('');
  });
});
