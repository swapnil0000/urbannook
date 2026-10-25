// Remembers which homepage offers a shopper opened (the offer page) so the
// checkout can gently remind them if the offer is still incomplete. Stored in
// the browser only; dismissals last for the browser session. Everything is
// wrapped: storage can be unavailable (private mode), and then nothing breaks.
const KEY = 'un_offer_interest_v1';
const DISMISSED = 'un_offer_reminder_dismissed_v1';
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX = 5;

const readJson = (store, key, fallback) => {
  try { return JSON.parse(store.getItem(key) || '') ?? fallback; } catch { return fallback; }
};

export const recordOfferInterest = (promotionId, productId) => {
  if (!promotionId) return;
  try {
    const now = Date.now();
    const rest = readJson(localStorage, KEY, []).filter((e) => e.promotionId !== String(promotionId) && now - e.at < TTL_MS);
    localStorage.setItem(KEY, JSON.stringify([{ promotionId: String(promotionId), productId: productId || null, at: now }, ...rest].slice(0, MAX)));
  } catch { /* storage unavailable */ }
};

export const getOfferInterests = () => {
  const now = Date.now();
  return readJson(localStorage, KEY, []).filter((e) => e?.promotionId && now - e.at < TTL_MS);
};

export const forgetOfferInterest = (promotionId) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(readJson(localStorage, KEY, []).filter((e) => e.promotionId !== String(promotionId))));
  } catch { /* storage unavailable */ }
};

export const dismissOfferReminder = (promotionId) => {
  try {
    const set = new Set(readJson(sessionStorage, DISMISSED, []));
    set.add(String(promotionId));
    sessionStorage.setItem(DISMISSED, JSON.stringify([...set]));
  } catch { /* storage unavailable */ }
};

export const isOfferReminderDismissed = (promotionId) => readJson(sessionStorage, DISMISSED, []).includes(String(promotionId));

export const clearOfferReminderDismissals = () => {
  try { sessionStorage.removeItem(DISMISSED); } catch { /* storage unavailable */ }
};
