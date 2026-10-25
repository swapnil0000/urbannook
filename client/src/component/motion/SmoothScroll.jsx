import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scroll + motion provider.
 *
 * NOTE: Lenis smooth-scroll was intentionally removed — it added input latency that
 * felt like lag/delay while scrolling. We use NATIVE scroll now (instant, responsive).
 * All the scroll-triggered animations (reveals, stagger, parallax) work fine on native
 * scroll via IntersectionObserver / scroll position, so nothing visual is lost.
 *
 * This wrapper resets scroll to top on route change. The reduced-motion
 * setting lives in each animated page (<MotionRoot>, component/motion), so the
 * motion library isn't part of the main bundle.
 */
export default function SmoothScroll({ children }) {
  const { pathname, state } = useLocation();

  useEffect(() => {
    // PDP version switch (Wooden ↔ LED) asks to keep the scroll position.
    if (state?.keepScroll) return;
    window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return children;
}
