/**
 * @module analytics
 * Centralized event tracking for UrbanNook.
 *
 *   App code  →  window.dataLayer.push(...)  →  GTM (GTM-WHPFSBBG)  →  GA4 (G-B7NGCFCRFG) + Meta Pixel
 *
 * Notes for whoever maintains this:
 * - GA4 ecommerce events follow the GA4 recommended schema (snake_case, INR).
 * - Every ecommerce push first clears the previous `ecommerce` object
 *   (GA4 best practice) so stale items[] never leak between events and inflate data.
 * - Everything is gated by config.features.enableAnalytics and wrapped in try/catch
 *   so a tracking failure can never break the UI.
 * - Nothing here sends raw PII (email/phone) to GA4. Hashing for Meta CAPI happens server-side.
 */

import config from '../config/env';

const CURRENCY = 'INR';
const ATTRIBUTION_KEY = 'un_attribution'; // first-touch utm / click-ids, persisted

/* ---------------------------------------------------------------------------
 * Low-level helpers
 * ------------------------------------------------------------------------ */

function enabled() {
  return typeof window !== 'undefined' && config.features.enableAnalytics;
}

// Debug logging: ON automatically on localhost, or when VITE_ANALYTICS_DEBUG=true.
// Logs every event to the browser console and tags GA4 events with debug_mode
// so they show up live in GA4 → DebugView. Never active on the real domain.
const IS_LOCAL = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
function isDebug() {
  return IS_LOCAL || config.features.analyticsDebug;
}

/** Push any object onto the GTM dataLayer. */
function pushEvent(eventData) {
  if (!enabled()) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(eventData);
}

/**
 * Send an event straight to GA4 via the on-page Google tag (gtag.js, G-B7NGCFCRFG).
 * THIS is what delivers events to GA4 today — no GTM tags required.
 * The dataLayer pushes are kept alongside so we can move to GTM later with zero code changes.
 */
function sendGtag(eventName, params = {}) {
  if (!enabled()) {
    if (isDebug()) console.warn(`%c⚠️ Analytics OFF → ${eventName} (set VITE_ENABLE_ANALYTICS=true)`, 'color:#D98A5B', params);
    return;
  }
  if (typeof window.gtag !== 'function') {
    if (isDebug()) console.warn(`[Analytics] gtag not loaded — GA4 event skipped: ${eventName}`);
    return;
  }
  const payload = isDebug() ? { ...params, debug_mode: true } : params;
  if (isDebug()) console.log(`%c📊 GA4 → ${eventName}`, 'color:#C6A053;font-weight:bold', payload);
  window.gtag('event', eventName, payload);
}

/**
 * GA4 best practice: clear the previous `ecommerce` object before each new
 * ecommerce event, otherwise items[] from the prior event leak into this one.
 */
export function clearEcommerce() {
  if (!enabled()) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ ecommerce: null });
}

/** Push a GA4 ecommerce event with a guaranteed-clean ecommerce object. */
function pushEcommerce(eventName, ecommerce) {
  clearEcommerce();
  pushEvent({ event: eventName, ecommerce });   // for future GTM (currently inert)
  sendGtag(eventName, ecommerce);                // direct to GA4 via gtag — this one counts today
  recordEvent(eventName, ecommerce);             // our own DB
}

/** Send an event to the Meta Pixel (fbq). Silently skips if not loaded. */
function pushPixelEvent(eventName, params = {}, options) {
  if (!enabled()) return;
  if (typeof window.fbq !== 'function') {
    if (isDebug()) console.warn('[Analytics] fbq not loaded, Meta event skipped:', eventName);
    return;
  }
  if (isDebug()) console.log(`%c📘 Meta → ${eventName}`, 'color:#7e9cc9;font-weight:bold', { params, options });
  // Meta deduplication: eventID MUST be the 4th argument, never inside params.
  if (options && options.eventID) {
    window.fbq('track', eventName, params, { eventID: options.eventID });
  } else {
    window.fbq('track', eventName, params);
  }
}

/** Map an app product shape → GA4 item. Omits empty/placeholder fields. */
function toItem({ itemId, itemName, itemVariant, price, quantity, index, listId, listName } = {}) {
  const item = { item_id: itemId, item_name: itemName };
  if (itemVariant && itemVariant !== 'N/A') item.item_variant = itemVariant;
  if (price != null) item.price = price;
  if (quantity != null) item.quantity = quantity;
  if (index != null) item.index = index;
  if (listId) item.item_list_id = listId;
  if (listName) item.item_list_name = listName;
  return item;
}
const ANON_KEY = 'un_anon_id';            
const SESSION_KEY = 'un_session';         
const SESSION_TTL = 30 * 60 * 1000;       
const FLUSH_INTERVAL = 5000;              
const MAX_QUEUE = 15;           

let _eventQueue = [];
let _flushTimer = null;
let _currentUserId = null;                // set by setUserId(); attached to events

/** RFC4122-ish id without a dependency. */
function uuid() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch { /* fall through */ }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Persistent per-device id — set once, survives login/logout (enables stitching). */
function getAnonymousId() {
  if (typeof window === 'undefined') return null;
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) { id = uuid(); localStorage.setItem(ANON_KEY, id); }
    return id;
  } catch { return null; }
}

/** Session id with a 30-min sliding inactivity window. */
function getSessionId() {
  if (typeof window === 'undefined') return null;
  try {
    const now = Date.now();
    const raw = localStorage.getItem(SESSION_KEY);
    let session = raw ? JSON.parse(raw) : null;
    if (!session || !session.id || (now - session.ts) > SESSION_TTL) {
      session = { id: uuid(), ts: now };
    } else {
      session.ts = now; // refresh activity
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session.id;
  } catch { return null; }
}

/** POST the current queue to our backend. keepalive=true for the final unload flush. */
function flushEvents(useKeepalive = false) {
  if (!_eventQueue.length) return;
  const batch = _eventQueue.splice(0, _eventQueue.length);
  try {
    fetch(`${config.apiBaseUrl}/events/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: batch }),
      keepalive: useKeepalive,
    }).catch(() => { /* analytics must never throw */ });
  } catch { /* ignore */ }
}

function scheduleFlush() {
  if (_flushTimer) return;
  _flushTimer = setTimeout(() => { _flushTimer = null; flushEvents(); }, FLUSH_INTERVAL);
}

/** Queue one event for our own backend (batched). Called by the 3 choke points. */
function recordEvent(eventName, properties = {}) {
  if (!enabled() || typeof window === 'undefined') return;
  try {
    _eventQueue.push({
      eventName,
      userId: _currentUserId || undefined,
      anonymousId: getAnonymousId(),
      sessionId: getSessionId(),
      properties,
      url: window.location.href,
      path: window.location.pathname,
      referrer: document.referrer || undefined,
      attribution: getAttribution(),
      timestamp: Date.now(),
    });
    if (_eventQueue.length >= MAX_QUEUE) flushEvents();
    else scheduleFlush();
  } catch (error) {
    if (isDebug()) console.warn('[Analytics] recordEvent:', error);
  }
}

// Final best-effort flush so the last events of a session aren't lost.
if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushEvents(true);
  });
  window.addEventListener('pagehide', () => flushEvents(true));
}

/** Generic custom (non-ecommerce) event. */
export function track(eventName, params = {}) {
  try {
    pushEvent({ event: eventName, ...params });  // for future GTM
    sendGtag(eventName, params);                  // direct to GA4 now
    recordEvent(eventName, params);               // our own DB
  } catch (error) {
    console.warn('[Analytics]', eventName, error);
  }
}

/* ---------------------------------------------------------------------------
 * Identity & attribution
 * ------------------------------------------------------------------------ */

/** Associate the current user with all subsequent events (GA4 user_id). */
export function setUserId(userId) {
  if (!userId) return;
  _currentUserId = String(userId); // attach to all subsequent first-party events
  try {
    pushEvent({ event: 'set_user_id', user_id: String(userId) });
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('set', { user_id: String(userId) }); // applies to all later GA4 events
    }
  } catch (error) {
    console.warn('[Analytics] setUserId:', error);
  }
}

/**
 * Manual Advanced Matching — pass a logged-in user's identity to the Meta Pixel so
 * EVERY browser event carries email/phone/name (Meta normalizes + hashes client-side
 * before sending). Biggest EMQ lever for logged-in sessions. Call on login + session restore.
 * Note (DPDP): ideally gate behind marketing consent.
 */
export function setMetaAdvancedMatching({ email, phone, firstName, lastName, userId } = {}) {
  if (!enabled()) return;
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
  const pixelId = config.metaPixelId;
  if (!pixelId) return;
  try {
    const userData = {};
    if (email) userData.em = String(email).trim().toLowerCase();
    if (phone) userData.ph = String(phone).replace(/\D/g, '');
    if (firstName) userData.fn = String(firstName).trim().toLowerCase();
    if (lastName) userData.ln = String(lastName).trim().toLowerCase();
    if (userId) userData.external_id = String(userId);
    if (Object.keys(userData).length === 0) return;
    // Re-init with advanced matching data — Meta merges it for subsequent events (no extra PageView).
    window.fbq('init', pixelId, userData);
    if (isDebug()) console.log('%c📘 Meta Advanced Matching set', 'color:#7e9cc9;font-weight:bold', Object.keys(userData));
  } catch (error) {
    console.warn('[Analytics] setMetaAdvancedMatching:', error);
  }
}

/**
 * Capture first-touch marketing attribution (utm_*, gclid, fbclid, referrer).
 * MUST run before the first page_view — in an SPA the landing query string is
 * wiped on the first client-side route change. Idempotent: only the first visit is stored.
 */
export function captureAttribution() {
  if (typeof window === 'undefined') return null;
  try {
    const existing = localStorage.getItem(ATTRIBUTION_KEY);
    if (existing) return JSON.parse(existing);

    const p = new URLSearchParams(window.location.search);
    const attribution = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach((k) => {
      const v = p.get(k);
      if (v) attribution[k] = v;
    });
    const gclid = p.get('gclid');
    if (gclid) attribution.gclid = gclid;
    const fbclid = p.get('fbclid');
    if (fbclid) attribution.fbclid = fbclid;
    const ref = document.referrer;
    if (ref && !ref.includes(window.location.hostname)) attribution.landing_referrer = ref;
    attribution.landing_page = window.location.pathname;

    localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
    return attribution;
  } catch (error) {
    console.warn('[Analytics] captureAttribution:', error);
    return null;
  }
}

function getAttribution() {
  try {
    const stored = localStorage.getItem(ATTRIBUTION_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Read Meta's `_fbp` / `_fbc` cookies (and synthesize `_fbc` from a `fbclid` in the
 * URL / stored attribution if the cookie is absent). Pass these to the server at
 * checkout so the Conversions API can include them — the single biggest
 * match-quality (EMQ) lever for server-side events.
 */
export function getFbCookies() {
  if (typeof document === 'undefined') return {};
  try {
    const read = (name) => {
      const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
      return m ? decodeURIComponent(m[1]) : null;
    };
    const fbp = read('_fbp');
    let fbc = read('_fbc');
    if (!fbc) {
      const fbclid = new URLSearchParams(window.location.search).get('fbclid') || getAttribution().fbclid;
      if (fbclid) fbc = `fb.1.${Date.now()}.${fbclid}`;
    }
    const out = {};
    if (fbp) out.fbp = fbp;
    if (fbc) out.fbc = fbc;
    return out;
  } catch {
    return {};
  }
}

/* ---------------------------------------------------------------------------
 * Page / navigation  (React Router does NOT auto-fire pageviews in an SPA)
 * ------------------------------------------------------------------------ */

export function trackPageView({ pagePath, pageTitle } = {}) {
  try {
    captureAttribution(); // lock first-touch before any navigation wipes the query string
    const params = {
      page_location: typeof window !== 'undefined' ? window.location.href : '',
      page_title: pageTitle || (typeof document !== 'undefined' ? document.title : ''),
      page_path: pagePath || (typeof window !== 'undefined' ? window.location.pathname : ''),
      ...getAttribution(),
    };
    pushEvent({ event: 'page_view', ...params }); // for future GTM
    sendGtag('page_view', params);                 // direct to GA4 now
    pushPixelEvent('PageView');                     // Meta PageView on SPA navigation
    recordEvent('page_view', params);               // our own DB
  } catch (error) {
    console.warn('[Analytics] trackPageView:', error);
  }
}

/* ---------------------------------------------------------------------------
 * Product discovery & consideration
 * ------------------------------------------------------------------------ */

export function trackViewItemList({ items = [], listId, listName }) {
  try {
    pushEcommerce('view_item_list', {
      item_list_id: listId,
      item_list_name: listName,
      items: items.map((it, index) => toItem({ ...it, index })),
    });
  } catch (error) {
    console.warn('[Analytics] trackViewItemList:', error);
  }
}

export function trackSelectItem({ itemId, itemName, itemVariant, price, listId, listName, index }) {
  try {
    pushEcommerce('select_item', {
      item_list_id: listId,
      item_list_name: listName,
      items: [toItem({ itemId, itemName, itemVariant, price, index })],
    });
  } catch (error) {
    console.warn('[Analytics] trackSelectItem:', error);
  }
}

export function trackViewItem({ itemId, itemName, itemVariant, price, quantity = 1 }) {
  try {
    pushEcommerce('view_item', {
      currency: CURRENCY,
      value: price,
      items: [toItem({ itemId, itemName, itemVariant, price, quantity })],
    });
    pushPixelEvent('ViewContent', { content_ids: [itemId], content_name: itemName, content_type: 'product', value: price, currency: CURRENCY });
  } catch (error) {
    console.warn('[Analytics] trackViewItem:', error);
  }
}

export function trackAddToWishlist({ itemId, itemName, itemVariant, price }) {
  try {
    pushEcommerce('add_to_wishlist', {
      currency: CURRENCY,
      value: price,
      items: [toItem({ itemId, itemName, itemVariant, price })],
    });
    pushPixelEvent('AddToWishlist', { content_ids: [itemId], content_name: itemName, value: price, currency: CURRENCY });
  } catch (error) {
    console.warn('[Analytics] trackAddToWishlist:', error);
  }
}

export function trackRemoveFromWishlist({ itemId, itemName, price }) {
  try {
    track('remove_from_wishlist', { item_id: itemId, item_name: itemName, price });
  } catch (error) {
    console.warn('[Analytics] trackRemoveFromWishlist:', error);
  }
}

/** Back-in-stock signup on an out-of-stock PDP. Email goes to the backend, NOT to GA4. */
export function trackNotifyMe({ itemId, itemVariant }) {
  try {
    track('notify_me', { item_id: itemId, item_variant: itemVariant, has_email: true });
  } catch (error) {
    console.warn('[Analytics] trackNotifyMe:', error);
  }
}

/* ---------------------------------------------------------------------------
 * Cart
 * ------------------------------------------------------------------------ */

export function trackAddToCart({ itemId, itemName, itemVariant, price, quantity = 1, placement }) {
  try {
    pushEcommerce('add_to_cart', {
      currency: CURRENCY,
      value: price * quantity,
      ...(placement ? { placement } : {}),
      items: [toItem({ itemId, itemName, itemVariant, price, quantity })],
    });
    pushPixelEvent('AddToCart', { content_ids: [itemId], contents: [{ id: itemId, quantity }], content_name: itemName, content_type: 'product', value: price * quantity, currency: CURRENCY });
  } catch (error) {
    console.warn('[Analytics] trackAddToCart:', error);
  }
}

export function trackRemoveFromCart({ itemId, itemName, itemVariant, price, quantity = 1 }) {
  try {
    pushEcommerce('remove_from_cart', {
      currency: CURRENCY,
      value: price * quantity,
      items: [toItem({ itemId, itemName, itemVariant, price, quantity })],
    });
  } catch (error) {
    console.warn('[Analytics] trackRemoveFromCart:', error);
  }
}

export function trackViewCart({ items = [], value }) {
  try {
    pushEcommerce('view_cart', {
      currency: CURRENCY,
      value,
      items: items.map((it) => toItem(it)),
    });
  } catch (error) {
    console.warn('[Analytics] trackViewCart:', error);
  }
}

/* ---------------------------------------------------------------------------
 * Checkout
 * ------------------------------------------------------------------------ */

export function trackBeginCheckout({ items = [], value, coupon, isGuest }) {
  try {
    pushEcommerce('begin_checkout', {
      currency: CURRENCY,
      value,
      ...(coupon ? { coupon } : {}),
      ...(isGuest != null ? { is_guest: isGuest } : {}),
      items: items.map((it) => toItem(it)),
    });
    pushPixelEvent('InitiateCheckout', { content_ids: items.map((i) => i.itemId), contents: items.map((i) => ({ id: i.itemId, quantity: i.quantity || 1 })), value, currency: CURRENCY, num_items: items.reduce((n, i) => n + (i.quantity || 1), 0) });
  } catch (error) {
    console.warn('[Analytics] trackBeginCheckout:', error);
  }
}

export function trackAddShippingInfo({ items = [], value, shipping, pincode, step, isGuest }) {
  try {
    pushEcommerce('add_shipping_info', {
      currency: CURRENCY,
      value,
      ...(shipping != null ? { shipping } : {}),
      ...(pincode ? { pincode } : {}),
      ...(step ? { step } : {}),
      ...(isGuest != null ? { is_guest: isGuest } : {}),
      items: items.map((it) => toItem(it)),
    });
  } catch (error) {
    console.warn('[Analytics] trackAddShippingInfo:', error);
  }
}

export function trackAddPaymentInfo({ items = [], value, paymentMethod, eventId, isGuest }) {
  try {
    pushEcommerce('add_payment_info', {
      currency: CURRENCY,
      value,
      ...(paymentMethod ? { payment_type: paymentMethod } : {}),
      ...(eventId ? { event_id: eventId } : {}),
      ...(isGuest != null ? { is_guest: isGuest } : {}),
      items: items.map((it) => toItem(it)),
    });
    pushPixelEvent('AddPaymentInfo', { content_ids: items.map((i) => i.itemId), value, currency: CURRENCY });
  } catch (error) {
    console.warn('[Analytics] trackAddPaymentInfo:', error);
  }
}

export function trackCheckoutStep({ step, stepLabel, isGuest }) {
  try {
    track('checkout_step_completed', { step, step_label: stepLabel, ...(isGuest != null ? { is_guest: isGuest } : {}) });
  } catch (error) {
    console.warn('[Analytics] trackCheckoutStep:', error);
  }
}

export function trackSelectPaymentMethod({ paymentMethod }) {
  try {
    track('select_payment_method', { payment_method: paymentMethod });
  } catch (error) {
    console.warn('[Analytics] trackSelectPaymentMethod:', error);
  }
}

export function trackApplyCoupon({ coupon, discount, status = 'success', errorType }) {
  try {
    track('apply_coupon', { coupon, discount, status, ...(errorType ? { error_type: errorType } : {}) });
  } catch (error) {
    console.warn('[Analytics] trackApplyCoupon:', error);
  }
}

export function trackRemoveCoupon({ coupon }) {
  try {
    track('remove_coupon', { coupon });
  } catch (error) {
    console.warn('[Analytics] trackRemoveCoupon:', error);
  }
}

export function trackPaymentModalDismissed({ orderId, value }) {
  try {
    track('payment_modal_dismissed', { order_id: orderId, value });
  } catch (error) {
    console.warn('[Analytics] trackPaymentModalDismissed:', error);
  }
}

export function trackPaymentFailed({ errorCode, errorDescription, paymentMethod, value, orderId }) {
  try {
    track('payment_failed', {
      error_code: errorCode,
      error_description: (errorDescription || '').slice(0, 100),
      payment_method: paymentMethod,
      value,
      order_id: orderId,
    });
  } catch (error) {
    console.warn('[Analytics] trackPaymentFailed:', error);
  }
}

export function trackOrderCreated({ orderId, userType, paymentMethod }) {
  try {
    track('order_created', { order_id: orderId, user_type: userType, payment_method: paymentMethod });
  } catch (error) {
    console.warn('[Analytics] trackOrderCreated:', error);
  }
}

/* ---------------------------------------------------------------------------
 * Purchase  (client = Meta/consent signal; canonical GA4 purchase fires server-side)
 * ------------------------------------------------------------------------ */

export function trackPurchase({ transactionId, value, shipping = 0, tax = 0, coupon, items = [], paymentMethod, eventId }) {
  try {
    pushEcommerce('purchase', {
      transaction_id: transactionId,
      value,
      currency: CURRENCY,
      shipping,
      tax,
      ...(coupon ? { coupon } : {}),
      ...(paymentMethod ? { payment_method: paymentMethod } : {}),
      ...(eventId ? { event_id: eventId } : {}),
      items: items.map((it) => toItem(it)),
    });
    pushPixelEvent(
      'Purchase',
      {
        content_ids: items.map((i) => i.itemId),
        contents: items.map((i) => ({ id: i.itemId, quantity: i.quantity || 1 })),
        content_type: 'product',
        value,
        currency: CURRENCY,
        num_items: items.reduce((n, i) => n + (i.quantity || 1), 0),
      },
      eventId ? { eventID: eventId } : undefined, // dedup key = orderId (4th arg)
    );
  } catch (error) {
    console.warn('[Analytics] trackPurchase:', error);
  }
}

export function trackRefund({ transactionId, value, items = [] }) {
  try {
    pushEcommerce('refund', {
      transaction_id: transactionId,
      value,
      currency: CURRENCY,
      ...(items.length ? { items: items.map((it) => toItem(it)) } : {}),
    });
  } catch (error) {
    console.warn('[Analytics] trackRefund:', error);
  }
}

/* ---------------------------------------------------------------------------
 * Auth & identity events
 * ------------------------------------------------------------------------ */

export function trackLogin({ method, userId, isNewUser, email, phone, name }) {
  try {
    setUserId(userId);
    setMetaAdvancedMatching({ email, phone, firstName: name ? name.split(' ')[0] : undefined, lastName: name ? name.split(' ').slice(1).join(' ') : undefined, userId });
    track('login', { method, ...(userId ? { user_id: String(userId) } : {}), ...(isNewUser != null ? { is_new_user: isNewUser } : {}) });
  } catch (error) {
    console.warn('[Analytics] trackLogin:', error);
  }
}

export function trackSignUp({ method, userId, mobileProvided, email, phone, name }) {
  try {
    setUserId(userId);
    setMetaAdvancedMatching({ email, phone, firstName: name ? name.split(' ')[0] : undefined, lastName: name ? name.split(' ').slice(1).join(' ') : undefined, userId });
    track('sign_up', { method, ...(userId ? { user_id: String(userId) } : {}), ...(mobileProvided != null ? { mobile_provided: mobileProvided } : {}) });
    pushPixelEvent('CompleteRegistration', { method });
  } catch (error) {
    console.warn('[Analytics] trackSignUp:', error);
  }
}

export function trackLoginFailed({ method, errorCode }) {
  try {
    track('login_failed', { method, error_code: errorCode });
  } catch (error) {
    console.warn('[Analytics] trackLoginFailed:', error);
  }
}

export function trackLogout({ userId }) {
  try {
    track('logout', { ...(userId ? { user_id: String(userId) } : {}) });
  } catch (error) {
    console.warn('[Analytics] trackLogout:', error);
  }
}

/* ---------------------------------------------------------------------------
 * Engagement, leads, search, promotions, errors
 * ------------------------------------------------------------------------ */

export function trackSearch({ searchTerm }) {
  try {
    track('search', { search_term: searchTerm });
    pushPixelEvent('Search', { search_string: searchTerm });
  } catch (error) {
    console.warn('[Analytics] trackSearch:', error);
  }
}

export function trackViewSearchResults({ searchTerm, resultsCount, sortBy }) {
  try {
    track('view_search_results', { search_term: searchTerm, results_count: resultsCount, ...(sortBy ? { sort_by: sortBy } : {}) });
  } catch (error) {
    console.warn('[Analytics] trackViewSearchResults:', error);
  }
}

export function trackGenerateLead({ leadType, formName, contactMethod, source }) {
  try {
    track('generate_lead', { lead_type: leadType, form_name: formName, contact_method: contactMethod, source });
    pushPixelEvent('Lead', { content_name: formName, content_category: leadType });
  } catch (error) {
    console.warn('[Analytics] trackGenerateLead:', error);
  }
}

export function trackViewPromotion({ promotionId, promotionName, creativeSlot }) {
  try {
    pushEcommerce('view_promotion', { promotion_id: promotionId, promotion_name: promotionName, creative_slot: creativeSlot });
  } catch (error) {
    console.warn('[Analytics] trackViewPromotion:', error);
  }
}

export function trackSelectPromotion({ promotionId, promotionName, creativeSlot, ctaText }) {
  try {
    pushEcommerce('select_promotion', { promotion_id: promotionId, promotion_name: promotionName, creative_slot: creativeSlot, ...(ctaText ? { cta_text: ctaText } : {}) });
  } catch (error) {
    console.warn('[Analytics] trackSelectPromotion:', error);
  }
}

export function trackShare({ contentType, itemId, method }) {
  try {
    track('share', { content_type: contentType, item_id: itemId, method });
  } catch (error) {
    console.warn('[Analytics] trackShare:', error);
  }
}

/** Crash / chunk-load / fatal fetch error. Scrubbed + truncated; never include PII. */
export function trackException({ description, errorType, fatal = false }) {
  try {
    track('exception', { description: (description || '').slice(0, 100), error_type: errorType, fatal });
  } catch (error) {
    console.warn('[Analytics] trackException:', error);
  }
}
