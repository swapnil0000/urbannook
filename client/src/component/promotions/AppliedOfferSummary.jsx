import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useAddToCartMutation, useUpdateCartMutation } from "../../store/api/userApi";
import { addItem, removeItem, updateQuantity } from "../../store/slices/cartSlice";
import { useCartPromotions } from "../../hooks/useCartPromotions";
import { groupCartByOffer } from "../../utils/cartOfferGroups";
import { nounOf } from "../../utils/offerName";

// What each applied offer is made of (the katana that unlocked it, the stand
// picked as the reward) with a way to switch the pick (Single -> Double).
// Data: live promotion display (promotions[].rewardOptions, pricing.lines) -
// the same source as the cart drawer, so checkout and drawer always agree.

/** A pick-your-reward offer that can still repeat: "get one more" is a true promise. */
export const canGetOneMore = (promo, cartItems = []) => {
  const ids = new Set((promo.triggerProductIds || []).map(String));
  if (!ids.size || !(promo.rewardOptions?.length > 0)) return false; // not a stand-type offer (e.g. free shipping)
  if (promo.maxApplications == null) return true;
  const have = cartItems.filter((i) => ids.has(String(i.mongoId || i.productId || i.id))).reduce((n, i) => n + (Number(i.quantity) || 0), 0);
  return have < promo.maxApplications;
};

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;
const idOf = (item) => String(item.mongoId || item.productId || item.id);
const shortVariant = (v = "") => v.replace(/\s*(katana\s*)?(sword\s*)?display\s*stand\s*$/i, "").trim() || v;

/** Swap one unit of a cart line for another option (same as - on one card and + on another). */
const useSwapCartUnit = () => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((s) => s.auth);
  const [updateCart] = useUpdateCartMutation();
  const [addToCart] = useAddToCartMutation();
  return async (from, to) => {
    const loggedIn = isAuthenticated || (typeof window !== "undefined" && !!localStorage.getItem("authToken"));
    const variant = from.selectedVariant || "N/A";
    const qty = Number(from.quantity) || 0;
    if (loggedIn) {
      await updateCart({ productId: idOf(from), quantity: 1, action: qty > 1 ? "sub" : "remove", variant, image: from.image }).unwrap();
      await addToCart({ productId: to.productId, quantity: 1, variant: to.variantName || undefined, image: to.image }).unwrap();
    } else {
      if (qty > 1) dispatch(updateQuantity({ id: from.id || idOf(from), quantity: qty - 1, selectedVariant: variant }));
      else dispatch(removeItem({ id: from.id || idOf(from), selectedVariant: variant }));
      dispatch(addItem({ id: to.productId, mongoId: to.productId, name: to.productName, price: to.price, image: to.image, quantity: 1, selectedVariant: to.variantName || "N/A", sku: to.sku }));
    }
  };
};

/** The picked reward lines of one applied offer, each with "switch to" chips. */
export const OfferRewardPicks = ({ promo, rewards, pricing, promoRewards = rewards }) => {
  const swap = useSwapCartUnit();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const options = (promo.rewardOptions || []).filter((o) => o.offerPrice != null);
  const unitsOf = (it) => Number(it.offerUnits ?? it.quantity) || 0;
  // every unit this offer discounts, across all its boxes - a switch must keep the pick discounted
  const totalUnits = promoRewards.reduce((n, it) => n + unitsOf(it), 0);
  const unitsOfVariant = (o) => promoRewards.filter((it) => idOf(it) === String(o.productId) && it.selectedVariant === o.variantName).reduce((n, it) => n + unitsOf(it), 0);
  // units per option after moving one unit from `from` to `to` - checks combo rules like
  // "with any Double, at most 1 Single" (limitWhen) so a chip never makes a unit full price
  const allOptions = promo.rewardOptions || [];
  const comboOkAfter = (from, to) => {
    const after = (o) => unitsOfVariant(o) + (o.sku === to.sku ? 1 : 0) - (String(o.productId) === idOf(from) && o.variantName === from.selectedVariant ? 1 : 0);
    return !allOptions.some((r) => r.limitWhen?.variantSku && after(r) > Number(r.limitWhen.maxUnits || 0)
      && allOptions.some((x) => x.sku === r.limitWhen.variantSku && after(x) > 0));
  };
  const switchStaysDiscounted = (o, from) => !(o.unitWeight > 1 && totalUnits > 1) && !(o.maxUnits != null && unitsOfVariant(o) >= o.maxUnits) && comboOkAfter(from, o);
  if (!rewards.length) return null;
  const lineOf = (it) => (pricing?.lines || []).find((l) => l.productId === idOf(it) && (l.selectedVariant || "N/A") === (it.selectedVariant || "N/A"));
  return (
    <ul className="mt-2 space-y-2">
      {rewards.map((it) => {
        const others = options.filter((o) => !(o.productId === idOf(it) && o.variantName === it.selectedVariant) && switchStaysDiscounted(o, it));
        const line = lineOf(it);
        const units = unitsOf(it);
        // a line split between offers shows only this offer's units and price
        const shown = it.offerUnits != null && line
          ? { total: it.offerUnitPrice * units, was: line.originalUnitPrice * units }
          : line && { total: line.lineTotal, was: line.savings > 0 ? line.originalLineTotal : null };
        return (
          <li key={`${idOf(it)}-${it.selectedVariant}`} className="rounded-lg border border-hair bg-paper px-2.5 py-2">
            <div className="flex items-center justify-between gap-2 text-[12.5px]">
              <span className="min-w-0 font-bold text-ink">
                <span className="text-muted">You picked: </span>{shortVariant(it.selectedVariant || it.name)} stand{units > 1 ? ` × ${units}` : ""}
              </span>
              {shown && <span className="shrink-0 font-extrabold tabular-nums text-brand">{inr(shown.total)}{shown.was != null && shown.was > shown.total && <span className="ml-1 text-[11px] font-semibold text-muted line-through">{inr(shown.was)}</span>}</span>}
            </div>
            {others.length > 0 && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-muted">Switch {units > 1 ? "one" : "it"} to:</span>
                {others.map((o) => {
                  const key = `${idOf(it)}:${it.selectedVariant}>${o.sku}`;
                  return (
                    <button
                      key={o.sku || o.variantName}
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={async () => {
                        setBusy(key); setError("");
                        try { await swap(it, o); } catch { setError("Could not switch. Please try again."); } finally { setBusy(""); }
                      }}
                      className="h-7 rounded-full border border-ink/20 bg-white px-2.5 text-[11.5px] font-bold text-ink transition-colors hover:border-brand hover:text-brand disabled:opacity-55"
                    >
                      {busy === key ? <i className="fa-solid fa-spinner fa-spin text-[10px]" aria-hidden="true" /> : `${shortVariant(o.variantName)} ${inr(o.offerPrice)}`}
                    </button>
                  );
                })}
              </div>
            )}
          </li>
        );
      })}
      {error && <li className="text-[11.5px] font-semibold text-brand" role="alert">{error}</li>}
    </ul>
  );
};

/** Every applied offer with what unlocked it and what was picked (checkout pay screen). */
const AppliedOfferSummary = ({ className = "" }) => {
  const cartItems = useSelector((s) => s.cart.items);
  const { promotions, pricing } = useCartPromotions("cart");
  const { groups } = groupCartByOffer(cartItems, promotions, pricing);
  if (!groups.length) return null;
  return (
    <div className={className}>
      {groups.map(({ promo, savings, triggers, rewards, part = 0 }) => (
        <section key={`${promo.id}-${part}`} className="mb-3 overflow-hidden rounded-xl border border-ink/15 bg-white" aria-label={`Offer: ${promo.title}`}>
          <header className="flex items-start gap-2 bg-ink px-3 py-2 text-paper">
            <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-brand text-[9px] font-bold text-white" aria-hidden="true">✓</span>
            <p className="min-w-0 flex-1 text-[12.5px] leading-snug"><span className="font-semibold text-paper/70">Offer applied · </span><span className="font-extrabold">{promo.title}</span></p>
          </header>
          <div className="px-3 py-2.5">
            {savings > 0 && <p className="text-[12px] font-bold text-brand">You save {inr(savings)} with this offer</p>}
            {triggers.length > 0 && (
              <p className="mt-1 text-[12px] text-muted">
                Because you added: <span className="font-semibold text-ink">{triggers.map((t) => `${t.selectedVariant && t.selectedVariant !== "N/A" ? t.selectedVariant : t.name}${Number(t.quantity) > 1 ? ` × ${t.quantity}` : ""}`).join(", ")}</span>
              </p>
            )}
            <OfferRewardPicks promo={promo} rewards={rewards} pricing={pricing} promoRewards={groups.filter((g) => g.promo.id === promo.id).flatMap((g) => g.rewards)} />
            {/* one offer is applied; say how to get the next one (opens the 2-step card) */}
            {canGetOneMore(promo, cartItems) && !promo.rewardTargetPending
              && part === groups.filter((g) => g.promo.id === promo.id).length - 1 && (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("un:open-offer-steps", { detail: { promotionId: promo.id } }))}
                className="mt-2.5 flex w-full items-center justify-between gap-2 rounded-lg border border-dashed border-brand/50 bg-brand/[0.04] px-2.5 py-2 text-left text-[12.5px] font-bold text-ink transition-colors hover:border-brand"
              >
                <span>
                  Get one more {(promo.rewardLabel || "reward").split(",")[0].replace(/\s+per\s+\w+$/i, "").trim()}
                  <span className="block text-[11.5px] font-semibold text-muted">Add another {triggers[0] ? nounOf(triggers[0].name) : "item"} - 2 quick steps</span>
                </span>
                <span className="shrink-0 text-brand" aria-hidden="true">→</span>
              </button>
            )}
          </div>
        </section>
      ))}
    </div>
  );
};

export default AppliedOfferSummary;
