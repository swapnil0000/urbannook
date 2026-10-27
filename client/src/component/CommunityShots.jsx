import { useState } from 'react';

// "Seen in real setups" — customer review photos on the product page. A plain
// swipe row of 4:5 cards (phone photos are portrait; squares cut them badly),
// first card lined up with the page padding instead of sliding under the edge,
// with who took it and what they said underneath.
const Stars = ({ n = 5 }) => {
  const r = Math.max(0, Math.min(5, Math.round(n)));
  return <span className="text-star text-[11px] tracking-[1px]" aria-label={`${r} out of 5`}>{'★'.repeat(r)}<span className="opacity-30">{'★'.repeat(5 - r)}</span></span>;
};

// Wide (landscape) photos would lose both ends in a 4:5 frame — show them
// whole, over a blurred copy of themselves, instead of cropping.
const ShotImage = ({ s, onImgErr }) => {
  const [wide, setWide] = useState(false);
  return (
    <>
      {wide && <img src={s.url} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-60 blur-xl" />}
      <img
        src={s.url}
        alt={`Customer photo from ${s.name}`}
        loading="lazy"
        decoding="async"
        onError={onImgErr}
        onLoad={(e) => setWide(e.currentTarget.naturalWidth > e.currentTarget.naturalHeight * 1.1)}
        className={`absolute inset-0 h-full w-full transition-transform duration-700 group-hover:scale-[1.04] ${wide ? 'object-contain' : 'object-cover'}`}
      />
    </>
  );
};

const CommunityShots = ({ shots, onOpen, onImgErr }) => (
  <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-pl-5 px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:grid-cols-4 md:gap-4 md:overflow-visible md:px-0">
    {shots.map((s, i) => (
      <figure key={`${s.url}-${i}`} className="w-[70%] shrink-0 snap-start sm:w-[42%] md:w-auto">
        <button
          type="button"
          onClick={() => onOpen(i)}
          className="group relative block aspect-[4/5] w-full overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10"
          aria-label={`Open photo from ${s.name}`}
        >
          <ShotImage s={s} onImgErr={onImgErr} />
        </button>
        <figcaption className="mt-2.5 px-0.5">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-bold">{s.name}</span>
            <Stars n={s.rating} />
          </div>
          {s.text && <p className="mt-1 line-clamp-2 text-xs leading-snug opacity-60">“{s.text}”</p>}
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider opacity-40">Verified buyer</p>
        </figcaption>
      </figure>
    ))}
  </div>
);

export default CommunityShots;
