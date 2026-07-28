/**
 * @module browserEnv
 * Detects the runtime browser environment.
 *
 * The critical case for UrbanNook: most traffic arrives from Instagram/Facebook
 * ads and the link-in-bio, which open inside an embedded in-app browser (WebView),
 * NOT Chrome/Safari. Inside these WebViews:
 *   - Google One Tap does not render (FedCM is unavailable).
 *   - Google OAuth is actively BLOCKED by Google (`disallowed_useragent`).
 * So we must never rely on Google login for that traffic — surface OTP login instead.
 */

/** True inside Instagram / Facebook / other embedded in-app browsers (WebViews). */
export function isInAppBrowser() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || '';
  return /Instagram|FBAN|FBAV|FB_IAB|Messenger|Line\/|WeChat|MicroMessenger|TikTok|Snapchat|Pinterest|GSA|Twitter/i.test(ua);
}

/** Specifically the Meta family (Instagram / Facebook / Messenger) WebView. */
export function isMetaInAppBrowser() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || '';
  return /Instagram|FBAN|FBAV|FB_IAB|Messenger/i.test(ua);
}

/** Google OAuth / One Tap only works in a real browser, not an embedded WebView. */
export function isGoogleAuthSupported() {
  return !isInAppBrowser();
}

/** True on Android devices. */
export function isAndroid() {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent || '');
}

/** True on iOS devices (iPhone/iPad/iPod; iPadOS 13+ masquerades as Mac). */
export function isIOS() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || '';
  return (
    /iPhone|iPad|iPod/i.test(ua) ||
    (/Macintosh/i.test(ua) && typeof document !== 'undefined' && 'ontouchend' in document)
  );
}

const IAB_REDIRECT_KEY = 'iab_redirect_attempted';

/**
 * Try to break OUT of an in-app WebView (Instagram/Facebook/etc) into the real browser.
 * ANDROID ONLY — hands the current page to Chrome via an `intent://` URL (with a
 * fallback to the same https URL if Chrome isn't installed). iOS cannot be
 * force-redirected (Apple blocks it) — surface <OpenInBrowserBanner/> there instead.
 *
 * Fires at most once per session unless `force` is set (for an explicit user tap).
 * Returns true if a redirect was attempted.
 *
 * @param {{force?: boolean}} [opts]
 */
export function escapeToExternalBrowser({ force = false } = {}) {
  if (typeof window === 'undefined') return false;
  if (!isInAppBrowser() || !isAndroid()) return false;

  const loc = window.location;
  const host = loc.host || '';
  // Skip on localhost/LAN/dev — the intent would just target localhost.
  if (/^(localhost|127\.|10\.|192\.168\.|\[::1\])/.test(host)) return false;

  try {
    if (!force && sessionStorage.getItem(IAB_REDIRECT_KEY)) return false;
    sessionStorage.setItem(IAB_REDIRECT_KEY, '1');
  } catch {
    /* sessionStorage unavailable — proceed anyway */
  }

  const target = `${host}${loc.pathname}${loc.search}${loc.hash}`;
  const fallback = encodeURIComponent(loc.href);
  // package=com.android.chrome forces Chrome; browser_fallback_url handles "Chrome not installed".
  const intentUrl = `intent://${target}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${fallback};end`;
  loc.href = intentUrl;
  return true;
}
