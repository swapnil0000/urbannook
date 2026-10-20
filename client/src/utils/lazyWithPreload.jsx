import { lazy, useState } from 'react';

/**
 * React.lazy() that can be loaded ahead of time, and renders without suspending once loaded.
 *
 * Why: server-rendered pages hydrate in the browser. If a lazy page / layout chunk is still
 * downloading while anything above it updates (cart sync, login restore, an animation
 * engine loading…), React throws away that part of the server HTML and shows the Suspense
 * fallback until the chunk arrives. On product pages that blanked the whole page for
 * ~300 ms and pushed the footer up and down: CLS 1.77 on PageSpeed.
 *
 * main.jsx calls preloadForPath() before hydrateRoot, so the current page's chunk is
 * already here and the component renders directly — no Suspense, no fallback, no shift.
 * Everywhere else it behaves like React.lazy.
 */
export function lazyWithPreload(load) {
  let Loaded = null;
  let promise = null;
  const preload = () => {
    promise ||= load().then((mod) => {
      Loaded = mod.default;
      return mod;
    });
    return promise;
  };
  const Lazy = lazy(preload);
  function Component(props) {
    // Chosen once per mount: switching from <Lazy> to <Loaded> later would be a different
    // element type and remount the page (losing its state).
    const [Impl] = useState(() => Loaded || Lazy);
    return <Impl {...props} />;
  }
  Component.preload = preload;
  return Component;
}
