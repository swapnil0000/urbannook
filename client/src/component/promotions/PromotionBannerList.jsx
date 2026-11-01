import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import PromotionBanner from "./PromotionBanner";
import { addItem } from "../../store/slices/cartSlice";
import { useAddToCartMutation } from "../../store/api/userApi";
import { trackAddToCart } from "../../utils/analytics";

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;

/**
 * "Your cart qualifies - add the discounted item": a matched offer whose discounted product (e.g. the
 * 50%-off stand) is not in the cart yet. One tap adds that exact variant, and the offer then applies.
 */
// Every reward option the offer allows (Single / Double / Triple stand), each with its own Add.
export const PendingRewardRow = ({ promo }) => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((s) => s.auth);
  const [addToCartAPI] = useAddToCartMutation();
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  // only options this offer actually discounts (a tier-gated Triple comes without a price)
  const cards = (promo.recommendedProducts || []).filter((c) => c.offerPrice != null);

  const add = async (card) => {
    if (busy) return;
    setBusy(card.sku || card.productId);
    setError("");
    try {
      if (isAuthenticated || localStorage.getItem("authToken")) {
        await addToCartAPI({ productId: card.productId, quantity: 1, variant: card.variantName || undefined, image: card.image }).unwrap();
      } else {
        dispatch(addItem({
          id: card.productId, mongoId: card.productId, name: card.productName, price: card.price,
          image: card.image, quantity: 1, selectedVariant: card.variantName || "N/A", sku: card.sku,
        }));
      }
      trackAddToCart({ itemId: card.productId, sku: card.sku, itemName: card.productName, itemVariant: card.variantName, price: card.price, quantity: 1, placement: "cart_reward_row" });
    } catch (err) {
      setError(err?.data?.message || "Could not add. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    // Same family as the cart's "Offer applied" group: ink header, red accent.
    <div className="min-w-0 overflow-hidden rounded-xl border border-ink/15 bg-white shadow-sm">
      <p className="flex items-center gap-2 bg-ink px-3 py-2 font-archivo text-[12.5px] font-bold text-paper">
        <span className="h-1.5 w-1.5 rounded-full bg-brand motion-safe:animate-pulse" aria-hidden="true" />
        Offer unlocked · {promo.title || "add it to your cart"}
      </p>
      {promo.applied && promo.rewardsLeft
        ? <p className="px-3 pt-2 text-[12px] font-semibold text-muted">{promo.rewardsLeft > 1 ? `${promo.rewardsLeft} more rewards` : "1 more reward"} left in this offer - pick one:</p>
        : cards.length > 1 && <p className="px-3 pt-2 text-[12px] font-semibold text-muted">Pick one:</p>}
      <div className="divide-y divide-hair">
        {cards.map((card) => {
          const label = card.variantName || card.productName;
          const k = card.sku || card.productId;
          return (
            <div key={k} className="flex min-w-0 items-center gap-3 px-3 py-2.5 text-ink">
              {card.image && <img src={card.image} alt="" className="h-12 w-12 shrink-0 rounded-md bg-surface object-cover" />}
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[13.5px] font-bold leading-snug" title={label}>{label}</p>
                <p className="mt-0.5 text-[13px] text-muted">
                  {card.offerPrice != null
                    ? <><span className="font-extrabold text-brand">{card.offerPrice === 0 ? "FREE" : inr(card.offerPrice)}</span> <span className="line-through">{inr(card.price)}</span></>
                    : promo.subtitle}
                </p>
              </div>
              <button type="button" onClick={() => add(card)} disabled={Boolean(busy)} className="gl-press shrink-0 rounded-lg bg-brand px-4 py-2.5 text-[12px] font-extrabold uppercase tracking-wide text-white hover:bg-brandHi disabled:opacity-60">
                {busy === k ? "Adding…" : "Add"}
              </button>
            </div>
          );
        })}
      </div>
      {error && <p className="px-3 pb-2 text-[11px] font-semibold text-brand" role="alert">{error}</p>}
    </div>
  );
};

/**
 * Conditional Promotion Visibility: renders NOTHING unless
 * a relevant, active, applied offer actually exists for the
 * current cart - no blank sections, no placeholder states. `free_shipping`
 * is deliberately excluded here: FreeShippingStrip already owns that
 * surface. A promotion that is not yet applied is also excluded - that's the unlock bottom sheet's job
 * (PromotionUnlockSheet) - except one whose condition is already met and only needs its discounted
 * product added: that gets a one-tap Add row so it never depends on the sheet opening.
 *
 * @param {object[]} promotions - raw list from useCartPromotions/
 *   useGetCheckoutPromotionsQuery (already sanitized server-side).
 */
const PromotionBannerList = ({ promotions = [], pricing, className = "" }) => {
  // free gifts are claimed explicitly (GiftClaimList), so they are not shown here as an automatic "applied" offer
  const visible = promotions.filter((p) => p.displayType !== "free_shipping" && p.displayType !== "free_gift" && !p.rewardTargetPending && p.applied);
  const pending = promotions.filter((p) => p.rewardTargetPending && p.qualifying && p.recommendedProducts?.length > 0);
  if (visible.length === 0 && pending.length === 0) return null;

  return (
    <div className={`flex flex-col gap-2 ${className}`} aria-label="Applied offers">
      {pending.map((p) => <PendingRewardRow key={p.id} promo={p} />)}
      {visible.map((p) => (
        <PromotionBanner key={p.id} promo={p} savings={pricing?.savingsByPromotion?.[p.id] || 0} />
      ))}
    </div>
  );
};

export default PromotionBannerList;
