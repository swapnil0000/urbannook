import { useSyncExternalStore } from 'react';

/**
 * true once the page has finished loading (window `load` + an idle moment), false before
 * that and on the server.
 *
 * For things the first screen doesn't need — below-the-fold images on the home page,
 * the hover photo of product cards. Before this, they started downloading together with
 * the hero (LCP) image and the app's JS: on a slow phone Chrome fetches `loading="lazy"`
 * images up to ~2500px below the screen, so ~750 KB of photos shared the connection with
 * the one image that decides LCP.
 *
 * Server render and hydration both see `false` (getServerSnapshot), so the HTML matches;
 * the real value arrives right after. On later client-side navigations the page is already
 * loaded, so images render at once.
 */
let loaded = false;
const listeners = new Set();

if (typeof window !== 'undefined') {
  const done = () => {
    loaded = true;
    listeners.forEach((fn) => fn());
  };
  const whenIdle = () => (window.requestIdleCallback || ((cb) => setTimeout(cb, 200)))(done, { timeout: 2000 });
  if (document.readyState === 'complete') whenIdle();
  else window.addEventListener('load', whenIdle, { once: true });
}

const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const useAfterLoad = () => useSyncExternalStore(subscribe, () => loaded, () => false);

/** A mouse / trackpad that can hover. Phones can't, so they never need hover-only images. */
export const canHover = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
