// Store-wide promises shown in the announcement / sale bar. These are the
// business's own commitments (owner-approved copy, 2026-11-01); each must stay
// true. "Happiness guaranteed" is backed by the real replacement policy.
export const STORE_PROMISES = [
  'Lowest prices since launch',
  '100% happiness guaranteed · free replacement if it arrives damaged',
  'Ready to ship within 48 hrs',
  'Partial COD available',
  'Pan-India delivery',
  'Made in India',
];

// The two that answer "is this a good place to buy?", mixed into the sale bar.
export const SALE_BAR_PROMISES = STORE_PROMISES.slice(0, 2);
