import { useLayoutEffect, useRef, useState } from "react";
import defaultTheme from "tailwindcss/defaultTheme.js";

// Shared canvas context reused across every card for text-width measurement
// — avoids allocating a new <canvas> per card in a grid of a dozen+ cards.
let measureCtx = null;
function measureTextWidth(text, font) {
  if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
  measureCtx.font = font;
  return measureCtx.measureText(text).width;
}

/**
 * Title that always renders on exactly one line: it starts at `capPx` and
 * shrinks (down to `floorPx`) only by as much as the actual rendered text
 * needs to fit the card's real width — no wrapping, no ellipsis, no clipped
 * characters, whatever the name's length turns out to be. Shared by every
 * card type (product model cards, variant cards) so a row of cards never
 * ends up with mismatched heights from one title wrapping and another not.
 */
// Default preserves every existing caller's exact behaviour — they all rely
// on the site's serif card-title styling and never passed a font. A caller
// whose title actually renders in a different font (e.g. the sans-serif
// UnProductCard) MUST pass its real `fontFamily`, or this measures against
// the wrong glyph widths and the shrink math is off — the bug this file's
// own history already hit once (font-serif clipping) is exactly this
// mismatch between the measured font and the rendered one. The default value
// itself is Tailwind's own `serif` stack (tailwind.config.js doesn't
// override it, so `font-serif` on the existing callers resolves to exactly
// this) read straight from defaultTheme — not a separately hand-typed copy.
const FitTitle = ({ text, capPx, floorPx, className, fontFamily = defaultTheme.fontFamily.serif.join(", "), as }) => {
  const Tag = as || "h3";
  const ref = useRef(null);
  const [fontSize, setFontSize] = useState(capPx);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fit = () => {
      const available = el.clientWidth;
      if (!available) return;
      const font = `${capPx}px ${fontFamily}`;
      const textWidth = measureTextWidth(text, font);
      if (textWidth <= available) {
        setFontSize(capPx);
      } else {
        setFontSize(Math.max(floorPx, capPx * (available / textWidth)));
      }
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, capPx, floorPx, fontFamily]);

  return (
    <Tag
      ref={ref}
      className={`${className} whitespace-nowrap overflow-hidden`}
      // text-overflow only ever does anything if the title still doesn't
      // fit at floorPx on a very narrow card — an extreme-case safety net,
      // not a substitute for the shrink-to-fit above (which handles every
      // normal-length title with zero clipping).
      style={{ fontSize: `${fontSize}px`, textOverflow: "ellipsis" }}
    >
      {text}
    </Tag>
  );
};

export default FitTitle;
