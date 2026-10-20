import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { LazyMotion, MotionConfig } from "motion/react";

// Motion's animation engine, fetched as its own chunk (see component/motion/index.jsx).
const loadFeatures = () => import("./features.js").then((mod) => mod.default);

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
 *  - applies MotionConfig so every animation respects prefers-reduced-motion, and
 *  - loads Motion's animation engine lazily (LazyMotion) so it isn't in the main bundle.
 */
export default function SmoothScroll({ children }) {
  const { pathname, state } = useLocation();

  useEffect(() => {
    // PDP version switch (Wooden ↔ LED) asks to keep the scroll position.
    if (state?.keepScroll) return;
    window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <LazyMotion features={loadFeatures}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
