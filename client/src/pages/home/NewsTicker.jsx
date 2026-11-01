import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useShippingDelayNotice } from '../../hooks/useShippingDelayNotice';
import { useSiteCampaign, THEME_COPY } from '../../hooks/useSiteCampaign';
import { useGetProductsQuery } from '../../store/api/productsApi';
import { maxDiscountPercent } from '../../utils/festiveDeals';
import { useGetHomeComboOffersQuery, useGetCouponOffersQuery } from '../../store/api/userApi';
import { buildSaleBarMessages } from '../../utils/saleBarMessages';
import { STORE_PROMISES, SALE_BAR_PROMISES } from '../../utils/storePromises';
import FestiveCountdown, { useCountdown } from '../../component/festive/FestiveCountdown';

const pad = (n) => String(n).padStart(2, '0');
const ROTATE_MS = 4000;

/** In-site path → <Link>, https URL → new tab; nothing → plain span. */
const MessageLink = ({ to, className, children, tabIndex }) => {
  if (!to) return <span className={className}>{children}</span>;
  return /^https:\/\//i.test(to)
    ? <a href={to} target="_blank" rel="noopener noreferrer" className={className} tabIndex={tabIndex}>{children}</a>
    : <Link to={to} className={className} tabIndex={tabIndex}>{children}</Link>;
};

/** "12d : 23h : 15m : 08s" - the campaign end on the server's clock. */
const SaleTimer = ({ label }) => {
  const t = useCountdown({ seconds: true });
  if (!t.visible) return null;
  const unit = (v, l) => (
    <span className="inline-flex items-baseline gap-px">
      <b className="font-archivo text-[13px] font-extrabold tabular-nums text-paper sm:text-[15px]">{pad(v)}</b>
      <span className="text-[9px] font-semibold text-paper/60">{l}</span>
    </span>
  );
  const sep = <span className="text-paper/40" aria-hidden="true">:</span>;
  return (
    <span
      className="inline-flex shrink-0 items-center gap-2 rounded-md border border-paper/20 px-2 py-1 sm:gap-2.5 sm:px-2.5"
      role="timer"
      aria-label={`${label} ${t.d} days ${t.h} hours ${t.m} minutes`}
    >
      <span className="gl-lbl hidden text-[9px] tracking-[0.16em] text-paper/70 md:inline">{label}</span>
      <span className="hidden h-3.5 w-px bg-paper/20 md:inline-block" aria-hidden="true" />
      <span className="inline-flex items-baseline gap-1">
        {t.d > 0 && <>{unit(t.d, 'd')}{sep}</>}
        {unit(t.h, 'h')}{sep}{unit(t.m, 'm')}
        {/* seconds only where there is room - on phones the offer message needs the width */}
        <span className="hidden items-baseline gap-1 sm:inline-flex">{sep}{unit(t.s, 's')}</span>
      </span>
    </span>
  );
};

/**
 * Sale bar while a festive campaign is live: one admin message at a time
 * (admin → Operations Hub → Festive → ticker messages, each tied to its
 * promotion so it disappears the moment that offer ends), the campaign
 * countdown and a "Shop now" link to the message's own page. Every word and
 * date comes from the campaign - nothing about the offers is written here.
 */
const SaleBar = ({ messages, countdownLabel, showCountdown, upTo = 0 }) => {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = messages.length;
  useEffect(() => {
    if (n < 2 || paused) return undefined;
    const t = setInterval(() => setI((x) => (x + 1) % n), ROTATE_MS);
    return () => clearInterval(t);
  }, [n, paused]);
  const m = messages[i % n];
  const shopTo = m.to || '/products';

  return (
    <div
      className="flex items-center justify-center gap-3 px-3 py-2 sm:gap-4 sm:px-6"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-paper/40 px-2.5 py-0.5 sm:inline-flex">
        <span className="h-1.5 w-1.5 rounded-full bg-star motion-safe:animate-pulse" aria-hidden="true" />
        <span className="gl-lbl text-[9px] tracking-[0.18em] text-paper">Sale</span>
      </span>
      <div className="min-w-0 flex-1 sm:flex-none" aria-live="polite">
        <MessageLink
          key={m.key}
          to={m.to}
          className="un-salebar-msg line-clamp-2 block text-[12.5px] font-semibold leading-snug text-paper hover:underline focus-visible:underline focus-visible:outline-none sm:truncate sm:text-[15px]"
        >
          {m.text}
        </MessageLink>
      </div>
      {upTo > 0 && (
        <span className="hidden shrink-0 rounded-full bg-paper px-3 py-1 text-[13px] font-extrabold leading-none text-sale sm:inline-block md:text-[15px]">Up to {upTo}% OFF</span>
      )}
      {showCountdown && <SaleTimer label={countdownLabel} />}
      <Link
        to={shopTo}
        className="hidden shrink-0 items-center gap-1 rounded-full bg-paper px-3.5 py-1 text-[13px] font-bold text-ink transition-colors hover:bg-star md:inline-flex"
      >
        Shop now <i className="fa-solid fa-chevron-right text-[10px]" aria-hidden="true" />
      </Link>
    </div>
  );
};

/**
 * Site-wide announcement bar - editorial "2040" styling (ink band, mono
 * labels, red asterisk separators) carrying the operational headlines from
 * main: the conditional shipping-delay notice plus the evergreen ones.
 *
 * While a festive campaign is live and has messages (admin → Operations Hub →
 * Festive), the bar becomes the sale bar above instead: one offer message at
 * a time, the countdown and "Shop now". The server already dropped anything
 * expired, disabled, or tied to a promotion that isn't live - when the
 * campaign ends the list is simply empty and the bar is exactly the original one.
 */
const NewsTicker = () => {
  const [isPaused, setIsPaused] = useState(false);
  const shippingDelayMessage = useShippingDelayNotice();
  const { active: festive, messages: festiveMessages, can, page, stripText, countdownLabel, themeKey } = useSiteCampaign();
  const showCountdown = can('countdown');
  const showStrip = Boolean(stripText) && page !== 'home' && can('sectionAccents');
  // Same args as the header/home, so this is a cache hit, not a new request.
  const { data: prodRes } = useGetProductsQuery({ page: 1, limit: 24 }, { skip: !festive });
  const upTo = maxDiscountPercent(prodRes?.data?.listofPublishedProducts || prodRes?.data?.products || []);
  // No admin messages but a live sale: still show the sale bar, rotating the
  // theme headline and every live offer (combos + public coupons), so shoppers
  // see what the sale actually is, not a timer lost in the corner.
  const needOffers = festive && !festiveMessages.length;
  const { data: comboRes } = useGetHomeComboOffersQuery(undefined, { skip: !needOffers });
  const { data: couponRes } = useGetCouponOffersQuery('guest', { skip: !needOffers });
  const barMessages = buildSaleBarMessages({
    adminMessages: festiveMessages,
    saleTitle: showCountdown ? THEME_COPY[themeKey]?.saleTitle : '',
    combos: comboRes?.data?.combos || [],
    coupons: couponRes?.data || [],
    promises: SALE_BAR_PROMISES,
    nameById: new Map((prodRes?.data?.listofPublishedProducts || prodRes?.data?.products || []).map((x) => [String(x.productId), x.productName])),
  });

  if (festive && barMessages.length) {
    return (
      <div className="relative block border-b border-star/30 bg-ink text-paper" role="region" aria-label="Sale announcements">
        <style>{`
          @keyframes unSaleMsg { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
          .un-salebar-msg { animation: unSaleMsg .35s ease-out both }
          @media (prefers-reduced-motion: reduce) { .un-salebar-msg { animation: none } }
        `}</style>
        <SaleBar messages={barMessages} countdownLabel={countdownLabel} showCountdown={showCountdown} upTo={upTo} />
      </div>
    );
  }

  const items = [
    ...festiveMessages.map((m) => ({ key: `f-${m.id}`, text: m.text, to: m.linkUrl, festive: true })),
    ...(shippingDelayMessage ? [{ key: 'delay', text: shippingDelayMessage, to: '/products' }] : []),
    ...STORE_PROMISES.map((text) => ({ key: text, text, to: '/products' })),
  ];

  const renderText = (item, hidden) => {
    const cls = `gl-lbl text-[9px] sm:text-[10px] tracking-[0.18em] ${item.festive ? 'text-star' : 'text-paper'}`;
    return (
      <MessageLink to={item.to} tabIndex={hidden ? -1 : undefined} className={item.to ? `${cls} hover:underline underline-offset-4 focus-visible:underline focus-visible:outline-none` : cls}>
        {item.text}
      </MessageLink>
    );
  };

  return (
    <div className="block relative overflow-hidden group" role="region" aria-label="Announcements">
      <div className={`bg-ink text-paper overflow-hidden relative py-2 sm:py-2.5 ${festive ? 'border-b border-star/30' : ''}`}>
        <style>{`
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .animate-ticker { animation: marquee 26s linear infinite; }
          @media (prefers-reduced-motion: reduce) {
            .animate-ticker { animation: none; }
          }
        `}</style>

        <div
          className="relative flex items-center motion-reduce:overflow-x-auto"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onFocus={() => setIsPaused(true)}
          onBlur={() => setIsPaused(false)}
        >
          <div
            className={`flex whitespace-nowrap animate-ticker ${
              isPaused ? '[animation-play-state:paused]' : ''
            }`}
          >
            {/* Duplicated so the loop is seamless; the copy is hidden from AT and the tab order */}
            {[0, 1].map((copy) => items.map((item) => (
              <div key={`${copy}-${item.key}`} className="flex items-center px-6 sm:px-8" aria-hidden={copy === 1 ? true : undefined}>
                {renderText(item, copy === 1)}
                {item.festive ? (
                  <span className="ml-6 sm:ml-8 text-star text-xs leading-none" aria-hidden="true">✦</span>
                ) : (
                  <i className="fa-solid fa-asterisk ml-6 sm:ml-8 text-brand text-xs leading-none" aria-hidden="true" />
                )}
              </div>
            )))}
          </div>
        </div>

        {/* Gradient overlays for a smooth entry/exit against the ink band */}
        <div className="absolute inset-y-0 left-0 w-12 sm:w-16 bg-gradient-to-r from-ink to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-12 sm:w-16 bg-gradient-to-l from-ink to-transparent z-10 pointer-events-none" />

        {/* Pinned festive chip: the campaign countdown (server clock, admin end
            time) and, on collection/product pages, the admin's page line.
            Lives in the existing bar, so it adds no height and never covers
            page content. */}
        {(showCountdown || showStrip) && (
          <div className="absolute inset-y-0 right-0 z-20 flex items-center gap-2 pl-2 pr-2 sm:pr-4 bg-ink">
            <span className="absolute inset-y-0 -left-8 w-8 bg-gradient-to-r from-transparent to-ink pointer-events-none" aria-hidden="true" />
            {showStrip && <span className="hidden sm:inline gl-lbl text-[9px] tracking-[0.14em] text-star">✦ {stripText}</span>}
            {showCountdown && <FestiveCountdown tone="light" compact />}
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsTicker;
