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
    if (displayProducts.length) trackViewItemList?.({ listName: 'All Products', listId: 'all_products', items: displayProducts.map((p, i) => ({ itemId: p.productId, itemName: p.productName, price: firstVariant(p)?.variantPrice || 0, index: i })) });
  }, [displayProducts]);

  const selectCat = (c) => {
    setActiveCat(c);
    if (c === 'All') { searchParams.delete('category'); setSearchParams(searchParams, { replace: true }); }
    else setSearchParams({ category: c }, { replace: true });
  };

  const chip = (c) => `gl-press px-4 py-2 rounded-full text-sm font-semibold transition-colors ${activeCat === c ? 'bg-brand text-white' : 'border border-hair hover:border-ink'}`;

  return (
    <div className="font-jakarta bg-paper text-ink min-h-screen">
      <SEOHead title="Shop All Products" url="/products" description="Browse UrbanNook's full collection of 3D-printed desk lamps, pen stands & décor. Made in India, fast pan-India delivery." />

      <div className="max-w-[1280px] mx-auto px-5 pt-10">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Shop All</h1>
        <p className="text-muted mt-2">3D-printed desk lamps, pen stands &amp; décor.</p>

        <div className="flex flex-wrap items-center justify-between gap-4 mt-6">
          <div className="flex flex-wrap gap-2.5">
            <button onClick={() => selectCat('All')} className={chip('All')}>All</button>
            {categories.map((c) => <button key={c} onClick={() => selectCat(c)} className={chip(c)}>{c}</button>)}
          </div>
          <div className="flex items-center border border-hair rounded-full overflow-hidden bg-white">
            {[['featured', 'Featured'], ['price-low', '₹ Low'], ['price-high', '₹ High']].map(([v, l]) => (
              <button key={v} onClick={() => setSortBy(v)} className={`px-3.5 py-2 text-xs font-semibold transition-colors ${sortBy === v ? 'bg-ink text-white' : 'text-muted hover:text-ink'}`}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <section className="max-w-[1280px] mx-auto px-5 py-8 pb-28">
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">{[...Array(8)].map((_, i) => <div key={i} className="aspect-[4/5] bg-[#F2F2F2] animate-pulse rounded-2xl border border-hair" />)}</div>
        ) : error ? (
          <div className="text-center py-28 border border-hair rounded-2xl bg-white">
            <h2 className="text-2xl font-extrabold">Unable to load products</h2>
            <p className="text-muted mt-2">Please check your connection and try again.</p>
            <button onClick={() => window.location.reload()} className="gl-press bg-brand text-white font-bold text-sm px-7 py-3.5 rounded-xl mt-6 hover:bg-brandHi">Retry</button>
          </div>
        ) : displayProducts.length === 0 ? (
          <div className="text-center py-28 border border-hair rounded-2xl bg-white">
            <h2 className="text-2xl font-extrabold">Dropping soon</h2>
            <p className="text-muted mt-2">New pieces land here — check back Friday.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {displayProducts.map((p, i) => <UnProductCard key={p.productId || i} p={p} index={i} listId="all_products" listName="All Products" />)}
          </div>
        )}
      </section>
    </div>
  );
};

export default AllProductsPage;
