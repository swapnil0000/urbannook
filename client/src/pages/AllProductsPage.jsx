import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import NewHeader from '../component/layout/NewHeader';
import Footer from '../component/layout/Footer';
import { products } from '../data/products';

const AllProductsPage = () => {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState('featured');

  // We only have 6 products, so we map them to specific grid spans to fill all gaps
  // Row 1: 8 + 4 | Row 2: 4 + 8 | Row 3: 6 + 6
  const gridLayouts = [
    "md:col-span-8 h-[600px]", // Product 1: Hero Large
    "md:col-span-4 h-[600px]", // Product 2: Side Compact
    "md:col-span-4 h-[600px]", // Product 3: Side Compact
    "md:col-span-8 h-[600px]", // Product 4: Hero Large
    "md:col-span-6 h-[500px]", // Product 5: Balanced
    "md:col-span-6 h-[500px]"  // Product 6: Balanced
  ];

  const displayProducts = useMemo(() => {
    let sorted = [...products];
    if (sortBy === 'price-low') sorted.sort((a, b) => a.price - b.price);
    if (sortBy === 'price-high') sorted.sort((a, b) => b.price - a.price);
    return sorted;
  }, [sortBy]);

  return (
    <div className="min-h-screen bg-[#fafafa] selection:bg-emerald-100 selection:text-emerald-900 relative">
      <NewHeader />

      {/* FIXED ARCHITECTURAL STUDIO BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none z-0">
          <div 
            className="absolute inset-0 opacity-[0.02]" 
            style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 10H90V90H10z' fill='none' stroke='%23000' stroke-width='0.5'/%3E%3C/svg%3E")`,
            }}
          ></div>
          <div className="absolute top-[-10%] left-[-10%] w-[70vw] h-[70vw] bg-[radial-gradient(circle,rgba(255,245,230,0.6)_0%,rgba(255,255,255,0)_70%)] blur-[100px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[70vw] h-[70vw] bg-[radial-gradient(circle,rgba(209,250,229,0.5)_0%,rgba(255,255,255,0)_70%)] blur-[100px]"></div>
      </div>

      {/* HERO SECTION */}
      <section className="pt-40 pb-16 px-6 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-end gap-8">
          <div className="max-w-xl">
            <span className="inline-block px-3 py-1 mb-4 text-[10px] font-bold tracking-[0.3em] text-emerald-800 uppercase bg-white/80 backdrop-blur-md rounded-full border border-emerald-100 shadow-sm">
              The 2026 Collection
            </span>
            <h1 className="text-5xl md:text-7xl font-serif text-slate-900 leading-[0.9] mb-4">
              Curated <span className="italic font-light text-emerald-700">Atmospheres.</span>
            </h1>
            <p className="text-base text-slate-500 font-medium leading-relaxed">
              Explore our 6-piece flagship series designed to redefine modern indoor environments.
            </p>
          </div>
          
          <div className="flex bg-white/80 backdrop-blur-md p-1.5 rounded-full border border-slate-200 shadow-sm">
            {['Featured', 'Price ↓'].map((label) => (
              <button 
                key={label}
                onClick={() => setSortBy(label === 'Featured' ? 'featured' : 'price-low')}
                className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                  (sortBy === 'featured' && label === 'Featured') || (sortBy === 'price-low' && label === 'Price ↓')
                  ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* INTERLOCKING BENTO GRID */}
      <section className="pb-32 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {displayProducts?.map((product, index) => (
              <div
                key={product.id}
                onClick={() => navigate(`/product/${product.category}/${product.slug}`)}
                className={`group relative cursor-pointer rounded-[3.5rem] overflow-hidden bg-white border border-slate-100 shadow-[0_20px_40px_rgba(0,0,0,0.04)] hover:shadow-2xl hover:-translate-y-2 transition-all duration-700 
                  ${gridLayouts[index] || 'md:col-span-6 h-[500px]'}`}
              >
                {/* Image Layer */}
                <img
                  src={product.image}
                  alt={product.title}
                  className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110"
                />

                {/* Glass Overlays */}
                <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                {/* Series Badge */}
                <div className="absolute top-8 left-8">
                   <div className="px-4 py-2 bg-white/90 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-xl border border-white">
                      Series 00{index + 1}
                   </div>
                </div>

                {/* Bottom Content Card - Dynamic sizing for text */}
                <div className="absolute bottom-8 left-8 right-8">
                  <div className="bg-white/90 backdrop-blur-2xl p-6 md:p-8 rounded-[2.5rem] border border-white shadow-2xl">
                    <div className="flex justify-between items-start mb-4">
                      <div className="max-w-[70%]">
                        <h3 className={`font-serif text-slate-900 mb-1 leading-tight ${gridLayouts[index]?.includes('col-span-8') ? 'text-3xl' : 'text-xl'}`}>
                          {product?.title}
                        </h3>
                        <div className="flex items-center gap-2">
                           <div className="flex text-emerald-600 text-[8px]">
                              {[...Array(5)].map((_, i) => <i key={i} className="fa-solid fa-star" />)}
                           </div>
                           <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Verified Series</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl md:text-2xl font-light text-slate-900">₹{product.price.toLocaleString()}</p>
                        <p className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest">In Stock</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-6">
                       <div className="flex gap-2">
                          {product.features?.slice(0, 2).map((feat, i) => (
                             <span key={i} className="text-[8px] font-black text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg uppercase tracking-widest">
                                {feat}
                             </span>
                          ))}
                       </div>
                       <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center group-hover:bg-emerald-600 transition-colors duration-500">
                          <i className="fa-solid fa-arrow-right-long text-xs"></i>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA BOX */}
      <section className="px-6 pb-24 relative z-10">
        <div className="max-w-7xl mx-auto rounded-[4rem] bg-slate-900 py-20 px-12 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,rgba(16,185,129,0.2),transparent_60%)]"></div>
          <div className="relative z-10">
            <h2 className="text-4xl font-serif text-white mb-6 tracking-tight">The Future of <span className="italic text-emerald-400">Atmospheric Design</span></h2>
            <p className="text-slate-400 max-w-lg mx-auto mb-10 text-sm leading-relaxed">
              Every Urban Nook series is released in limited quantities to ensure architectural integrity and technical excellence.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-emerald-500 transition-all shadow-lg">
                Request Customization
              </button>
              <button className="px-10 py-4 border border-white/20 text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all">
                Contact Stylist
              </button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AllProductsPage;