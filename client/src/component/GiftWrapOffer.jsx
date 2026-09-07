import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useGetGiftWrapOfferQuery, useToggleGiftWrapMutation } from "../store/api/userApi";
import { setGiftWrap } from "../store/slices/cartSlice";
import { useCartData } from "../hooks/useCartSync";

// Wikimedia Commons, CC0/public domain (Open Clip Art Library) — no
// attribution required: https://commons.wikimedia.org/wiki/File:Valentines_Day_-_Gift_Box.svg
const DEFAULT_GIFT_IMAGE =
  "https://assets-staging.urbannook.online/staging/products/b36adc42-b08a-4273-bc8e-c670429ca1ed/product-images/01a029ee-f70f-798f-8e9d-37a68e24daca.webp";

const DEFAULT_TAGLINE =
  "Add our Rakhi-exclusive gift wrap to your lamp, packed in our easy-to-carry gift box.";

// Fixed 3-option note choice — kept simple/hardcoded on purpose (the offer
// itself — on/off, price, title, tagline — is admin-controlled; these 3
// labels are just how the customer wants the wrap packed).
const NOTE_OPTIONS = [
  { value: "birthday", label: "Birthday Note" },
  { value: "rakhi", label: "Rakhi Note" },
  { value: "none", label: "Gift Wrap" },
];

// One gift wrap per ELIGIBLE UNIT in the cart (admin opt-in per product —
// see AddProductForm/EditProductForm's "Allow gift wrap" checkbox) — sums
// quantity across every eligible line, so 2x the same eligible product is
// 2 gift wraps, not 1. Server enforces this identically and authoritatively
// at checkout — see rp.payment.controller.js — this is just the matching
// display count/visibility.
const useGiftWrapQuantity = () =>
  useSelector((state) =>
    state.cart.items.reduce(
      (sum, i) => (i.giftWrapEligible ? sum + (Number(i.quantity) || 0) : sum),
      0,
    ),
  );

/**
 * The "GIFT WRAP ₹149 x1" row in the cart's items list, shown once selected —
 * qty auto-scales with the number of products in the cart. No remove control
 * of its own; removal is via the trash icon on <GiftWrapOffer>'s trigger row.
 *
 * @param {string} image  optional thumbnail override (placeholder until a real photo is set)
 */
export const GiftWrapLineItem = ({ image }) => {
  const selected = useSelector((state) => state.cart.giftWrap);
  const quantity = useGiftWrapQuantity();
  const { data: offerRes } = useGetGiftWrapOfferQuery();
  const offer = offerRes?.data;

  if (!offer?.isActive || !selected || quantity < 1) return null;

  return (
    <div className="flex items-stretch gap-3 sm:gap-4 pb-3 sm:pb-6 border-b border-gray-50 last:border-0 last:pb-0">
      <div className="w-[74px] h-[74px] sm:w-[85px] sm:h-[85px] bg-gray-50 rounded-xl sm:rounded-2xl overflow-hidden shrink-0 border border-gray-100 flex items-center justify-center p-2">
        <img src={image || DEFAULT_GIFT_IMAGE} alt={offer.title} className="w-full h-full object-contain" />
      </div>
      <div className="flex-1 flex flex-col justify-center min-w-0">
        <h4 className="text-sm sm:text-base font-bold text-[#0a110e] leading-snug uppercase tracking-tight">
          {offer.title || "Gift Wrap"}
        </h4>
        <div className="flex items-center justify-between mt-1 sm:mt-2">
          <span className="text-xs text-gray-400">x{quantity}</span>
          <p className="text-sm font-bold text-[#0a110e]">
            ₹{(Number(offer.price) * quantity).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Seasonal "Make it a gift" cart add-on. Three states, matching the Comet
 * reference exactly:
 *   1. Not added — row + bordered "+ ADD" button.
 *   2. Tap it — popup opens (image, copy, price, "Make It A Gift" button).
 *   3. Tap that button — added (popup closes); row now shows a trash icon
 *      instead of "+ ADD". Tapping trash removes it directly, no popup.
 *
 * Fully admin-driven (renders nothing unless the gift_wrap offer is active)
 * and price is never computed/sent from here — only a boolean intent; the
 * server re-prices from the live offer config on every read and, again
 * authoritatively, at checkout.
 *
 * @param {string} image  optional override for the popup image (placeholder
 *                        gift-box graphic until a real photo is set)
 */
const GiftWrapOffer = ({ image }) => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const selected = useSelector((state) => state.cart.giftWrap);
  const eligibleCount = useGiftWrapQuantity();
  const { data: offerRes } = useGetGiftWrapOfferQuery();
  const offer = offerRes?.data;

  const [toggleGiftWrapAPI, { isLoading: isToggling }] = useToggleGiftWrapMutation();
  const { refetch: refetchCart } = useCartData();

  const [showModal, setShowModal] = useState(false);
  // Multi-select — fully independent, no exclusivity. "Gift Wrap" is just
  // pre-checked by default; any combination (1, 2, or all 3) is valid.
  const [noteOptions, setNoteOptions] = useState(["none"]);

  const toggleNoteOption = (value) => {
    setNoteOptions((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  // Nothing to wrap — either the offer is off, or none of the products
  // currently in the cart are gift-wrap eligible (admin opt-in per product).
  if (!offer?.isActive || eligibleCount < 1) return null;

  const hasToken = !!localStorage.getItem("authToken");
  const isLoggedIn = isAuthenticated || hasToken;

  const applyToggle = async (nextSelected, nextNoteOptions = ["none"]) => {
    if (isLoggedIn) {
      try {
        await toggleGiftWrapAPI({ selected: nextSelected, noteOptions: nextNoteOptions }).unwrap();
        dispatch(setGiftWrap({ selected: nextSelected, noteOptions: nextNoteOptions }));
        await refetchCart();
      } catch (err) {
        console.error("Gift wrap toggle failed:", err);
        return;
      }
    } else {
      dispatch(setGiftWrap({ selected: nextSelected, noteOptions: nextNoteOptions }));
    }
  };

  const openPopup = () => setShowModal(true);
  const handleRemove = (e) => {
    e.stopPropagation();
    applyToggle(false);
  };
  const handleAdd = async () => {
    await applyToggle(true, noteOptions);
    setShowModal(false);
  };

  return (
    <>
      {/* Trigger row */}
      <div className="flex items-center justify-between gap-3 py-3 px-1 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <i className="fa-solid fa-gift text-sm text-[#157a44]" />
          <span className="text-sm font-semibold text-[#1c3026] truncate">
            {offer.title || "Make it a gift"}
          </span>

          {/* (?) opens the info popup. "+ Add" below opens the same popup —
              so a customer who misses the (?) still gets a chance to pick a
              note before adding, instead of it silently defaulting. */}
          <button
            type="button"
            onClick={openPopup}
            aria-label="Gift wrap info"
            className={
              selected ? "text-[#157a44] shrink-0" : "text-gray-400 shrink-0"
            }
          >
            <i
              className={`${selected ? "fa-solid fa-circle-check" : "fa-regular fa-circle-question"} text-[12px]`}
            />
          </button>
        </div>
        {selected ? (
          <button
            type="button"
            onClick={handleRemove}
            aria-label="Remove gift wrap"
            className="shrink-0 text-gray-400 hover:text-red-500 transition-colors"
          >
            <i className="fa-regular fa-trash-can text-sm" />
          </button>
        ) : (
          <button
            type="button"
            onClick={openPopup}
            className="shrink-0 px-4 py-1.5 rounded-lg border border-gray-300 text-xs font-bold uppercase tracking-widest text-[#1c3026] hover:bg-gray-50 transition-colors"
          >
            Add
          </button>
        )}
      </div>

      {/* Popup — absolute (not fixed), so it's positioned/centered within the
          cart drawer panel (the nearest `relative` ancestor), never covering
          the rest of the page. */}
      {showModal && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-[86%] max-w-xs bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex justify-end pt-2 pr-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                aria-label="Close"
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            <div className="px-5 pb-5 flex flex-col items-center text-center">
              {/* Image — falls back to a free CC0 gift-box graphic until a
                  real product photo is set via the `image` prop. */}
              <div className="w-full h-40 rounded-2xl overflow-hidden flex items-center justify-center mb-3">
                <img
                  src={image || DEFAULT_GIFT_IMAGE}
                  alt={offer.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <p className="text-sm text-gray-700 mb-4">
                {offer.note?.trim() || DEFAULT_TAGLINE}
              </p>

              {/* 3-option note choice — fully independent multi-select, no
                  restriction on how many can be checked at once. Plain square
                  checkbox with the top-right corner left open; the tick sits
                  behind the box and its tip pokes out through that gap when
                  checked. Always mounted, just scaled/faded via CSS transition
                  (no keyframes, no JS) — smooth but deliberately cheap. */}
              <div className="w-full flex flex-row items-start justify-between gap-1 mb-4">
                {NOTE_OPTIONS.map((opt) => {
                  const checked = noteOptions.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleNoteOption(opt.value)}
                      className="flex flex-col items-center gap-1.5 flex-1 min-w-0 py-1"
                    >
                      <span
                        className="relative w-[18px] h-[18px] rounded-[4px] border-2 bg-white flex items-center justify-center transition-[border-color,border-top-right-radius] duration-200 ease-out"
                        style={{
                          borderColor: checked ? "#157a44" : "#d1d5db",
                          borderTopRightRadius: checked ? 0 : 4,
                        }}
                      >
                        {/* Hollow opening cut into the top-right corner */}
                        <span
                          className="absolute bg-white transition-transform duration-200 ease-out"
                          style={{
                            width: 6,
                            height: 6,
                            top: -2,
                            right: -2,
                            transform: checked ? "scale(1)" : "scale(0)",
                          }}
                        />
                        <svg
                          viewBox="0 0 24 24"
                          className="absolute transition-all duration-200 ease-out"
                          style={{
                            width: 20,
                            height: 20,
                            top: -6,
                            left: -1,
                            transformOrigin: "20% 90%",
                            opacity: checked ? 1 : 0,
                            transform: checked ? "scale(1)" : "scale(0.4)",
                          }}
                        >
                          <polyline
                            points="4,13 9,18 20,4"
                            fill="none"
                            stroke="#157a44"
                            strokeWidth="3.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      <span className="text-[10px] font-medium text-gray-600 leading-tight text-center truncate w-full">
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleAdd}
                disabled={isToggling}
                className="w-full h-11 rounded-lg border border-gray-300 text-xs font-bold uppercase tracking-widest text-[#1c3026] hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {isToggling ? "…" : offer.ctaLabel || "Make It A Gift"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GiftWrapOffer;
