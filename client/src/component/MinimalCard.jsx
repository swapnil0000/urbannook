import FitTitle from "./FitTitle";

/**
 * Product-list card for the two PDP scroller sections ("Explore Other
 * Variants" and "You May Also Like") — a standard e-commerce card layout
 * (white card, left-aligned single-line title, bold price + struck MRP +
 * green % off) rather than the shop grid's or variant-page's own card
 * designs, which keep their existing look. Pure presentation: the caller
 * supplies the click handler, so this works equally for a product
 * (multi-variant "Starting at ₹X") or a single variant ("₹X").
 *
 * Title uses the same FitTitle every other card type uses — always exactly
 * one line, shrinking to fit rather than wrapping — so a row of these
 * cards is never uneven the way a wrapping 1-line-vs-2-line title would be.
 *
 * Deliberately does NOT show a star rating, a "bank offer" line, or a
 * delivery estimate the way some marketplace cards do — none of that is
 * real per-card data here (a rating would mean a separate API call per
 * card just for decoration), and showing fabricated numbers would be
 * misleading rather than "minimal."
 */
const MinimalCard = ({ image, alt, title, price, mrp, pricePrefix, badge, onClick }) => {
  const discountPct = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

  return (
    <div
      onClick={onClick}
      className="gl-pcard group relative rounded-none overflow-hidden bg-white border border-hair flex flex-col h-full cursor-pointer"
    >
      <div className="relative w-full aspect-square bg-surface overflow-hidden">
        <img
          src={image || "/placeholder.jpg"}
          alt={alt}
          className="gl-img w-full h-full object-cover mix-blend-multiply"
        />
        {badge && (
          <span
            className={`absolute top-2 left-2 z-10 gl-lbl text-[8px] px-2 py-0.5 rounded-none ${badge.className}`}
          >
            {badge.label}
          </span>
        )}
      </div>

      <div className="p-3 flex flex-col items-start gap-1 text-left">
        {/* Fixed-height wrapper, sized to the CAP font size regardless of how
            much this particular title had to shrink — otherwise a long name
            (smaller font) leaves a shorter title block than a short name
            (full font), and the price row below ends up at a different Y
            per card in the same row. */}
        <div className="h-[18px] flex items-center w-full">
          <FitTitle
            text={title || ""}
            capPx={13}
            floorPx={9}
            className="font-archivo font-bold text-ink leading-snug text-left w-full"
          />
        </div>

        {/* Price on the left, MRP + discount stacked to its right — left-
            aligned as a group, deliberately leaving the rest of the row
            empty on the right. */}
        <div className="flex items-start gap-3">
          <span className="whitespace-nowrap">
            {pricePrefix && (
              <span className="gl-lbl text-[9px] text-faint mr-1">{pricePrefix}</span>
            )}
            <span className="text-[15px] font-extrabold text-ink">₹{price?.toLocaleString()}</span>
          </span>
          {mrp > price && (
            <span className="flex flex-col items-start leading-none whitespace-nowrap">
              <span className="gl-lbl text-[9px] text-save">{discountPct}% off</span>
              <span className="text-[11px] text-faint line-through mt-0.5">₹{mrp?.toLocaleString()}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MinimalCard;
