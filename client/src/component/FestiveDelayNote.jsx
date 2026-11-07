// Diwali courier-delay note for the product page, cart and checkout. Worded to
// reassure, not alarm, and to promise nothing we may miss: no number of days,
// no dispatch time (both packing and couriers are slower over the festival).
// Renders nothing after SHOW_UNTIL (IST), so
// it doesn't need a follow-up deploy to take it down.
const SHOW_UNTIL = new Date('2026-11-16T00:00:00+05:30');

const festiveDelayActive = () => Date.now() < SHOW_UNTIL.getTime();

/**
 * @param {'card'|'inline'} variant  "card" = cart/checkout box;
 *   "inline" = one line under the product page's dispatch time.
 */
const FestiveDelayNote = ({ variant = 'card', className = '' }) => {
  if (!festiveDelayActive()) return null;

  if (variant === 'inline') {
    return (
      <p className={`text-[12px] leading-snug text-muted ${className}`}>
        {/* <i className="fa-solid fa-gift mr-1 text-brand" aria-hidden="true" /> */}
        Due to the order rush and festive week, delivery may take some time.
      </p>
    );
  }

  return (
    <div className={`flex gap-3 border border-[#f3d9a4] bg-[#fff8ec] p-3 ${className}`} style={{ borderRadius: 4 }} role="note">
      {/* <span className="grid h-9 w-9 shrink-0 place-items-center bg-[#f7e3bb] text-[#9a5b00]" style={{ borderRadius: 4 }} aria-hidden="true">
        <i className="fa-solid fa-truck-fast text-sm" />
      </span> */}
      <div className="min-w-0">
        <p className="text-[13px] font-bold leading-tight text-ink">Delivery may take some time</p>
        <p className="mt-0.5 text-[12px] leading-snug text-muted">
          Due to the order rush and festive week, delivery may take some time. You&apos;ll get tracking as soon as
          your order ships. Thank you for your patience!
        </p>
      </div>
    </div>
  );
};

export default FestiveDelayNote;
