import { useEffect, useRef, useState } from "react";

// One shared IntersectionObserver for every RevealCard on the page instead
// of one per card — however many products are in the grid, this stays a
// single native observer (cheap, off-main-thread hit-testing), not N of
// them. Each card just registers/unregisters its own callback on mount.
let sharedObserver = null;
const callbacks = new WeakMap();

function getSharedObserver() {
  if (sharedObserver) return sharedObserver;
  sharedObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const setVisible = callbacks.get(entry.target);
        if (setVisible) setVisible(entry.isIntersecting);
      }
    },
    { threshold: 0.1, rootMargin: "-5% 0px -5% 0px" },
  );
  return sharedObserver;
}

// Read once at module load, not on every render/mount — this can't change
// mid-session in any way that matters for a decorative scroll animation.
const REDUCE_MOTION =
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Wraps one grid item so it rises + fades in as it scrolls into view, and
 * reverses the same way if it scrolls back out (scrolling up "removes" a
 * card the same way scrolling down "added" it) — kept deliberately two-way
 * instead of the more common reveal-once pattern, per how this was asked
 * for. Only `opacity`/`transform` are animated (compositor-only, no layout
 * or paint cost), and the whole thing is skipped under
 * prefers-reduced-motion, so it can't be the thing that slows the page down.
 */
const RevealCard = ({ index = 0, children, className = "" }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(REDUCE_MOTION);

  useEffect(() => {
    if (REDUCE_MOTION) return;
    const el = ref.current;
    if (!el) return;
    const observer = getSharedObserver();
    callbacks.set(el, setVisible);
    observer.observe(el);
    return () => {
      observer.unobserve(el);
      callbacks.delete(el);
    };
  }, []);

  // Reveal two cards at a time — both cards of a pair share the exact same
  // delay (so they rise together), and the delay alternates between two
  // values so consecutive pairs still feel sequenced. Capped to 2 steps so
  // a long grid never ends up with a growing, ever-slower stagger.
  const pairIndex = Math.floor(index / 2);
  const delayMs = (pairIndex % 2) * 110;

  return (
    <div
      ref={ref}
      className={`h-full ${className}`}
      style={
        REDUCE_MOTION
          ? undefined
          : {
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(28px)",
              transition: `opacity 480ms ease-out ${delayMs}ms, transform 480ms ease-out ${delayMs}ms`,
              willChange: "opacity, transform",
            }
      }
    >
      {children}
    </div>
  );
};

export default RevealCard;
