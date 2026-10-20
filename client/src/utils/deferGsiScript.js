/**
 * Google sign-in (accounts.google.com/gsi/client, ~100 KB) only after the visitor interacts.
 *
 * <GoogleOAuthProvider> (@react-oauth/google, wraps the whole app in main.jsx) appends that
 * script to <body> as soon as the app mounts, and has no option to wait. On a phone it then
 * shares the connection with the hero image (PageSpeed LCP). Nothing needs it before the
 * visitor does something: the login button lives in a modal they have to open, and One Tap
 * can appear a moment later.
 *
 * So, for that one script only, document.body.appendChild is held until the first
 * interaction or 8 s after load (window.__unThirdParty in index.html, same moment as the
 * analytics tags). The provider is told about the load as usual (onload), so the login
 * button / One Tap work exactly as before once it arrives. Every other appendChild is
 * untouched. Import this before the app renders.
 */
const GSI = 'https://accounts.google.com/gsi/client';

if (typeof window !== 'undefined' && typeof window.__unThirdParty === 'function' && document.body) {
  const body = document.body;
  const append = body.appendChild.bind(body);
  const remove = body.removeChild.bind(body);
  const held = new Set();

  body.appendChild = (node) => {
    if (node && node.tagName === 'SCRIPT' && String(node.src || '').startsWith(GSI)) {
      held.add(node);
      window.__unThirdParty(() => {
        if (held.delete(node)) append(node);
      });
      return node;
    }
    return append(node);
  };
  // The provider removes its script on unmount (and React StrictMode does that once in dev):
  // a script still waiting was never attached, so just forget it.
  body.removeChild = (node) => {
    if (held.delete(node)) return node;
    return remove(node);
  };
}
