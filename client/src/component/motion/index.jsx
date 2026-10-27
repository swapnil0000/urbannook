/* eslint-disable react-refresh/only-export-components -- shared motion primitives + tokens live together intentionally */
import { Fragment, useEffect, useRef } from "react";
import { motion, useScroll, useTransform, useInView, AnimatePresence, MotionConfig } from "motion/react";

/**
 * Shared motion primitives for Urban Nook.
 * One easing + duration language everywhere so the whole site feels consistent:
 * a long "expo-out" curve that decelerates smoothly (premium, not bouncy).
 */
export const EASE = [0.22, 1, 0.36, 1];
export const DUR = 0.7;

// Viewport config: trigger a touch before fully in view, and animate only ONCE
// (no re-animating when the user scrolls back up — that reads as buggy).
const VIEWPORT = { once: true, margin: "0px 0px -10% 0px" };

/**
 * <Reveal> — fade + slide-in-on-scroll. The default building block.
 * Props: y (travel px), x, delay, once, as (element tag), + any motion props.
 */
export function Reveal({
  children,
  className,
  y = 28,
  x = 0,
  delay = 0,
  once = true,
  as = "div",
  ...rest
}) {
  const Tag = motion[as] || motion.div;
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y, x }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ ...VIEWPORT, once }}
      transition={{ duration: DUR, ease: EASE, delay }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/**
 * <Stagger> + <StaggerItem> — cascade children into view (grids, lists).
 * Wrap the container in <Stagger> and each child in <StaggerItem>.
 */
export function Stagger({
  children,
  className,
  stagger = 0.08,
  delayChildren = 0,
  once = true,
  as = "div",
  ...rest
}) {
  const Tag = motion[as] || motion.div;
  return (
    <Tag
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ ...VIEWPORT, once }}
      variants={{ show: { transition: { staggerChildren: stagger, delayChildren } } }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: DUR, ease: EASE } },
};

export function StaggerItem({ children, className, as = "div", ...rest }) {
  const Tag = motion[as] || motion.div;
  return (
    <Tag className={className} variants={itemVariants} {...rest}>
      {children}
    </Tag>
  );
}

/**
 * <Parallax> — element drifts as it scrolls through the viewport.
 * `speed` ~0.1–0.3. Positive = element moves up (slower than scroll).
 * Give the parent overflow-hidden and make the child slightly oversized so no
 * edges are revealed (e.g. h-[115%] for a filling image).
 */
export function Parallax({ children, className, speed = 0.15, style, ...rest }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [speed * 100, speed * -100]);
  return (
    <motion.div ref={ref} className={className} style={{ y, ...style }} {...rest}>
      {children}
    </motion.div>
  );
}

/**
 * <ScrollColorBand> — the Porsche-style effect: the section enters blending in with
 * the page (`from` = paper), then morphs to `to` (ink black) so the WHOLE band is
 * black while it fills the viewport, and stays black as it scrolls up and out.
 * Text `color` flips `textFrom`→`textTo` in sync. Children WITHOUT an explicit
 * text-colour class inherit the morphing colour and stay readable the whole way;
 * give muted children `opacity-*` (not a colour class) so they ride the same
 * transition. Uses framer-motion (works in every browser) — no CSS scroll-timeline.
 */
export function ScrollColorBand({
  children,
  className = "",
  from = "#EFEAE0",   // Off-White / Paper — matches the page as the band enters
  to = "#141414",     // Ink Black — fully black once the band fills the viewport
  textFrom = "#141414",
  textTo = "#EFEAE0",
  range = [0.05, 0.35],
  as = "div",
  // Page-wide night mode: pass a ref to the page wrapper. While the band fills a
  // good part of the visible screen the wrapper gets `un-night` (index.css swaps the page
  // tokens to dark, with a short colour transition), and the band itself is
  // plain ink — so above, the band and below all read as one dark page.
  nightScopeRef = null,
  ...rest
}) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const backgroundColor = useTransform(scrollYProgress, range, [from, to]);
  const color = useTransform(scrollYProgress, range, [textFrom, textTo]);

  useEffect(() => {
    const band = ref.current;
    const scope = nightScopeRef?.current;
    if (!band || !scope) return undefined;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let timer;
    let frame = 0;
    // Only the part of the band the shopper can actually see counts: not what's
    // under the sticky header, nor under the bottom bars (mobile buy bar + nav).
    const visibleShare = () => {
      const header = document.querySelector("header")?.getBoundingClientRect().bottom || 0;
      const bottomBars = [...document.querySelectorAll(".fixed.inset-x-0, nav.fixed")]
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.height > 0 && r.height < window.innerHeight / 2 && r.bottom >= window.innerHeight - 2)
        .reduce((top, r) => Math.min(top, r.top), window.innerHeight);
      const r = band.getBoundingClientRect();
      const seen = Math.max(0, Math.min(r.bottom, bottomBars) - Math.max(r.top, header));
      return seen / Math.max(1, bottomBars - header);
    };
    const update = () => {
      frame = 0;
      const share = visibleShare();
      const isOn = scope.classList.contains("un-night");
      // hysteresis: on at 25 % of the visible screen, off below 12 % — no flicker at the edge
      const on = isOn ? share > 0.12 : share > 0.25;
      if (on === isOn) return;
      if (!reduce) {
        scope.classList.add("un-theme-anim");
        clearTimeout(timer);
        timer = setTimeout(() => scope.classList.remove("un-theme-anim"), 700);
      }
      scope.classList.toggle("un-night", on);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      scope.classList.remove("un-night", "un-theme-anim");
    };
  }, [nightScopeRef]);

  const Tag = motion[as] || motion.div;
  return (
    <Tag ref={ref} className={className} style={nightScopeRef ? { backgroundColor: to, color: textTo } : { backgroundColor, color }} {...rest}>
      {children}
    </Tag>
  );
}

/**
 * <TextReveal> — headline whose words rise up from a clipped baseline.
 * Accessible: the full string is exposed via aria-label; the split words are hidden.
 * The inter-word space sits OUTSIDE the clip span so the line still wraps naturally.
 */
export function TextReveal({
  text,
  className,
  as = "h2",
  delay = 0,
  stagger = 0.05,
  once = true,
}) {
  const Tag = motion[as] || motion.h2;
  const words = String(text).split(" ");
  return (
    <Tag
      className={className}
      aria-label={text}
      initial="hidden"
      whileInView="show"
      viewport={{ ...VIEWPORT, once }}
      variants={{ show: { transition: { staggerChildren: stagger, delayChildren: delay } } }}
    >
      {words.map((word, i) => (
        <Fragment key={i}>
          <span
            aria-hidden="true"
            style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top" }}
          >
            <motion.span
              style={{ display: "inline-block", willChange: "transform" }}
              variants={{
                hidden: { y: "110%" },
                show: { y: 0, transition: { duration: DUR, ease: EASE } },
              }}
            >
              {word}
            </motion.span>
          </span>
          {i < words.length - 1 ? " " : ""}
        </Fragment>
      ))}
    </Tag>
  );
}

/**
 * <MotionRoot> — wrap a page that uses these primitives (or motion/react) in
 * it, so its animations respect prefers-reduced-motion. Lives in the pages,
 * not the app shell, so `motion` only loads with the pages that animate.
 */
export function MotionRoot({ children }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

export { motion, useInView, AnimatePresence };
