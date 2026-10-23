import { useState } from 'react';
import { useGetCouponOffersQuery } from '../../store/api/userApi';
import { useAuth } from '../../hooks/useRedux';
import CouponRevealModal from './CouponRevealModal';

// Ticket notches are cut out of the card itself with a mask, so they show the
// real page background in light and dark — no colour is hard-coded.
const NOTCH = 'radial-gradient(circle 9px at 0 50%, #0000 97%, #000) left / 51% 100% no-repeat, radial-gradient(circle 9px at 100% 50%, #0000 97%, #000) right / 51% 100% no-repeat';
const ticketMask = { WebkitMask: NOTCH, mask: NOTCH };

/** Scalloped discount badge — the "%" seal from the reference. */
const Seal = () => (
  <svg viewBox="0 0 48 48" className="w-11 h-11 shrink-0" aria-hidden="true">
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

const OfferCard = ({ offer, onOpen }) => (
  <button
    type="button"
    onClick={() => onOpen(offer)}
    style={ticketMask}
    className="group relative flex items-center gap-3.5 w-full h-full text-left bg-ink text-paper px-6 py-4 border-y border-star/30 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-star"
    aria-label={`${offer.headline}. View details and reveal code`}
  >
    <Seal />
    <span className="min-w-0 flex-1">
      <span className="block font-archivo text-[19px] sm:text-[21px] font-extrabold leading-tight tracking-tight truncate">{offer.headline}</span>
      <span className="block mt-0.5 text-[12.5px] text-paper/70 leading-snug line-clamp-2">{offer.summary}</span>
      <span className="mt-1.5 flex items-center gap-2">
        <span className="gl-lbl text-[10px] whitespace-nowrap text-star underline underline-offset-2 decoration-star/50">T&amp;C Apply</span>
        <span className="gl-lbl text-[10px] whitespace-nowrap text-paper/50 hidden min-[420px]:inline lg:hidden xl:inline">· Reveal code</span>
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
const CouponOffersSection = () => {
  const { user, isAuthenticated } = useAuth();
  const { data } = useGetCouponOffersQuery(isAuthenticated ? user?.userId || 'user' : 'guest');
  const [active, setActive] = useState(null);
  const [all, setAll] = useState(false);

  const offers = data?.data || [];
  if (!offers.length) return null;

  return (
    <section className="bg-paper text-ink border-y border-hair" aria-label="Offers and discounts">
      <div className="max-w-[1280px] mx-auto px-5 py-8 md:py-12">
        <div className="flex items-end justify-between gap-4 mb-5 md:mb-7">
          <div>
            <p className="gl-lbl text-brand mb-2">Coupons</p>
            <h2 className="font-archivo text-3xl md:text-5xl font-extrabold tracking-tight leading-[0.95]">Offers &amp; Discounts</h2>
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
              <OfferCard offer={o} onOpen={setActive} />
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
