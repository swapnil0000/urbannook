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
