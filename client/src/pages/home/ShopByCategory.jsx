import { memo, useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetCategoriesQuery } from '../../store/api/productsApi';

const ITEMS_VISIBLE_MOBILE = 3;

const CategoryCircle = memo(({ name, image, onClick }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center gap-3 min-w-[90px] group cursor-pointer select-none"
    aria-label={`Browse ${name}`}
  >
    <div className="relative w-[82px] h-[82px] md:w-[100px] md:h-[100px]">

      {/* Glow on hover */}
      <div className="absolute inset-0 rounded-full bg-[#a89068]/25 blur-lg scale-0 group-hover:scale-125
                      transition-transform duration-500 pointer-events-none" />

      {/* Border ring */}
      <div className="absolute inset-0 rounded-full border-2 border-[#2e443c]/15
                      group-hover:border-[#a89068]/60 transition-colors duration-300 z-10" />

      {/* Inner circle */}
      <div className="absolute inset-[3px] rounded-full bg-[#edeae2] overflow-hidden z-[1]">
        {image ? (
          <img
            src={image}
            alt={name}
            loading="lazy"
            decoding="async"
            className="w-full h-[125%] object-cover object-bottom absolute bottom-0 left-0
                       group-hover:-translate-y-[18%] group-hover:scale-[1.12]
                       transition-transform duration-500 ease-out will-change-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#2e443c]/10">
            <span className="text-xl font-serif text-[#2e443c] font-bold select-none">{name[0]}</span>
          </div>
        )}
        {/* Inner vignette */}
        <div className="absolute inset-0 rounded-full
                        shadow-[inset_0_-18px_28px_rgba(0,0,0,0.18)]
                        group-hover:shadow-[inset_0_-8px_16px_rgba(0,0,0,0.06)]
                        transition-all duration-500 pointer-events-none z-10" />
      </div>

      {/* Ground shadow */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-[65%] h-3 bg-black/10 rounded-full blur-sm
                      group-hover:w-[82%] group-hover:bg-[#a89068]/20 transition-all duration-500 z-0" />
    </div>

    <span className="text-[11px] md:text-xs font-semibold text-[#2e443c] text-center leading-tight max-w-[84px]
                     group-hover:text-[#a89068] transition-colors duration-300">
      {name}
    </span>
  </button>
));
CategoryCircle.displayName = 'CategoryCircle';

const ScrollDots = memo(({ total, active }) => (
  <div className="flex items-center justify-center gap-[7px] mt-5 md:hidden">
    {Array.from({ length: total }).map((_, i) => (
      <span
        key={i}
        className="rounded-full transition-all duration-300"
        style={{
          width: i === active ? 18 : 7,
          height: 7,
          background:
            i === active
              ? '#2e443c'
              : i === active + 1
              ? 'rgba(46,68,60,0.35)'
              : 'rgba(46,68,60,0.18)',
        }}
      />
    ))}
  </div>
));
ScrollDots.displayName = 'ScrollDots';

const ShopByCategory = memo(() => {
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const [activeDot, setActiveDot] = useState(0);

  const { data, isLoading } = useGetCategoriesQuery(undefined, {
    refetchOnMountOrArgChange: false,
    refetchOnFocus: false,
    refetchOnReconnect: false,
  });

  // Response shape: { data: [...categories] }
  const categories = data?.data || [];

  const numDots = Math.max(1, Math.ceil(categories.length / ITEMS_VISIBLE_MOBILE));

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || numDots <= 1) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = scrollWidth - clientWidth;
    const progress = maxScroll > 0 ? scrollLeft / maxScroll : 0;
    setActiveDot(Math.round(progress * (numDots - 1)));
  }, [numDots]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return (
    <section className="pt-8 pb-10 md:py-20 bg-[#f5f3ee] relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-64 h-64 rounded-full bg-[#2e443c]/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-48 h-48 rounded-full bg-[#a89068]/8 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-5 md:px-8">

        {/* Header */}
        <div className="flex justify-between items-end mb-6 md:mb-12">
          <div>
            {/* <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-[#a89068] mb-1.5">Explore</p> */}
            <h2 className="text-3xl md:text-4xl font-serif text-[#2e443c] leading-tight">Shop by Category</h2>
          </div>
          <button
            onClick={() => navigate('/products')}
            className="text-xs font-semibold uppercase tracking-widest text-[#2e443c]/55
                       hover:text-[#a89068] flex items-center gap-1.5 transition-colors duration-300"
          >
            View All <span>→</span>
          </button>
        </div>

        {/* Skeleton */}
        {isLoading && (
          <div className="flex gap-6 overflow-hidden pb-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-3 min-w-[90px]">
                <div className="w-[82px] h-[82px] rounded-full bg-[#2e443c]/10 animate-pulse" />
                <div className="w-14 h-3 rounded-full bg-[#2e443c]/8 animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {/* Category circles */}
        {!isLoading && categories.length > 0 && (
          <>
            <div
              ref={scrollRef}
              className="flex gap-5 md:gap-8 overflow-x-auto pb-2
                         md:flex-wrap md:overflow-visible md:justify-center"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
            >
              {categories.map((cat) => (
                <CategoryCircle
                  key={cat._id}
                  name={cat.name}
                  image={cat.image || null}
                  onClick={() => navigate(`/shop/${cat.slug}`)}
                />
              ))}
            </div>

            {numDots > 1 && <ScrollDots total={numDots} active={activeDot} />}
          </>
        )}

        <div className="mt-10 h-px bg-gradient-to-r from-transparent via-[#2e443c]/12 to-transparent" />
      </div>
    </section>
  );
});
ShopByCategory.displayName = 'ShopByCategory';

export default ShopByCategory;
