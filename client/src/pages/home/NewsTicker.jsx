import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useShippingDelayNotice } from '../../hooks/useShippingDelayNotice';
import { useSiteCampaign } from '../../hooks/useSiteCampaign';
import FestiveCountdown from '../../component/festive/FestiveCountdown';

/**
 * Site-wide announcement bar — editorial "2040" styling (ink band, mono
 * labels, red asterisk separators) carrying the operational headlines from
 * main: the conditional shipping-delay notice plus the evergreen ones.
 *
 * Festive messages (admin → Operations Hub → Festive) are prepended while a
 * campaign is live: gold accent + ✦ separator, each optionally linked. They
 * come from the server, which already dropped anything expired, disabled, or
 * tied to a promotion that isn't live — when the campaign ends this list is
 * simply empty and the bar is exactly the original one.
 */
const NewsTicker = () => {
  const [isPaused, setIsPaused] = useState(false);
  const shippingDelayMessage = useShippingDelayNotice();
  const { active: festive, messages: festiveMessages, can, page, stripText } = useSiteCampaign();
  const showCountdown = can('countdown');
  const showStrip = Boolean(stripText) && page !== 'home' && can('sectionAccents');

  const items = [
    ...festiveMessages.map((m) => ({ key: `f-${m.id}`, text: m.text, to: m.linkUrl, festive: true })),
    ...(shippingDelayMessage ? [{ key: 'delay', text: shippingDelayMessage, to: '/products' }] : []),
    ...['Ready to ship within 48 hrs', 'Partial COD available', 'Pan-India delivery', 'Made in India']
      .map((text) => ({ key: text, text, to: '/products' })),
  ];

  const renderText = (item, hidden) => {
    const cls = `gl-lbl text-[9px] sm:text-[10px] tracking-[0.18em] ${item.festive ? 'text-star' : 'text-paper'}`;
    if (!item.to) return <span className={cls}>{item.text}</span>;
    const external = /^https:\/\//i.test(item.to);
    const common = {
      className: `${cls} hover:underline underline-offset-4 focus-visible:underline focus-visible:outline-none`,
      tabIndex: hidden ? -1 : undefined,
    };
    return external
      ? <a href={item.to} target="_blank" rel="noopener noreferrer" {...common}>{item.text}</a>
      : <Link to={item.to} {...common}>{item.text}</Link>;
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
