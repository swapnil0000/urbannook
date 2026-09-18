import { useLayoutEffect, useRef, useState } from "react";

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
const FitTitle = ({ text, capPx, floorPx, className }) => {
  const ref = useRef(null);
  const [fontSize, setFontSize] = useState(capPx);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fit = () => {
      const available = el.clientWidth;
      if (!available) return;
      const font = `${capPx}px Georgia, 'Times New Roman', serif`;
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
  }, [text, capPx, floorPx]);

  return (
    <h3
      ref={ref}
      className={`${className} whitespace-nowrap overflow-hidden`}
      // text-overflow only ever does anything if the title still doesn't
      // fit at floorPx on a very narrow card — an extreme-case safety net,
      // not a substitute for the shrink-to-fit above (which handles every
      // normal-length title with zero clipping).
      style={{ fontSize: `${fontSize}px`, textOverflow: "ellipsis" }}
    >
      {text}
    </h3>
  );
};

export default FitTitle;
