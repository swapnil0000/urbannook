import { memo, useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetCategoriesQuery } from '../../store/api/productsApi';

const VISIBLE_MOBILE = 3;

const CategoryCircle = memo(({ name, image, onClick }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center gap-3 min-w-[90px] group cursor-pointer select-none"
    aria-label={`Browse ${name}`}
  >
    <div className="relative w-[82px] h-[82px] md:w-[100px] md:h-[100px]">
      {/* Glow on hover */}
      <div className="absolute inset-0 rounded-full bg-[#a89068]/25 blur-lg scale-0 group-hover:scale-125 transition-transform duration-500 pointer-events-none" />
      {/* Border ring */}
      <div className="absolute inset-0 rounded-full border-2 border-[#2e443c]/15 group-hover:border-[#a89068]/60 transition-colors duration-300 z-10" />
      {/* Inner circle */}
      <div className="absolute inset-[3px] rounded-full bg-[#edeae2] overflow-hidden z-[1]">
        {image ? (
          <img
            src={image}
            alt={name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:-translate-y-[18%] group-hover:scale-[1.12]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <i className="fa-solid fa-tag text-2xl text-[#2e443c]/30"></i>
          </div>
        )}
      </div>
    </div>
    <span className="text-xs font-semibold text-[#2e443c]/80 text-center leading-tight max-w-[90px] group-hover:text-[#2e443c] transition-colors">
      {name}
    </span>
  </button>
));

const ShopByCategory = () => {
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const [dotIdx, setDotIdx] = useState(0);

  const { data, isLoading } = useGetCategoriesQuery(undefined, {
    refetchOnMountOrArgChange: false,
  });
  const categories = data?.data || [];

  const numDots = Math.max(1, Math.ceil(categories.length / VISIBLE_MOBILE));

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const itemW = el.scrollWidth / categories.length;
    setDotIdx(Math.round(el.scrollLeft / (itemW * VISIBLE_MOBILE)));
  }, [categories.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  if (isLoading || categories.length === 0) return null;

  return (
    <section className="py-8 md:py-12 px-4 md:px-6 lg:px-12">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-lg md:text-xl font-serif font-bold text-[#2e443c] mb-6">
          Shop by Category
        </h2>

        <div
          ref={scrollRef}
          className="flex gap-6 md:gap-8 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2"
        >
          {categories.map(cat => (
            <div key={cat.slug} className="snap-start shrink-0">
              <CategoryCircle
                name={cat.name}
                image={cat.image}
                onClick={() => navigate(`/shop?category=${cat.slug}`)}
              />
            </div>
          ))}
        </div>

        {/* Scroll dots — mobile only */}
        {numDots > 1 && (
          <div className="flex justify-center gap-1.5 mt-4 md:hidden">
            {[...Array(numDots)].map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i === dotIdx ? 'w-4 h-1.5 bg-[#2e443c]' : 'w-1.5 h-1.5 bg-[#2e443c]/25'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ShopByCategory;
