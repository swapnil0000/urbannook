// One-line dispatch promise for the cart and checkout ("Ships within 2 days").
// Replaces the Diwali courier-delay note. The product page already says
// "Ships in 24-48 hrs" next to the stock line, so it isn't repeated there.
const ShipsWithinNote = ({ className = '' }) => (
  <p className={`flex items-center gap-2 text-[12.5px] font-semibold text-ink ${className}`}>
    <i className="fa-solid fa-truck-fast text-brand" aria-hidden="true" />
    Ships within 2 days
  </p>
);

export default ShipsWithinNote;
