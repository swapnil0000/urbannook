/* eslint-disable react-refresh/only-export-components -- shared motion primitives + tokens live together intentionally */
import { Fragment, useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";

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

export { motion };
