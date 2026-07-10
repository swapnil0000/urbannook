import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { MotionConfig } from "motion/react";

/**
 * Scroll + motion provider.
 *
 * NOTE: Lenis smooth-scroll was intentionally removed — it added input latency that
 * felt like lag/delay while scrolling. We use NATIVE scroll now (instant, responsive).
 * All the scroll-triggered animations (reveals, stagger, parallax) work fine on native
 * scroll via IntersectionObserver / scroll position, so nothing visual is lost.
 *
 * This wrapper still:
 *  - resets scroll to top on route change, and
 *  - applies MotionConfig so every animation respects prefers-reduced-motion.
 */
export default function SmoothScroll({ children }) {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
