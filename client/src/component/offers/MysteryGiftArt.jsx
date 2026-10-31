/**
 * Wrapped gift box for a "Mystery Gift" offer — stands in for a photo, because
 * the real product must stay a surprise (and the offer's own product, e.g. the
 * katana you buy to unlock it, is not what the shopper gets).
 */
const MysteryGiftArt = ({ className = '' }) => (
  <span className={`grid h-full w-full place-items-center ${className}`} style={{ background: 'radial-gradient(circle at 50% 45%, rgb(var(--gl-star) / 0.28), transparent 68%)' }}>
    <svg viewBox="0 0 64 64" className="h-[62%] w-[62%] motion-safe:animate-[bounce_2.4s_ease-in-out_infinite]" fill="none" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
      <rect x="10" y="27" width="44" height="27" rx="2" fill="rgb(var(--gl-brand))" />
      <rect x="7" y="19" width="50" height="9" rx="1.5" fill="rgb(var(--gl-brand-hi))" />
      <path d="M28 19h8v35h-8z" fill="rgb(var(--gl-star))" />
      <path d="M32 19c-4-8-14-9-14-3 0 4 8 4 14 3Zm0 0c4-8 14-9 14-3 0 4-8 4-14 3Z" stroke="rgb(var(--gl-star))" strokeWidth="2.4" />
    </svg>
  </span>
);

export default MysteryGiftArt;
