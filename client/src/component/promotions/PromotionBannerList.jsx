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
 *
 * Kept short so it never buries what the shopper actually added: the deal in one line ("Add 1 for
 * ₹150 ₹299"), every option the offer allows as a row of small photo tiles to pick from, and one Add
 * button. (A full row per option - 4 pen stands - pushed the cart's own lamp off the screen.) A single
 * option keeps the plain one-row layout.
 */
export const PendingRewardRow = ({ promo }) => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((s) => s.auth);
  const [addToCartAPI] = useAddToCartMutation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const cards = promo.recommendedProducts || [];
  const [pick, setPick] = useState(0);
  const card = cards[Math.min(pick, cards.length - 1)];
  if (!card) return null;

  const add = async () => {
    if (busy) return;
    setBusy(true);
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
      setBusy(false);
    }
  };

  const label = (c) => c.variantName || c.productName;
  const price = (c) => (c.offerPrice != null
    ? <><span className="font-extrabold text-brand">{c.offerPrice === 0 ? "FREE" : inr(c.offerPrice)}</span>{c.offerPrice < c.price && <span className="ml-1.5 text-muted line-through">{inr(c.price)}</span>}</>
    : promo.subtitle);
  // every option at one price (the usual case) -> say it once, in the headline
  const onePrice = cards.every((c) => c.offerPrice === card.offerPrice && c.price === card.price);
  const addLabel = card.offerPrice === 0 ? "Add free" : card.offerPrice != null ? `Add for ${inr(card.offerPrice)}` : "Add";

  return (
    // Same family as the cart's "Offer applied" group: ink header, red accent.
    <div className="min-w-0 overflow-hidden rounded-xl border border-ink/15 bg-white shadow-sm">
      <p className="flex items-center gap-2 bg-ink px-3 py-2 text-[12.5px] text-paper">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand motion-safe:animate-pulse" aria-hidden="true" />
        <span className="font-archivo font-bold">Offer unlocked</span>
        {promo.title && <span className="min-w-0 truncate text-paper/60">· {promo.title}</span>}
      </p>

      {cards.length === 1 ? (
        <div className="flex min-w-0 items-center gap-3 px-3 py-2.5 text-ink">
          {card.image && <img src={card.image} alt="" className="h-12 w-12 shrink-0 rounded-md bg-surface object-cover" />}
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-[13.5px] font-bold leading-snug" title={label(card)}>{label(card)}</p>
            <p className="mt-0.5 text-[13px]">{price(card)}</p>
          </div>
          <button type="button" onClick={add} disabled={busy} className="gl-press shrink-0 rounded-lg bg-brand px-4 py-2.5 text-[12px] font-extrabold uppercase tracking-wide text-white hover:bg-brandHi disabled:opacity-60">
            {busy ? "Adding…" : "Add"}
          </button>
        </div>
      ) : (
        <div className="px-3 pb-3 pt-2.5 text-ink">
          <p className="text-[13px] font-semibold">
            Add 1 {onePrice && card.offerPrice != null ? <>for {price(card)}</> : "at the offer price"}
            <span className="text-muted"> · pick one</span>
          </p>
          <div className="gl-hscroll -mx-3 mt-2 flex gap-2 overflow-x-auto px-3 pb-0.5" role="radiogroup" aria-label="Pick one">
            {cards.map((c, i) => {
              const on = c === card;
              return (
                <button
                  key={c.sku || c.productId || i}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setPick(i)}
                  className={`relative w-[68px] shrink-0 text-left ${on ? "" : "opacity-80 hover:opacity-100"}`}
                >
                  <span className={`block aspect-square overflow-hidden rounded-md bg-surface ${on ? "ring-2 ring-brand ring-offset-1" : "border border-hair"}`}>
                    {c.image && <img src={c.image} alt="" loading="lazy" className="h-full w-full object-cover" />}
                  </span>
                  {on && <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-brand text-[9px] font-bold text-white" aria-hidden="true">✓</span>}
                  <span className={`mt-1 block line-clamp-2 text-[10.5px] leading-tight ${on ? "font-bold" : "text-muted"}`}>{label(c)}</span>
                  {!onePrice && <span className="block text-[10.5px]">{price(c)}</span>}
                </button>
              );
            })}
          </div>
          <button type="button" onClick={add} disabled={busy}
            className="gl-press mt-2.5 flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-2.5 text-[12.5px] font-extrabold uppercase tracking-wide text-white hover:bg-brandHi disabled:opacity-60">
            {busy ? "Adding…" : <>{addLabel} <span className="truncate font-semibold normal-case tracking-normal text-white/80">· {label(card)}</span></>}
          </button>
        </div>
      )}
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
