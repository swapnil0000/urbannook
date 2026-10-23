import PromotionBanner from "./PromotionBanner";

/**
 * Conditional Promotion Visibility: renders NOTHING unless
 * a relevant, active, applied offer actually exists for the
 * current cart — no blank sections, no placeholder states. `free_shipping`
 * is deliberately excluded here: FreeShippingStrip already owns that
 * surface. A not-yet-applied promotion is also excluded — that's the unlock bottom sheet's job
 * (PromotionUnlockSheet), not a static banner, so the two never say the
 * same thing in two different ways on the same screen.
 *
 * @param {object[]} promotions — raw list from useCartPromotions/
 *   useGetCheckoutPromotionsQuery (already sanitized server-side).
 */
const PromotionBannerList = ({ promotions = [], pricing, className = "" }) => {
  const visible = promotions.filter((p) => p.displayType !== "free_shipping" && !p.rewardTargetPending && p.applied);
  if (visible.length === 0) return null;

  return (
    <div className={`flex max-h-40 flex-col gap-2 overflow-y-auto ${className}`} aria-label="Applied offers">
      {visible.map((p) => (
        <PromotionBanner key={p.id} promo={p} savings={pricing?.savingsByPromotion?.[p.id] || 0} />
      ))}
    </div>
  );
};

export default PromotionBannerList;
