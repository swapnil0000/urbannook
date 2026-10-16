// Same rule as the server (server/src/utils/category.util.js toCategorySlug):
// "Pen Stand" → "pen-stand", admin's "wall_hangings" → "wall-hangings".
export const toCategorySlug = (s = '') =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export const categoryPath = (name) => `/category/${toCategorySlug(name)}`;
