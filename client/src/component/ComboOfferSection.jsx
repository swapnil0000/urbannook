import { useState, useId } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { addItem } from '../store/slices/cartSlice';
import { useGetHomeComboOffersQuery } from '../store/api/userApi';
import { useSiteCampaign, THEME_COPY } from '../hooks/useSiteCampaign';
import FestiveCountdown from './festive/FestiveCountdown';
import SectionDecor from './festive/SectionDecor';
import ComboBuilderSheet from './ComboBuilderSheet';

import { recordOfferInterest } from '../utils/offerInterest';
import MysteryGiftArt from './offers/MysteryGiftArt';

const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

/**
 * Admin-driven homepage offers, sourced from GET /promotions/display/home -
 * ordinary Promotion V2 documents (placement "home") plus the optional
 * `homeCard` presentation fields.
 *
 * Money is never typed anywhere: mrp / price / save / percentOff are computed
 * server-side by the real checkout engine. The admin only picks WORDING
 * (badge, price label, how savings read, button text/link), the image, order
 * and dates. "reward" cards (ladder offers) show the free item instead of a
 * combo price.
 *
 * Layout: every card is the same size and every card's price panel and button
 * sit on the same lines (title block is a fixed height, price + CTA are pushed
 * to the card's bottom), so cards never look staggered.
 *
 * Styling is scoped under `.un-offers` (see index.css): radii use un-r-* classes
 * because the global hard-edged rule zeroes any class containing "rounded-".
 */

// What the headline savings tag says - derived from the computed numbers.
const headlineSavings = (c) => {
  if (c.save > 0) {
    if (c.savingsMode === 'percent' && c.percentOff > 0) return `${c.percentOff}% OFF`;
    // a label with an unfilled template slot ("Save {save}") falls back to the server-resolved benefit
    if (c.savingsMode === 'label' && c.savingsLabel) return /[{}]/.test(c.savingsLabel) ? (c.benefit || `Save ${inr(c.save)}`) : c.savingsLabel;
    return `Save ${inr(c.save)}`;
  }
  if (c.freeShipping) return 'Free Shipping';
  if (c.freeGift) return 'Free Gift';
  return (c.savingsLabel && !/[{}]/.test(c.savingsLabel) ? c.savingsLabel : c.benefit) || 'Combo Deal';
};

const GiftIcon = () => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="#8a4b1f" aria-hidden="true">
    <path d="M3 8h18v4H3zM4 13h7v8H5a1 1 0 0 1-1-1zM13 13h7v7a1 1 0 0 1-1 1h-6z" />
    <path d="M12 8c-1-3-3.2-5-5-4.3S5.3 7 12 8Zm0 0c1-3 3.2-5 5-4.3S18.7 7 12 8Z" />
  </svg>
);

const Arrow = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);

// Brass hanging diya: chains, glowing flame, engraved bowl. Sways from its hook.
const OrnateDiya = ({ className = '', length = 10, size = 30, delay = 0 }) => {
  const id = useId().replace(/:/g, '');
  const gold = 'rgb(var(--gl-star))';
  return (
    <div className={`un-sway absolute ${className}`} style={{ transformOrigin: 'top center', animationDelay: `${delay}s` }} aria-hidden="true">
      <span className="mx-auto block w-px" style={{ height: length, background: 'rgb(var(--gl-star) / 0.8)' }} />
      <svg viewBox="0 0 40 44" width={size} height={size * 1.1} className="block overflow-visible" style={{ filter: 'drop-shadow(0 0 6px rgb(255 170 40 / 0.55))' }}>
        <defs>
          <linearGradient id={`bowl${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8a5126" />
            <stop offset="0.5" stopColor="#5a3015" />
            <stop offset="1" stopColor="#2f180a" />
          </linearGradient>
          <radialGradient id={`flame${id}`} cx="0.5" cy="0.75" r="0.7">
            <stop offset="0" stopColor="#fff3b0" />
            <stop offset="0.45" stopColor="#ffc83d" />
            <stop offset="1" stopColor="#f58a1f" />
          </radialGradient>
          <radialGradient id={`glow${id}`}>
            <stop offset="0" stopColor="#ffc83d" stopOpacity="0.75" />
            <stop offset="0.55" stopColor="#f58a1f" stopOpacity="0.35" />
            <stop offset="1" stopColor="#f58a1f" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="20" cy="2.2" r="1.7" fill="none" stroke={gold} strokeWidth="0.9" />
        <path d="M20 3.9 7 22M20 3.9 33 22M20 3.9V20" stroke={gold} strokeWidth="0.8" strokeLinecap="round" opacity="0.85" />
        <circle cx="20" cy="19" r="14" fill={`url(#glow${id})`} />
        <path className="un-flame" d="M20 8.5C23.6 13 24.8 16.2 24.8 19a4.8 4.8 0 0 1-9.6 0C15.2 16.2 16.4 13 20 8.5Z" fill={`url(#flame${id})`} style={{ transformOrigin: '20px 22px' }} />
        <path d="M20 14c1.6 2.2 2.2 3.7 2.2 5a2.2 2.2 0 0 1-4.4 0c0-1.3.6-2.8 2.2-5Z" fill="#fff6d6" opacity="0.9" />
        <path d="M35 22.5q4.2-.8 5.2-4.2-.2 5.4-5.2 7.7Z" fill={`url(#bowl${id})`} />
        <path d="M5 22.5h30c0 9.5-6.8 15.5-15 15.5S5 32 5 22.5Z" fill={`url(#bowl${id})`} />
        <ellipse cx="20" cy="22.5" rx="15" ry="2.6" fill="#2f180a" />
        <ellipse cx="20" cy="22.2" rx="15" ry="2.1" fill="none" stroke="#b8803a" strokeWidth="0.8" />
        <path d="M9 27.5q11 4.2 22 0" fill="none" stroke="rgb(255 214 150 / 0.28)" strokeWidth="0.9" strokeLinecap="round" />
        {[11, 15.5, 20, 24.5, 29].map((x) => <circle key={x} cx={x} cy={x === 20 ? 31 : 29.8} r="0.9" fill="#d9a05a" opacity="0.7" />)}
        <circle cx="20" cy="41.6" r="1.3" fill="#b8803a" />
      </svg>
    </div>
  );
};

// Kept for the next phase (what a tile does on click): the full card with its combo builder sheet.
// `onAdded` (optional): called once the offer's items are in the cart; the
// /offers page uses it to go straight on to checkout.
export const OfferCard = ({ combo, festive, priceLabel, onAdded }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [added, setAdded] = useState(false);
  const isReward = combo.kind === 'reward';
  const { can } = useSiteCampaign();
  const [builderOpen, setBuilderOpen] = useState(false);

  const first = combo.items[0];
  const second = combo.items[1];
  const tag = headlineSavings(combo);
  // "Save {save}" is a per-cart template; the server-resolved `benefit` is the shown text
  const savingsPill = combo.savingsLabel && !/[{}]/.test(combo.savingsLabel) ? combo.savingsLabel : combo.benefit;
  // every offer opens the chooser first (pick designs), so one consistent label
  const cta = combo.ctaAction === 'link' ? 'View Offer' : 'Shop Now';
  const badge = combo.badgeLabel || (isReward ? 'Free Reward' : 'Combo Offer');
  const caption = combo.badgeText || (isReward ? 'Free with your purchase' : 'Buy together & save');

  const addBoth = () => {
    combo.items.forEach((item) => {
      dispatch(addItem({
        id: item.productId,
        mongoId: item.productId,
        name: item.productName,
        price: item.price,
        image: item.image,
        quantity: 1,
        selectedVariant: item.variantName,
        sku: item.sku,
      }));
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
    onAdded?.();
  };

  const openSheet = () => setBuilderOpen(true);

  const goTo = (url) => {
    if (/^https:\/\//i.test(url)) window.location.assign(url);
    else navigate(url);
  };

  const onCta = () => {
    // reward / combo cards open the combo builder sheet
    if (isReward && combo.ctaAction === 'choose' && combo.builder?.combos?.length) { openSheet(); return; }
    if (combo.ctaAction === 'link' && combo.ctaUrl) { goTo(combo.ctaUrl); return; }
    if (combo.builder?.combos?.length) { openSheet(); return; }
    addBoth();
  };

  const viewOffer = () => {
    if (isReward) { onCta(); return; }
    navigate(`/products/${first?.productId}`);
  };

  return (
    <article className="un-card un-r-card un-shine group relative flex h-full flex-col p-[5px]">
      {/* image - one fixed 4:3 frame for every card, centre-cropped, never distorted */}
      <button type="button" onClick={viewOffer} className="un-r-media relative block aspect-[4/3] w-full shrink-0 cursor-pointer overflow-hidden bg-surface text-left focus-visible:outline-none" aria-label={`View ${combo.title}`}>
        {combo.bannerImage ? (
          <img src={combo.bannerImage} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : (
          <>
            <img src={first?.image || (combo.mysteryGift ? combo.rewardImage : null) || combo.productImage || combo.choices?.[0]?.cards?.[0]?.image || combo.builder?.combos?.[0]?.reward?.image || '/assets/logo.webp'} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" onError={(e) => { e.currentTarget.src = '/assets/logo.webp'; }} />
            {second && (
              <span className="un-r-12 absolute bottom-2 right-2 aspect-square w-[34%] overflow-hidden border-[3px] border-paper bg-white shadow-lg">
                <img src={second.image || '/assets/logo.webp'} alt="" loading="lazy" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.src = '/assets/logo.webp'; }} />
              </span>
            )}
          </>
        )}
        {festive && can('diyas') && (
          <>
            <OrnateDiya className="right-[13%] top-0" length={6} size={26} />
            <OrnateDiya className="right-[3.5%] top-0" length={24} size={30} delay={0.8} />
          </>
        )}
        <span className="un-r-4 absolute left-2 top-2 inline-flex items-center gap-1.5 bg-brand px-2.5 py-1.5 text-[11px] font-semibold uppercase leading-none tracking-[0.08em] text-white shadow-md">
          <span aria-hidden="true">✦</span> {badge}
        </span>
      </button>

      <div className="flex min-h-0 flex-1 flex-col px-2.5 pb-2.5 pt-3">
        {/* fixed-height title block: titles of any length keep the price panel aligned */}
        <div className="shrink-0 pb-2.5">
          <h3 className="font-archivo text-[18px] font-bold leading-[1.25] tracking-tight text-ink" title={combo.title}>{combo.title}</h3>
          {/* subtitle hidden for now (re-enable by restoring this line):
          {subtitle && <p className="mt-1 line-clamp-1 text-[12.5px] font-normal leading-snug text-muted">{subtitle}</p>} */}
        </div>

        <div className="mt-auto">
          {/* price panel floats on a beige caption tray (the tray's top edge hides under the panel) */}
          <div className="un-r-tray border border-star/45 bg-gradient-to-b from-star/15 to-star/30">
            <div className="un-r-panel-all un-panel-shadow -mx-px -mt-px border border-star/40 bg-gradient-to-b from-white to-paper/40 py-2.5 pl-3 pr-[3px]">
              {isReward ? (
                <>
                  <p className="text-[11px] font-normal leading-none text-faint">Included with your order</p>
                  <div className="mt-2 flex items-center justify-between gap-1.5">
                    <p className="flex min-w-0 items-baseline gap-1.5 whitespace-nowrap">
                      <span className="text-[12.5px] font-medium text-sale">Reward</span>
                      <span className="font-archivo text-[21px] font-bold leading-none text-sale">FREE</span>
                    </p>
                    {(savingsPill || combo.rewardValue) && (
                      <span className="un-r-save max-w-[50%] shrink-0 truncate bg-save px-2.5 py-1.5 text-[11.5px] font-semibold leading-none text-white">{savingsPill || `Worth ${inr(combo.rewardValue)}`}</span>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-[11px] font-normal leading-none text-faint">MRP <span className="line-through">{inr(combo.mrp)}</span></p>
                  <div className="mt-2 flex items-center justify-between gap-1.5">
                    <p className="flex min-w-0 items-baseline gap-1.5 whitespace-nowrap">
                      <span className="text-[12.5px] font-medium text-sale">{priceLabel}</span>
                      <span className="font-archivo text-[21px] font-bold leading-none text-sale">{inr(combo.price)}</span>
                    </p>
                    <span className="un-r-save max-w-[48%] shrink-0 truncate bg-save px-2.5 py-1.5 text-[11.5px] font-semibold leading-none text-white">{tag}</span>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 px-3 py-[7px]">
              <GiftIcon />
              <span className="line-clamp-1 text-[10.5px] font-medium leading-tight text-ink">{caption}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onCta}
            className={`un-r-12 mt-3 flex h-[50px] w-full items-center justify-center gap-2 text-[16px] font-semibold transition-colors ${added ? 'border-2 border-ink bg-white text-ink' : 'bg-ink text-paper hover:bg-black'}`}
          >
            {added ? 'Added ✓' : <>{cta} <Arrow /></>}
          </button>
        </div>
      </div>

      {builderOpen && <ComboBuilderSheet combo={combo} onClose={() => setBuilderOpen(false)} onAdded={onAdded} />}
    </article>
  );
};

// How many of the offer's own product the deal asks for ("Buy 2 Katanas" -> 2):
// the builder slots that can only be that product.
const buyCount = (combo) => (combo.builder?.combos?.[0]?.slots || [])
  .filter((s) => s.options?.length === 1 && s.options[0].productId === combo.primaryProductId).length;

const Thumb = ({ img, children, reward = false }) => (
  <span className={`relative block aspect-[4/5] w-[42%] shrink-0 ${(img) ? '' : `overflow-hidden rounded-2xl bg-white shadow-sm ${reward ? 'ring-2 ring-dashed ring-brand/40' : ''}`}`}>
    {img
      ? <img src={(img) || img} alt="" loading="lazy" decoding="async" className={`h-full w-full ${(img) ? 'object-contain drop-shadow-[0_10px_12px_rgba(0,0,0,.25)]' : 'object-cover'}`} onError={(e) => { e.currentTarget.src = '/assets/logo.webp'; }} />
      : <MysteryGiftArt className="absolute inset-0" />}
    {children}
  </span>
);

const Badge = ({ children }) => (
  <span className="absolute left-1.5 top-1.5 rounded-full bg-sale px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">{children}</span>
);

/**
 * One homepage offer as a "deal equation", drawn like the shop's product
 * cards (white card, hairline, red mono label over a bold name): on a paper
 * band, what you buy (photo, x2) + what you get (the reward's photo with its
 * FREE / 50% OFF badge); under it the benefit and the offer's name, whole.
 * Built for the shopper the data says we have - on a phone, from an
 * Instagram ad, buying a first combo. Both lines come from Admin (homeCard
 * subtitle / promotion name, benefit label - "{save}" resolved server-side).
 * A click remembers the interest (the checkout reminder uses it) and opens the
 * offer's main product.
 */
const OfferRow = ({ combo }) => {
  const navigate = useNavigate();
  const reward = combo.builder?.combos?.[0]?.reward;
  const buyImg = combo.productImage || combo.items?.[0]?.image || combo.bannerImage || '/assets/logo.webp';
  const rewardImg = reward?.image || combo.rewardImage || null; // none (mystery gift) -> the wrapped-box art
  const badge = reward?.badge || (combo.freeGift ? 'FREE' : null);
  const qty = buyCount(combo);
  // "Buy 2 pen stands, 20% off" rewards the same product: one photo, both labels
  const sameThing = rewardImg && rewardImg === buyImg;
  const title = combo.tagline || combo.title;
  const benefit = combo.benefit || '';
  const qtyChip = qty > 1 && <span className="absolute bottom-1.5 left-1.5 rounded-full bg-ink px-2 py-0.5 text-[11px] font-bold text-paper">×{qty}</span>;
  return (
    <button
      type="button"
      onClick={() => {
        if (!combo.primaryProductId) return;
        recordOfferInterest(combo.id, combo.primaryProductId);
        navigate(`/products/${combo.primaryProductId}`);
      }}
      style={{ borderRadius: 26 }} className="group flex h-full w-full flex-col overflow-hidden border-[3px] border-ink bg-cream p-2 text-left shadow-[5px_5px_0_rgb(var(--gl-ink))] transition-transform duration-300 hover:-translate-y-1 hover:-rotate-1 motion-reduce:transform-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      aria-label={benefit ? `${title}. ${benefit}` : title}
    >
      <span style={{ borderRadius: 18 }} className="flex aspect-[16/11] w-full items-center justify-center gap-2 bg-white px-3" aria-hidden="true">
        {sameThing ? (
          <Thumb img={buyImg}>{badge && <Badge>{badge}</Badge>}{qtyChip}</Thumb>
        ) : (
          <>
            <Thumb img={buyImg}>{qtyChip}</Thumb>
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-[16px] font-extrabold leading-none text-brand shadow-sm">+</span>
            <Thumb img={rewardImg} reward>{badge && <Badge>{badge}</Badge>}</Thumb>
          </>
        )}
      </span>
      <span className="flex flex-1 flex-col px-2 pb-1.5 pt-3">
        {benefit && <span style={{ borderRadius: 999 }} className="self-start border-2 border-ink bg-mustard px-2.5 py-1 font-anton uppercase text-[13px] leading-tight text-ink">{benefit}</span>}
        <span className="mt-2 font-anton uppercase text-[18px] leading-tight text-ink sm:text-[20px]">{title}</span>
        <span className="mt-auto flex items-center justify-between gap-2 pt-3">
          <span className="text-[13px] font-semibold text-ink">Get this deal</span>
          <span style={{ borderRadius: 999 }} className="grid h-10 w-10 shrink-0 place-items-center bg-ink text-white transition-colors duration-200 group-hover:bg-brand" aria-hidden="true">
            <Arrow />
          </span>
        </span>
      </span>
    </button>
  );
};

// `lead` (optional): replaces the default heading block - the home page passes
// the sale header (FestiveOfferBand) so sale + price drops + combos are one section.
const ComboOfferSection = ({ title, subtitle, lead }) => {
  const { data, isLoading } = useGetHomeComboOffersQuery();
  const { active, can, themeKey } = useSiteCampaign();
  const combos = data?.data?.combos || [];

  const festive = active && can('sectionAccents');
  const copy = THEME_COPY[themeKey] || {};
  const n = combos.length;

  if (isLoading) return null;
  if (n === 0) return null;

  const eyebrow = festive ? copy.eyebrow || 'Festive Offers' : 'Limited Time';
  const heading = title || (festive ? copy.offersTitle || 'Festive Offers' : 'Combo Offers');
  const sub = subtitle || (festive ? copy.offersSubtitle : '');

  return (
    <div className="relative">
      <section className="un-offers relative overflow-hidden pb-12 pt-12 sm:pb-20 sm:pt-16" aria-label={heading}>
        {festive && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div className="absolute inset-0" style={{ background: 'radial-gradient(60% 55% at 50% 0%, rgb(var(--gl-brand) / 0.22), transparent 70%)' }} />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-star/60 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-star/40 to-transparent" />
            <SectionDecor />
          </div>
        )}

        {lead && festive ? <div className="relative z-10">{lead}</div> : (
        <div className="relative z-10 mx-auto max-w-[1240px] px-4 text-left sm:px-6">
          {/* left-aligned on the same line as the cards, like the other home sections */}
          <div className="mb-1 sm:mb-2">
            <span style={{ borderRadius: 999 }} className="inline-block -rotate-6 border-[3px] border-ink bg-brand px-4 py-1.5 font-anton uppercase leading-none text-white text-sm sm:text-lg shadow-[3px_3px_0_rgb(var(--gl-ink))]">{eyebrow}</span>
            <h2 className="mt-3 font-anton uppercase leading-[.85] text-ink text-[clamp(3rem,9vw,7rem)]">{heading}</h2>
            {sub && <p className="mt-2 max-w-xl text-sm text-ink/75 sm:text-base">{sub}</p>}
            {festive && <div className="mt-3 flex"><FestiveCountdown tone="light" /></div>}
          </div>
        </div>
        )}

        {/* a swipe row on a phone (1.5 cards in view), every offer side by side on
            desktop - the same pattern as "More to explore" */}
        <div className="relative z-10 mx-auto mt-5 max-w-[1240px] sm:mt-6">
          <div className="flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pt-2 pb-3 gl-hscroll sm:scroll-px-6 sm:gap-4 sm:px-6 lg:justify-center">
            {combos.map((c) => (
              <div key={c.id} className="shrink-0 snap-start basis-[64vw] max-w-[260px] sm:basis-[calc((100%_-_2*16px)/3)] lg:basis-[calc((100%_-_4*16px)/5)] lg:max-w-[232px]">
                <OfferRow combo={c} />
              </div>
            ))}
          </div>
        </div>

      </section>
    </div>
  );
};

export default ComboOfferSection;
