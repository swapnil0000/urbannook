// Same rule as the server (server/src/utils/category.util.js toCategorySlug):
// "Pen Stand" → "pen-stand", admin's "wall_hangings" → "wall-hangings".
export const toCategorySlug = (s = '') =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export const categoryPath = (name) => `/category/${toCategorySlug(name)}`;

// Display names where the stored category is singular (header nav + shop pills).
export const CATEGORY_LABEL = { Lamp: 'Lamps', 'Pen Stand': 'Pen Stands' };

// Order of categories wherever the site lists them from the catalogue (header bar,
// mobile drawer, footer, home "Shop by Collection"). These come first when they
// have products; any other category follows in catalogue order. The header and
// home show the first 4, so Gaming has Superheroes' old slot there.
export const CATEGORY_PRIORITY = ['Lamp', 'Anime', 'Decor', 'Gaming'];
const rank = (name) => { const i = CATEGORY_PRIORITY.indexOf(name); return i === -1 ? CATEGORY_PRIORITY.length : i; };

// Stable sort of items by category name (strings, or objects via getName).
export const sortByCategoryPriority = (items = [], getName = (x) => x) =>
  items.map((x, i) => [x, i]).sort((a, b) => rank(getName(a[0])) - rank(getName(b[0])) || a[1] - b[1]).map(([x]) => x);
