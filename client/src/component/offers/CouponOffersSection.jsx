import { useState } from 'react';
import { useGetCouponOffersQuery } from '../../store/api/userApi';
import { useAuth } from '../../hooks/useRedux';
import CouponRevealModal from './CouponRevealModal';

// Ticket notches are cut out of the card itself with a mask, so they show the
// real page background in light and dark — no colour is hard-coded.
const NOTCH = 'radial-gradient(circle 9px at 0 50%, #0000 97%, #000) left / 51% 100% no-repeat, radial-gradient(circle 9px at 100% 50%, #0000 97%, #000) right / 51% 100% no-repeat';
const ticketMask = { WebkitMask: NOTCH, mask: NOTCH };

/** Scalloped discount badge — the "%" seal from the reference. */
const Seal = ({ compact = false }) => (
  <svg viewBox="0 0 48 48" className={`${compact ? 'w-10 h-10' : 'w-11 h-11'} shrink-0`} aria-hidden="true">
    <path
      d="M24 2l4.6 3.4 5.7-.6 2.2 5.3 5.3 2.2-.6 5.7L45 24l-3.4 4.6.6 5.7-5.3 2.2-2.2 5.3-5.7-.6L24 46l-4.6-3.4-5.7.6-2.2-5.3-5.3-2.2.6-5.7L3 24l3.4-4.6-.6-5.7 5.3-2.2 2.2-5.3 5.7.6L24 2z"
      fill="rgb(var(--gl-star))"
    />
    <g stroke="rgb(var(--gl-ink))" strokeWidth="2.6" strokeLinecap="round" fill="none">
      <path d="M17 31L31 17" />
    </g>
    <circle cx="18" cy="18" r="2.6" fill="rgb(var(--gl-ink))" />
    <circle cx="30" cy="30" r="2.6" fill="rgb(var(--gl-ink))" />
  </svg>
);

const inrFmt = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });

/** Small outlined percent mark — quiet, not an oversized badge. */
const DiscountMark = () => (
  <span className="grid h-8 w-8 shrink-0 place-items-center border border-star/60 bg-star/10 text-star" style={{ borderRadius: '50%' }} aria-hidden="true">
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 5 5 19" /><circle cx="7" cy="7" r="2.2" /><circle cx="17" cy="17" r="2.2" /></svg>
  </span>
);

/**
 * Compact ticket-style coupon: dark burgundy surface, side notches, a perforated
 * divider, the real discount as the headline, real eligibility underneath and a
 * clear "Reveal Coupon" action. Every value comes from the admin's coupon via
 * POST /coupon/offers; the code itself is never in this data (it is revealed only
 * after mobile verification, in the modal).
 */
const StripCard = ({ offer, onOpen }) => {
  const headline = offer.discountType === 'PERCENTAGE' ? `${offer.discountValue}% OFF` : `${inrFmt(offer.discountValue)} OFF`;
  const detail = [
    offer.minCartValue > 0 ? `On orders above ${inrFmt(offer.minCartValue)}` : 'On all orders',
    offer.discountType === 'PERCENTAGE' && offer.maxDiscountCap ? `up to ${inrFmt(offer.maxDiscountCap)}` : '',
  ].filter(Boolean).join(' · ');
  return (
    <button
      type="button"
      onClick={() => onOpen(offer)}
      style={ticketMask}
      className="un-coupon group relative flex h-full w-full items-stretch text-left text-paper transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-star"
      aria-label={`${headline}. ${detail}. Reveal coupon`}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2.5 py-2.5 pl-4 pr-2.5">
        <DiscountMark />
        <span className="min-w-0">
          <span className="block truncate font-archivo text-[18px] font-semibold leading-none tracking-tight text-[#f6dfa6]">{headline}</span>
          <span className="mt-1 block truncate text-[11.5px] font-normal leading-tight text-paper/70">{detail}</span>
          <span className="mt-1 block truncate text-[10px] font-normal leading-none text-paper/45">
            <span className="underline underline-offset-2 decoration-paper/30">T&amp;C Apply</span>{offer.validUntil ? ` · Ends ${fmtDate(offer.validUntil)}` : ''}
          </span>
        </span>
      </span>
      {/* perforated divider */}
      <span className="un-coupon-perf relative w-0 self-stretch" aria-hidden="true">
        <span className="absolute -top-[6px] left-1/2 h-3 w-3 -translate-x-1/2 bg-ink" style={{ borderRadius: '50%' }} />
        <span className="absolute -bottom-[6px] left-1/2 h-3 w-3 -translate-x-1/2 bg-ink" style={{ borderRadius: '50%' }} />
      </span>
      <span className="flex w-[58px] shrink-0 flex-col items-center justify-center gap-1 text-center">
        <span className="text-[10px] font-semibold uppercase leading-none tracking-[0.1em] text-star">Reveal</span>
        <span className="text-[14px] leading-none text-star transition-transform group-hover:translate-x-0.5" aria-hidden="true">→</span>
      </span>
    </button>
  );
};

const OfferCard = ({ offer, onOpen, light = false }) => (
  <button
    type="button"
    onClick={() => onOpen(offer)}
    style={light ? { ...ticketMask, background: 'linear-gradient(180deg,color-mix(in srgb,rgb(var(--gl-paper)) 52%,#fff),rgb(var(--gl-paper)))' } : ticketMask}
    className={`group relative flex items-center gap-3.5 w-full h-full text-left px-6 py-3.5 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-star ${light ? 'text-ink' : 'bg-ink text-paper border-y border-star/30'}`}
    aria-label={`${offer.headline}. View details and reveal code`}
  >
    <Seal />
    <span className="min-w-0 flex-1">
      <span className={`block font-archivo text-[18px] sm:text-[20px] leading-tight tracking-tight truncate ${light ? 'font-bold' : 'font-extrabold'}`}>{offer.headline}</span>
      <span className={`block mt-0.5 text-[12.5px] leading-snug line-clamp-2 ${light ? 'text-muted' : 'text-paper/70'}`}>{offer.summary}</span>
      <span className="mt-1.5 flex items-center gap-2">
        <span className={`gl-lbl text-[10px] whitespace-nowrap underline underline-offset-2 ${light ? 'text-brand decoration-brand/40' : 'text-star decoration-star/50'}`}>T&amp;C Apply</span>
        <span className={`gl-lbl text-[10px] whitespace-nowrap hidden min-[420px]:inline lg:hidden xl:inline ${light ? 'text-muted' : 'text-paper/50'}`}>· Reveal code</span>
      </span>
    </span>
    <span className="shrink-0 text-star text-lg transition-transform group-hover:translate-x-0.5" aria-hidden="true">→</span>
  </button>
);

/**
 * "Offers & Discounts" — compact ticket cards for the live, public coupons the
 * admin configured. Codes are NOT in this list; the modal reveals one only
 * after the customer's mobile number is verified (enforced by the server).
 */
const CouponOffersSection = ({ variant = 'section' }) => {
  const { user, isAuthenticated } = useAuth();
  const { data } = useGetCouponOffersQuery(isAuthenticated ? user?.userId || 'user' : 'guest');
  const [active, setActive] = useState(null);
  const [all, setAll] = useState(false);

  const offers = data?.data || [];
  if (!offers.length) return null;

  // Product page, under the buy buttons: two light tickets, the rest on demand.
  if (variant === 'pdp') {
    const shown = all ? offers : offers.slice(0, 2);
    return (
      <div className="mt-4" aria-label="Coupons">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="gl-lbl flex items-center gap-1.5 text-[11px] text-ink"><span className="text-brand" aria-hidden="true">✦</span> {offers.length === 1 ? 'Coupon available' : `${offers.length} coupons available`}</p>
          {offers.length > 2 && (
            <button type="button" onClick={() => setAll((v) => !v)} aria-expanded={all} className="gl-lbl text-[10px] text-brand underline-offset-4 hover:underline">
              {all ? 'Show fewer' : 'See all'}
            </button>
          )}
        </div>
        <div className="space-y-2">
          {shown.map((o) => <OfferCard key={o.id} offer={o} onOpen={setActive} light />)}
        </div>
        {active && <CouponRevealModal offer={active} onClose={() => setActive(null)} />}
      </div>
    );
  }

  // Compact strip tucked under the Diwali offers carousel (cream tickets).
  if (variant === 'strip') {
    const visible = all ? offers : offers.slice(0, 3);
    return (
      <div className="relative z-10 mx-auto mt-8 max-w-[1100px] px-4 sm:mt-10 sm:px-6" aria-label="Coupons">
        <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
          <p className="gl-lbl inline-flex items-center gap-2 text-[11px] text-star/90" style={{ letterSpacing: '0.2em' }}><span aria-hidden="true">✦</span> Coupons</p>
          {offers.length > 1 && (
            <button type="button" onClick={() => setAll((v) => !v)} aria-expanded={all} className="text-[12px] font-medium text-paper/80 underline-offset-4 transition-colors hover:text-star hover:underline">
              {all ? 'Show fewer' : 'See All Coupons'} <span aria-hidden="true">{all ? '↑' : '→'}</span>
            </button>
          )}
        </div>
        {/* phones: swipeable row, next ticket peeking; tablet/desktop: aligned rows */}
        <div className={all
          ? 'grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3'
          : 'gl-hscroll -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-3'}
        >
          {(all ? visible : offers).map((o, i) => (
            <div key={o.id} className={all ? '' : `w-[72vw] max-w-[300px] shrink-0 snap-start sm:w-auto sm:max-w-none ${i >= 3 ? 'sm:hidden' : ''}`}>
              <StripCard offer={o} onOpen={setActive} />
            </div>
          ))}
        </div>
        {active && <CouponRevealModal offer={active} onClose={() => setActive(null)} />}
      </div>
    );
  }

  return (
    <section className="bg-paper text-ink border-y border-hair" aria-label="Offers and discounts">
      <div className="max-w-[1280px] mx-auto px-5 py-5 md:py-8">
        <div className="flex items-end justify-between gap-4 mb-3 md:mb-5">
          <div>
            <h2 className="font-archivo text-2xl md:text-4xl font-bold tracking-tight leading-none text-ink">Offers &amp; Discounts</h2>
          </div>
          {offers.length > 2 && (
            <button
              type="button"
              onClick={() => setAll((v) => !v)}
              className="gl-lbl text-[11px] shrink-0 inline-flex items-center gap-1.5 border-b-2 border-current pb-0.5 hover:text-brand hover:border-brand transition-colors"
              aria-expanded={all}
            >
              {all ? 'Show less' : 'See All'} <span aria-hidden="true">{all ? '↑' : '→'}</span>
            </button>
          )}
        </div>

        <div
          className={
            all
              ? 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3'
              : 'flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-pl-5 -mx-5 px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:px-0 lg:grid lg:grid-cols-3 lg:overflow-visible'
          }
        >
          {offers.map((o, i) => (
            <div key={o.id} className={all ? '' : `snap-start shrink-0 w-[84%] sm:w-[46%] lg:w-auto ${i >= 3 ? 'lg:hidden' : ''}`}>
              <OfferCard offer={o} onOpen={setActive} light />
            </div>
          ))}
        </div>
        {!all && offers.length > 3 && (
          <p className="hidden lg:block mt-4 gl-lbl text-[10px] text-muted">+ {offers.length - 3} more — tap See All</p>
        )}
      </div>

      {active && <CouponRevealModal offer={active} onClose={() => setActive(null)} />}
    </section>
  );
};

export default CouponOffersSection;
