import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NewHeader from '../component/layout/NewHeader';
import Footer from '../component/layout/Footer';
// import { products } from '../data/products'; // Assuming you have this, but I will mock data below for the image update

const AllProductsPage = () => {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState('featured');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const gridLayouts = [
    "md:col-span-6 h-[500px]", 
    "md:col-span-6 h-[500px]", 
    "md:col-span-6 h-[500px]", 
    "md:col-span-6 h-[500px]", 
    "md:col-span-6 h-[500px]", 
    "md:col-span-6 h-[500px]"  
  ];

  // MOCK DATA WITH NEW HIGH-QUALITY IMAGES
  // Replace your imported 'products' with this or update your data file
  const mockProducts = [
    {
        id: 1,
        title: "The Lounge Chair 01",
        category: "seating",
        slug: "lounge-chair-01",
        price: 45000,
        image: "https://images.unsplash.com/photo-1567538096630-e0c55bd9450b?q=80&w=1000&auto=format&fit=crop", // Clean chair, minimalist studio
        reviews: 124,
        features: ["Ergonomic", "Oak Wood"]
    },
    {
        id: 2,
        title: "Ceramic Vase Set",
        category: "decor",
        slug: "ceramic-vase",
        price: 4500,
        image: "https://images.unsplash.com/photo-1578500494198-246f612d3b3d?q=80&w=1000&auto=format&fit=crop", // Artistic vase, soft light
        reviews: 45,
        features: ["Handcrafted", "Matte Finish"]
    },
    {
        id: 3,
        title: "Orbit Pendant Light",
        category: "lighting",
        slug: "orbit-pendant",
        price: 12999,
        image: "https://images.unsplash.com/photo-1513506003011-3b032f737104?q=80&w=1000&auto=format&fit=crop", // Warm lighting, modern lamp
        reviews: 89,
        features: ["Dimmable", "Brass"]
    },
    {
        id: 4,
        title: "Modular Sofa System",
        category: "seating",
        slug: "modular-sofa",
        price: 85000,
        image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=1000&auto=format&fit=crop", // Green velvet sofa, rich texture
        reviews: 210,
        features: ["Velvet", "Modular"]
    },
    {
        id: 5,
        title: "Minimalist Desk",
        category: "tables",
        slug: "minimalist-desk",
        price: 32000,
        image: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?q=80&w=1000&auto=format&fit=crop", // Clean desk setup
        reviews: 67,
        features: ["Solid Wood", "Cable Mgmt"]
    },
    {
        id: 6,
        title: "Abstract Art Piece",
        category: "art",
        slug: "abstract-art",
        price: 15000,
        image: "https://images.unsplash.com/photo-1582562124811-c8026933ca8b?q=80&w=1000&auto=format&fit=crop", // Abstract wall art
        reviews: 32,
        features: ["Original", "Canvas"]
    }
  ];

  const displayProducts = useMemo(() => {
    let sorted = [...mockProducts]; // Using mockProducts for image demo
    if (sortBy === 'price-low') sorted.sort((a, b) => a.price - b.price);
    if (sortBy === 'price-high') sorted.sort((a, b) => b.price - a.price);
    return sorted;
  }, [sortBy]);

  return (
    <div className="min-h-screen bg-[#2e443c] relative font-sans selection:bg-emerald-500 selection:text-white">
      <NewHeader />

      {/* --- HERO SECTION --- */}
      <section className="pt-40 pb-20 px-6 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-end gap-12">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 w-fit mb-6 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white">
                Flagship Series
              </span>
            </div>
            <h1 className="text-5xl md:text-8xl font-serif text-white leading-[0.9] mb-6">
              Curated <br/>
              <span className="italic font-light text-emerald-200">Atmospheres.</span>
            </h1>
            <p className="text-base text-gray-300 font-light leading-relaxed max-w-md">
              Explore our exclusive 6-piece collection designed to redefine modern indoor environments with precision and style.
            </p>
          </div>
          
          <div className="flex bg-white/5 backdrop-blur-md p-1.5 rounded-full border border-white/10">
            {['Featured', 'Price ↓'].map((label) => (
              <button 
                key={label}
                onClick={() => setSortBy(label === 'Featured' ? 'featured' : 'price-low')}
                className={`px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                  (sortBy === 'featured' && label === 'Featured') || (sortBy === 'price-low' && label === 'Price ↓')
                  ? 'bg-white text-[#2e443c]' 
                  : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* --- GALLERY PRODUCT GRID --- */}
      <section className="pb-32 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {displayProducts?.map((product, index) => (
              <div
                key={product.id}
                onClick={() => navigate(`/product/${product.category}/${product.slug}`)}
                className={`group relative cursor-pointer rounded-[2rem] overflow-hidden bg-[#f5f5f0] shadow-xl hover:shadow-2xl transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]
                  ${gridLayouts[index] || 'md:col-span-6 h-[550px]'}`} // Slightly reduced height from 600->550
              >
                {/* Image Layer - Full Visibility */}
                <div className="absolute inset-0 z-0 bg-stone-200">
                    <img
                        src={product.image}
                        alt={product.title}
                        className="w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-105"
                    />
                    {/* Gradient only at the very bottom */}
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500"></div>
                </div>

                {/* Top Badge (Minimal) */}
                <div className="absolute top-6 left-6 z-10 flex items-center gap-3">
                   <div className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-[9px] font-black uppercase tracking-widest text-[#2e443c] shadow-sm border border-white">
                      Series 00{index + 1}
                   </div>
                   <div className="hidden group-hover:flex items-center gap-1.5 px-3 py-1 bg-emerald-500/90 backdrop-blur-md rounded-full text-[9px] font-bold uppercase tracking-widest text-white shadow-sm transition-all duration-300">
                      <i className="fa-solid fa-check-circle text-[10px]"></i>
                      <span>Authentic</span>
                   </div>
                </div>

                {/* --- NEW BOTTOM UI: "Floating Gallery Label" --- */}
                <div className="absolute bottom-6 left-6 right-6 z-10">
                    <div className="flex justify-between items-end">
                        
                        {/* Title & Reviews */}
                        <div className="text-white drop-shadow-md transform transition-transform duration-500 group-hover:-translate-y-1">
                            <h3 className="font-serif text-3xl leading-none mb-2">
                                {product?.title}
                            </h3>
                            <div className="flex items-center gap-3 opacity-90">
                                <div className="flex text-emerald-400 text-[10px] gap-0.5">
                                    {[...Array(5)].map((_, i) => <i key={i} className="fa-solid fa-star" />)}
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-widest border-l border-white/30 pl-3">
                                    {product.reviews} Reviews
                                </span>
                            </div>
                        </div>

                        {/* Price Pill Button */}
                        <div className="bg-white text-[#2e443c] px-6 py-3 rounded-full font-bold shadow-[0_4px_20px_rgba(0,0,0,0.2)] flex items-center gap-3 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
                            <span className="text-sm">₹{product.price.toLocaleString()}</span>
                            <i className="fa-solid fa-arrow-right -rotate-45 group-hover:rotate-0 transition-transform duration-300"></i>
                        </div>

                    </div>
                </div>

              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- FOOTER CTA --- */}
      <section className="px-6 pb-20 relative z-10">
        <div className="max-w-7xl mx-auto rounded-[3rem] bg-[#1a2c26] py-20 px-8 text-center relative overflow-hidden shadow-2xl border border-white/5">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px]"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-[80px]"></div>

          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-serif text-white mb-6 leading-tight">
                Not sure what fits? <br/>
                <span className="italic text-emerald-400/80">Ask our stylists.</span>
            </h2>
            <p className="text-gray-400 mb-10 text-sm md:text-base leading-relaxed">
              Every Urban Nook series is released in limited quantities. If you need help choosing the perfect piece for your space, we are here.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-8 py-4 bg-white text-[#2e443c] rounded-full font-bold uppercase tracking-widest text-[10px] hover:bg-gray-200 transition-all shadow-lg min-w-[200px]">
                Book Consultation
              </button>
              <button className="px-8 py-4 border border-white/20 text-white rounded-full font-bold uppercase tracking-widest text-[10px] hover:bg-white/5 transition-all min-w-[200px]">
                View Lookbook
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