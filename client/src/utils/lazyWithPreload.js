import { lazy } from 'react';

/**
 * React.lazy plus `.preload()`.
 *
 * Why: when a server-rendered page hydrates while its lazy chunk is still
 * downloading, any state update in that window (session restore, store sync)
 * makes React 19 drop the server HTML and show the Suspense fallback. On the
 * product page that collapsed the content for ~0.7 s and pulled the footer into
 * view — a 0.88 layout shift. main.jsx preloads the current route's chunks
 * before hydrateRoot, and once loaded the lazy factory returns a thenable that
 * resolves synchronously, so React renders the module without suspending.
 */
export function lazyWithPreload(factory) {
  let loaded = null;
  let pending = null;
  const load = () => {
    if (!pending) pending = factory().then((mod) => { loaded = mod; return mod; });
    return pending;
  };
  // A sync thenable: React's lazy initializer sees it resolve inside .then()
  // and uses the module right away instead of suspending.
  const Component = lazy(() => (loaded ? { then: (resolve) => resolve(loaded) } : load()));
  Component.preload = load;
  return Component;
}
