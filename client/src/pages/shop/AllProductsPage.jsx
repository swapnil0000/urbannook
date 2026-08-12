import { useState, useMemo, useEffect } from 'react';
import { useGetProductsQuery } from '../../store/api/productsApi';
import SEOHead from '../../component/SEOHead';
import { trackViewItemList } from '../../utils/analytics';
import ProductCard from '../../component/ProductCard';

const AllProductsPage = () => {
  const [sortBy, setSortBy] = useState('featured');
  const [showSortModal, setShowSortModal] = useState(false);
  
  const { data: productsResponse, isLoading, error } = useGetProductsQuery({
    page: 1,
    limit: 12,
    sortBy: sortBy === 'featured' ? undefined : sortBy
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Extract products from response
  const products = productsResponse?.data?.products || productsResponse?.data?.listofPublishedProducts || [];

  const displayProducts = useMemo(() => {
    let sorted = products.map(p => {
      const firstVariantPrice = p.variantDetails?.[0]?.variantPrice || 0;
      const firstVariantMrp = p.variantDetails?.[0]?.variantMrp || 0;
      return {
        ...p,
        effectivePrice: firstVariantPrice,
        effectiveMrp: firstVariantMrp,
      };
    });

    if (sortBy === 'price-low') sorted.sort((a, b) => a.effectivePrice - b.effectivePrice);
    if (sortBy === 'price-high') sorted.sort((a, b) => b.effectivePrice - a.effectivePrice);
    return sorted;
  }, [products, sortBy]);

  useEffect(() => {
    if (displayProducts.length > 0) {
      trackViewItemList({
        listName: 'All Products',
        listId: 'all_products',
        items: displayProducts.map((product, index) => ({
          itemId: product.productId,
          itemName: product.productName,
          price: product.variantDetails?.[0]?.variantPrice || 0,
          itemVariant: product.variantDetails?.[0]?.variantName || '',
          index,
        })),
      });
    }
  }, [displayProducts]);

  if (error) {
    console.error("API Error:", error);
  }

  return (
    <div className="min-h-screen bg-[#2e443c] relative font-sans selection:bg-[#F5DEB3] selection:text-[#2e443c] pb-10">
      <SEOHead
        title="Shop All Products"
        description="Browse UrbanNook's full collection of premium 3D printed home decor, lighting & lifestyle products. Modern designs, fast pan-India delivery."
        url="/products"
      />

      {/* --- Ambient Background Glow --- */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#F5DEB3]/5 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Hero Section */}
      <section className="pt-[5rem] pb-8 md:pt-[7rem] md:pb-5 px-6 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
          
          {/* LEFT SIDE: Heading & Description */}
          <div >
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-serif text-white leading-[0.9] mt-6 mb-2 ">
              Curated{' '}
              <span className="italic font-light text-[#F5DEB3]">Atmospheres.</span>
            </h1>
            <p className="text-sm md:text-base text-green-50/70 font-light leading-relaxed max-w-md">
              Explore our exclusive collection designed for modern indoor environments.
            </p>
          </div>
        </div>
      </section>

      {/* Product Grid */}
      <section className="pb-24 px-4 md:px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="flex justify-center py-32">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#F5DEB3]"></div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-32 bg-black/10 rounded-[2rem] border border-white/5 backdrop-blur-sm">
              <i className="fa-solid fa-triangle-exclamation text-4xl text-[#F5DEB3]/50 mb-4"></i>
              <h2 className="text-2xl font-serif text-white mb-2">Unable to load products</h2>
              <p className="text-green-50/60 mb-6 font-light">Please check your connection and try again</p>
              <button 
                onClick={() => window.location.reload()} 
                className="bg-[#F5DEB3] text-[#2e443c] px-8 py-3 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-white transition-colors"
              >
                Retry Connection
              </button>
            </div>
          ) : displayProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 bg-black/10 rounded-[2rem] border border-white/5 backdrop-blur-sm">
              <i className="fa-solid fa-box-open text-4xl text-[#F5DEB3]/50 mb-4"></i>
              <h2 className="text-2xl font-serif text-white mb-2">The collection is updating</h2>
              <p className="text-green-50/60 font-light">Check back later for new arrivals.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {displayProducts?.map((product, index) => (
                <ProductCard key={product.productId} product={product} index={index} />
              ))}
            </div>
          )}
        </div>
      </section>

    </div>
  );
};

export default AllProductsPage;