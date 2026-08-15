/**
 * Independence Day offer — campaign config + the small amount of state the
 * popup has to remember between visits.
 *
 * Mirrors server/src/config/independenceOffer.config.js. The server is the
 * authority on the actual coupon terms (it reads the live coupon document and
 * returns them on claim); the values here are what we render *before* the
 * visitor submits, so keep the code and percentage in sync with the server.
 */
import { captureAttribution } from '../utils/analytics';
import { getApiUrl } from './appUrls';

const env = import.meta.env;

export const INDEPENDENCE_OFFER = {
  campaignId: 'INDEPENDENCE_DAY_2026',

  // LAST-RESORT FALLBACKS ONLY. The live terms come from GET /offer/campaign,
  // which reads the coupon document, so renaming or re-pricing the coupon in
  // the admin panel reflects here without a rebuild. These values are used only
  // if that request fails. Do not treat them as the source of truth.
  code: (env.VITE_INDEPENDENCE_COUPON_CODE || 'UNFREEDOM80').toUpperCase(),
  discountType: 'FLAT',
  discountValue: 80,
  maxDiscount: null,
  minCartValue: 499,
  startsAt: env.VITE_INDEPENDENCE_STARTS_AT || '2026-08-14T00:00:00+05:30',

  endsAt: env.VITE_INDEPENDENCE_ENDS_AT || '2026-08-15T23:59:59+05:30',

  openDelayMs: 2500,
};


const SUPPRESSED_PREFIXES = [
  '/checkout',
  '/payment-processing',
  '/payment-failed',
  '/order-confirm',
];

export function isSuppressedPath(pathname = '') {
  return SUPPRESSED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/* ---------------------------------------------------------------------------
 * Live terms from the server
 *
 * The coupon's code, amount and minimum are all editable in the admin panel, so
 * the storefront asks for them rather than shipping them in the bundle. Cached
 * in a module-level promise so the popup and the checkout banner share a single
 * request per page load.
 * ------------------------------------------------------------------------ */

const CONFIG_FALLBACK = {
  couponCode: INDEPENDENCE_OFFER.code,
  discountType: INDEPENDENCE_OFFER.discountType,
  discountValue: INDEPENDENCE_OFFER.discountValue,
  maxDiscount: INDEPENDENCE_OFFER.maxDiscount,
  minCartValue: INDEPENDENCE_OFFER.minCartValue,
  // Unknown rather than false: a failed request must not silently hide a live
  // offer, so we let the campaign dates decide instead.
  available: true,
  // Assume it IS listed when we cannot tell. Being quiet costs one promo strip;
  // guessing wrong the other way prints the same offer on screen twice.
  isListed: true,
  fromServer: false,
};

let termsPromise = null;

export function fetchCampaignTerms() {
  if (!termsPromise) {
    termsPromise = fetch(`${getApiUrl()}/offer/campaign`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body) =>
        body?.success && body.data
          ? { ...CONFIG_FALLBACK, ...body.data, fromServer: true }
          : CONFIG_FALLBACK,
      )
      .catch(() => CONFIG_FALLBACK);
  }
  return termsPromise;
}

/** Test/debug helper — drops the cached response so the next call refetches. */
export function resetCampaignTermsCache() {
  termsPromise = null;
}

export { CONFIG_FALLBACK };

/* ---------------------------------------------------------------------------
 * Copy derived from the offer terms
 *
 * Every discount phrase in the popup runs through these, so swapping the
 * campaign to a different coupon changes the wording everywhere at once
 * instead of leaving "10% OFF" stranded on a flat-₹ coupon.
 * ------------------------------------------------------------------------ */

/** "₹100" or "10" + "%" — the bare amount, for sentences. */
export function offerAmountLabel(offer = INDEPENDENCE_OFFER) {
  return offer.discountType === 'FLAT'
    ? `₹${offer.discountValue}`
    : `${offer.discountValue}%`;
}

/** The material condition attached to the offer, or the absence of one. */
export function offerConditionLabel(offer = INDEPENDENCE_OFFER) {
  if (offer.minCartValue > 0) {
    return `on orders above ₹${Number(offer.minCartValue).toLocaleString('en-IN')}`;
  }
  return 'on everything in the store';
}

/* ---------------------------------------------------------------------------
 * Persisted state
 * ------------------------------------------------------------------------ */

const STORAGE_KEY = 'un_independence_offer_v1';

// In-app browsers and private mode can throw on localStorage access. Falling
// back to module memory keeps behaviour sane for the rest of the session
// instead of re-opening the popup on every route change.
let memoryState = null;

/** @returns {{status: 'dismissed'|'claimed', code?: string, at?: string}|null} */
export function readOfferState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* storage unavailable — fall through to memory */
  }
  return memoryState;
}

export function writeOfferState(next) {
  memoryState = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* memory copy above is the fallback */
  }
  return next;
}

export const markDismissed = () =>
  writeOfferState({ status: 'dismissed', at: new Date().toISOString() });

// The mobile is kept alongside the claim so checkout does not ask a visitor for
// a number they already typed into the popup a moment earlier. Same browser,
// same person, same session — asking twice is what makes people abandon.
export const markClaimed = (code, mobile) =>
  writeOfferState({
    status: 'claimed',
    code,
    ...(mobile ? { mobile } : {}),
    at: new Date().toISOString(),
  });

/**
 * The mobile number the visitor gave the popup, for prefilling checkout.
 * Re-validated on read: storage is user-editable and this feeds an order.
 *
 * @returns {string} a valid 10-digit Indian mobile, or '' if there isn't one
 */
export function getClaimedMobile() {
  const stored = readOfferState()?.mobile;
  return /^[6-9]\d{9}$/.test(stored || '') ? stored : '';
}

/* ---------------------------------------------------------------------------
 * Offer window
 * ------------------------------------------------------------------------ */

export function isOfferLive(now = new Date()) {
  const start = new Date(INDEPENDENCE_OFFER.startsAt);
  const end = new Date(INDEPENDENCE_OFFER.endsAt);
  return now >= start && now <= end;
}

/* ---------------------------------------------------------------------------
 * Where did this visitor come from?
 * ------------------------------------------------------------------------ */

const IN_APP_BROWSER_RE = /Instagram|FBAN|FBAV|TikTok|Line|WeChat/i;

export function isInAppBrowser() {
  if (typeof navigator === 'undefined') return false;
  return IN_APP_BROWSER_RE.test(navigator.userAgent || navigator.vendor || '');
}

/**
 * Coarse source bucket stored alongside the lead, so an Instagram-ad signup and
 * an organic one are tellable apart when this list is exported for retargeting.
 *
 * Checked in order of confidence: a tagged campaign URL beats a webview
 * user-agent, which beats a referrer, which beats a guess.
 */
export function detectVisitorSource() {
  try {
    const attribution = captureAttribution() || {};
    const utm = (attribution.utm_source || '').toLowerCase();

    if (utm) {
      if (utm.includes('insta') || utm === 'ig') return 'instagram';
      if (utm.includes('face') || utm === 'fb' || utm === 'meta') return 'facebook';
      if (utm.includes('google') || utm === 'adwords') return 'google';
      if (utm.includes('whatsapp')) return 'whatsapp';
      return utm.slice(0, 40);
    }

    // Instagram bio taps open inside Instagram's own webview — no UTM, but the
    // user agent is unambiguous.
    const ua = navigator.userAgent || navigator.vendor || '';
    if (/Instagram/i.test(ua)) return 'instagram';
    if (/FBAN|FBAV/i.test(ua)) return 'facebook';

    // Meta ad click that opened in the real browser instead.
    if (attribution.fbclid) return 'facebook';
    if (attribution.gclid) return 'google';

    const referrer = attribution.landing_referrer || '';
    if (referrer) {
      if (/instagram\.com/i.test(referrer)) return 'instagram';
      if (/facebook\.com|fb\.me/i.test(referrer)) return 'facebook';
      if (/google\./i.test(referrer)) return 'google';
      if (/whatsapp/i.test(referrer)) return 'whatsapp';
      return 'referral';
    }

    return 'direct';
  } catch {
    return 'direct';
  }
}

/** First-touch attribution in the shape the claim endpoint accepts. */
export function getAttributionPayload() {
  try {
    return captureAttribution() || {};
  } catch {
    return {};
  }
}
