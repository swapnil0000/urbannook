import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGetProductsQuery } from '../../store/api/productsApi';
import SEOHead from '../../component/SEOHead';
import UnProductCard, { firstVariant } from '../../component/UnProductCard';
import { trackViewItemList } from '../../utils/analytics';

const productList = (res) => res?.data?.products || res?.data?.listofPublishedProducts || [];

const AllProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeCat, setActiveCat] = useState(searchParams.get('category') || 'All');
  const [sortBy, setSortBy] = useState('featured');

  const { data: productsResponse, isLoading, error } = useGetProductsQuery({ page: 1, limit: 24 });

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => { setActiveCat(searchParams.get('category') || 'All'); }, [searchParams]);

  const products = useMemo(() => productList(productsResponse), [productsResponse]);

  const categories = useMemo(() => {
    const set = [];
    products.forEach((p) => { if (p.productCategory && !set.includes(p.productCategory)) set.push(p.productCategory); });
    return set;
  }, [products]);

  const displayProducts = useMemo(() => {
    let list = products.filter((p) => activeCat === 'All' || p.productCategory === activeCat);
    const price = (p) => firstVariant(p)?.variantPrice || 0;
    if (sortBy === 'price-low') list = [...list].sort((a, b) => price(a) - price(b));
    if (sortBy === 'price-high') list = [...list].sort((a, b) => price(b) - price(a));
    return list;
  }, [products, activeCat, sortBy]);

  useEffect(() => {
    if (displayProducts.length) {
      trackViewItemList?.({
        listName: 'All Products', listId: 'all_products',
        items: displayProducts.map((p, i) => ({
          itemId: p.productId, itemName: p.productName,
          price: firstVariant(p)?.variantPrice || 0, itemVariant: firstVariant(p)?.variantName || '', index: i,
        })),
      });
    }
  }, [displayProducts]);

  const selectCat = (c) => {
    setActiveCat(c);
    if (c === 'All') { searchParams.delete('category'); setSearchParams(searchParams, { replace: true }); }
    else setSearchParams({ category: c }, { replace: true });
  };

  return (
    <div className="un-eddy bg-un-cream text-un-ink font-inter min-h-screen">
      <SEOHead title="Shop All Products" url="/products"
        description="Browse UrbanNook's full collection of 3D-printed desk lamps, pen stands & décor. Made in India, fast pan-India delivery." />

      {/* editorial header */}
      <section className="bg-un-ink text-un-cream border-b-2 border-un-red pt-28 pb-14">
        <div className="max-w-[1280px] mx-auto px-7">
          <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-un-red">The Catalogue</span>
          <h1 className="font-anton uppercase text-[clamp(44px,8vw,88px)] leading-[0.86] mt-3">Shop All</h1>
          <p className="text-[#bdb6a6] max-w-[520px] mt-3">Every corner, one grid. Filter by category — the palette stays pure, the products do the talking.</p>
        </div>
      </section>

      {/* filters + sort */}
      <div className="max-w-[1280px] mx-auto px-7 pt-10 pb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2.5">
          {['All', ...categories].map((c) => (
            <button key={c} onClick={() => selectCat(c)}
              className={`un-chip font-mono text-[11px] tracking-[0.1em] uppercase px-4 py-2 border transition-colors ${
                activeCat === c ? 'bg-un-red text-white border-un-red font-semibold' : 'bg-white border-un-line hover:border-un-ink'
              }`}>{c}</button>
          ))}
        </div>
        <div className="flex items-center border border-un-line bg-white">
          {[['featured', 'Featured'], ['price-low', '₹ Low'], ['price-high', '₹ High']].map(([v, l]) => (
            <button key={v} onClick={() => setSortBy(v)}
              className={`font-mono text-[11px] tracking-[0.08em] uppercase px-3.5 py-2 transition-colors ${sortBy === v ? 'bg-un-ink text-un-cream' : 'text-un-greyd hover:text-un-ink'}`}>{l}</button>
          ))}
        </div>
      </div>

      {/* grid */}
      <section className="max-w-[1280px] mx-auto px-7 pb-28">
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => <div key={i} className="aspect-[3/4] bg-un-cream2 animate-pulse border border-un-line" />)}
          </div>
        ) : error ? (
          <div className="text-center py-28 border border-un-line bg-white">
            <h2 className="font-archivo font-black uppercase text-2xl">Unable to load products</h2>
            <p className="text-un-greyd mt-2">Please check your connection and try again.</p>
            <button onClick={() => window.location.reload()} className="un-btn bg-un-red text-white font-archivo font-extrabold uppercase text-sm px-7 py-3.5 mt-6"><span className="un-fill bg-un-ink" />Retry</button>
          </div>
        ) : displayProducts.length === 0 ? (
          <div className="text-center py-28 border border-un-line bg-white">
            <h2 className="font-archivo font-black uppercase text-2xl">Dropping soon</h2>
            <p className="text-un-greyd mt-2">New pieces land here — check back Friday.</p>
          </div>
        ) : (
          <div className="un-tiltwrap grid grid-cols-2 lg:grid-cols-4 gap-5">
            {displayProducts.map((p, i) => <UnProductCard key={p.productId || i} p={p} index={i} listId="all_products" listName="All Products" />)}
          </div>
        )}
      </section>
    </div>
  );
};

export default AllProductsPage;
