import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Restores scroll position on browser back/forward instead of every page
 * forcing itself to the top on mount. React Router remounts the destination
 * component on every navigation, including back/forward — every page used
 * to have its own unconditional `window.scrollTo(0, 0)` on mount, which
 * fired even when navigating BACK to a page, always resetting it to the top
 * and re-triggering scroll-in animations from scratch. That's what made
 * "going back" feel like the page reloaded/re-rendered.
 *
 * This centralizes the decision in one hook instead of 17 scattered
 * per-page effects: a genuinely new page visit (PUSH/REPLACE) starts at the
 * top; back/forward (POP) restores wherever that page was left scrolled to.
 *
 * The remembered positions live in a `useRef` Map scoped to this hook's own
 * call site (mount this once, near the router root — see App.jsx) rather
 * than a module-level variable, so the state is owned by a component
 * instance like any other React state, not shared mutable module scope.
 */
export function useScrollRestoration() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const scrollPositions = useRef(new Map());
  const prevPathnameRef = useRef(location.pathname);

  // Continuously record the scroll position under the CURRENT history
  // entry's key, so it's available to restore if the visitor comes back to
  // it via browser back/forward. Passive + no state update, so this can't
  // add jank to scrolling itself.
  useEffect(() => {
    const key = location.key;
    const onScroll = () => scrollPositions.current.set(key, window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [location.key]);

  // On arriving at a location: a back/forward (POP) navigation restores the
  // position it was left at (if any — e.g. the very first visit to a URL
  // via POP, such as a fresh tab restore, has none, and just starts at the
  // top); any other navigation (PUSH/REPLACE — following a link, clicking a
  // card) is a genuinely new page view and starts at the top regardless of
  // where the previous page was scrolled to. Retried a couple of times
  // shortly after mount since a data-fetching page (PDP, variant list) can
  // still be growing taller as its content loads in, which would otherwise
  // make an immediate restore land in the wrong place.
  //
  // One deliberate carve-out: the PDP's own variant picker calls
  // `navigate(..., { replace: true })` to update the URL's SKU segment
  // without leaving the page — the visitor is mid-interaction with the
  // gallery/variant pills right there, and this is not a new page view, so
  // jumping them to the top would be jarring. Must check BOTH the path
  // shape AND navigationType === 'REPLACE': path shape alone also matches
  // clicking a variant card in "Explore Other Variants" (same /product/:id
  // prefix, different sku) — but that's a plain `navigate()` (push) from
  // deep in the page, and the visitor DOES need to land at the top there to
  // even notice the page changed. navigationType alone isn't enough either,
  // since the order-confirmation redirect (PaymentProcessing) also uses
  // `replace: true` but IS a genuine new page that should start at the top.
  useEffect(() => {
    const prevPathname = prevPathnameRef.current;
    prevPathnameRef.current = location.pathname;

    const prevBase = prevPathname.split('/').slice(0, 3).join('/');
    const nextBase = location.pathname.split('/').slice(0, 3).join('/');
    const isSameProductDifferentVariant =
      navigationType === 'REPLACE' &&
      prevPathname.startsWith('/product/') &&
      location.pathname.startsWith('/product/') &&
      prevBase === nextBase;
    if (isSameProductDifferentVariant) return;
    // Version switch on the PDP (Wooden ↔ LED): a different product, but the
    // shopper is mid-decision in the buy box — keep them where they are.
    if (location.state?.keepScroll) return;

    const target = navigationType === 'POP' ? scrollPositions.current.get(location.key) || 0 : 0;
    window.scrollTo(0, target);
    const retries = [50, 250, 600].map((ms) =>
      setTimeout(() => {
        if (navigationType === 'POP') window.scrollTo(0, scrollPositions.current.get(location.key) || 0);
      }, ms),
    );
    return () => retries.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);
}
