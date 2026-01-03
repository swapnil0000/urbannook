import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import NewHeader from '../component/layout/NewHeader';
import Footer from '../component/layout/Footer';
import { products } from '../data/products';

const ProductDetailPage = () => {
  const { category, slug } = useParams();
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(0);
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0, show: false });
  const [quantity, setQuantity] = useState(1);
  const [activeSpec, setActiveSpec] = useState('dimension');
  const [isInCart, setIsInCart] = useState(false);

  const product = products.find(p => p.category === category && p.slug === slug);
  const relatedProducts = products.filter(p => p.category === category && p.id !== product?.id).slice(0, 3);

  // Check if product is in cart on component mount
  React.useEffect(() => {
    if (product) {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      setIsInCart(cart.some(item => item.id === product.id));
    }
  }, [product]);

  const addToCart = () => {
    const cartItem = {
      ...product,
      quantity,
      cartId: `${product.id}-${Date.now()}`
    };
    
    const existingCart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existingItem = existingCart.find(item => item.id === product.id);
    
    let updatedCart;
    if (existingItem) {
      updatedCart = existingCart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + quantity }
          : item
      );
    } else {
      updatedCart = [...existingCart, cartItem];
    }
    
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    setIsInCart(true);
  };

  const goToCheckout = () => {
    navigate('/checkout');
  };

  const handleMouseMove = (e) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.pageX - left - window.scrollX) / width) * 100;
    const y = ((e.pageY - top - window.scrollY) / height) * 100;
    setZoomPos({ x, y, show: true });
  };

  if (!product) return null;

  return (
    <div className="min-h-screen bg-white selection:bg-emerald-100 font-sans">
      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .layer-chassis { transition: transform 0.6s cubic-bezier(0.23, 1, 0.32, 1); }
        .group:hover .layer-chassis { transform: translateY(-80px); }
        .group:hover .layer-filter { transform: translateY(-40px); }
      `}</style>
      
      <NewHeader />

      <main className="pt-32 lg:pt-40 pb-20 px-6 max-w-[1500px] mx-auto relative">
        
        {/* BREADCRUMB */}
        <nav className="mb-10 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
          <span className="cursor-pointer hover:text-emerald-600" onClick={() => navigate('/products')}>Collection</span>
          <i className="fa-solid fa-chevron-right mx-3 text-[8px]"></i>
          <span className="text-slate-900">{product.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-start mb-32">
          
          {/* LEFT: THE INTERACTIVE GALLERY (5 Columns) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-32">
            <div 
              className="relative aspect-square bg-slate-50 rounded-[3rem] overflow-hidden cursor-crosshair border border-slate-100 group shadow-sm"
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setZoomPos({ ...zoomPos, show: false })}
            >
              <img
                src={product.images?.[selectedImage] || product.image}
                alt={product.title}
                className={`w-full h-full object-cover transition-opacity duration-300 ${zoomPos.show ? 'opacity-0' : 'opacity-100'}`}
              />
              {zoomPos.show && (
                <div 
                  className="absolute inset-0 z-10 pointer-events-none"
                  style={{
                    backgroundImage: `url(${product.images?.[selectedImage] || product.image})`,
                    backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
                    backgroundSize: '250%'
                  }}
                />
              )}
            </div>

            {/* CAROUSEL CONTROLS */}
            <div className="flex items-center gap-4">
               <button onClick={() => setSelectedImage(prev => (prev === 0 ? (product.images?.length || 1) - 1 : prev - 1))} className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all">
                <i className="fa-solid fa-chevron-left text-xs"></i>
               </button>
               <div className="flex-1 flex gap-2 overflow-x-auto scrollbar-hide">
                  {(product.images || [product.image]).map((img, i) => (
                    <div key={i} onClick={() => setSelectedImage(i)} className={`w-16 h-16 rounded-2xl overflow-hidden cursor-pointer border-2 transition-all flex-shrink-0 ${selectedImage === i ? 'border-emerald-500 scale-90' : 'border-transparent opacity-50'}`}>
                      <img src={img} className="w-full h-full object-cover" />
                    </div>
                  ))}
               </div>
               <button onClick={() => setSelectedImage(prev => (prev === (product.images?.length || 1) - 1 ? 0 : prev + 1))} className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all">
                <i className="fa-solid fa-chevron-right text-xs"></i>
               </button>
            </div>
          </div>

          {/* RIGHT: TECHNICAL INFO (7 Columns) */}
          <div className="lg:col-span-7">
            <div className="max-w-2xl">
              <span className="text-emerald-600 text-[10px] font-black uppercase tracking-[0.4em] mb-4 block">Architectural Series</span>
              <h1 className="text-5xl lg:text-7xl font-serif text-slate-900 leading-[0.9] mb-6">{product.title}</h1>
              
              <div className="flex items-center gap-6 mb-10">
                <p className="text-4xl font-light text-slate-900 tracking-tighter">₹{product.price.toLocaleString()}</p>
                <div className="flex items-center gap-2">
                   <div className="flex text-yellow-400 text-[10px]">
                      {[...Array(5)].map((_, i) => <i key={i} className="fa-solid fa-star" />)}
                   </div>
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">4.9 (120 Reviews)</span>
                </div>
              </div>

              {/* TECHNICAL SCALE SECTION */}
              <div className="bg-slate-50 rounded-[2.5rem] p-8 mb-10 border border-slate-100">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Technical Drafting</h3>
                    <div className="flex gap-4">
                       <button onClick={() => setActiveSpec('dimension')} className={`text-[10px] font-bold uppercase ${activeSpec === 'dimension' ? 'text-emerald-700 underline' : 'text-slate-300'}`}>Dimensions</button>
                       <button onClick={() => setActiveSpec('scale')} className={`text-[10px] font-bold uppercase ${activeSpec === 'scale' ? 'text-emerald-700 underline' : 'text-slate-300'}`}>30CM Scale</button>
                    </div>
                 </div>

                 {activeSpec === 'scale' ? (
                   <div className="relative py-12 flex flex-col items-center">
                      <div className="w-48 h-80 bg-white rounded-3xl relative overflow-hidden shadow-inner border border-slate-200">
                          <img src={product.image} className="w-full h-full object-contain p-4 opacity-90" />
                      </div>
                      <div className="absolute right-0 top-12 bottom-12 flex flex-col justify-between items-end pr-8 border-r-2 border-emerald-500/30">
                          <div className="text-[9px] font-bold text-emerald-700 bg-white px-1">30CM</div>
                          <div className="h-full flex flex-col justify-between py-2">
                             {[...Array(16)].map((_, i) => <div key={i} className={`h-[1px] bg-emerald-500/40 ${i % 5 === 0 ? 'w-4' : 'w-2'}`} />)}
                          </div>
                          <div className="text-[9px] font-bold text-emerald-700 bg-white px-1">0CM</div>
                      </div>
                   </div>
                 ) : (
                   <div className="grid grid-cols-2 gap-y-10 py-4">
                      <div className="border-l border-slate-200 pl-6"><p className="text-3xl text-slate-900">420mm</p><p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Height</p></div>
                      <div className="border-l border-slate-200 pl-6"><p className="text-3xl text-slate-900">280mm</p><p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Width</p></div>
                      <div className="border-l border-slate-200 pl-6"><p className="text-3xl text-slate-900">Noir</p><p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Colorway</p></div>
                      <div className="border-l border-slate-200 pl-6"><p className="text-3xl text-slate-900">1.2kg</p><p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Weight</p></div>
                   </div>
                 )}
              </div>

              {/* ACTION AREA */}
              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                 <div className="flex items-center bg-slate-100 rounded-2xl p-2 border border-slate-200">
                    <button onClick={() => setQuantity(q => Math.max(1, q-1))} className="w-12 h-12 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors"><i className="fa-solid fa-minus text-xs"></i></button>
                    <span className="w-12 text-center font-bold text-slate-900">{quantity}</span>
                    <button onClick={() => setQuantity(q => q+1)} className="w-12 h-12 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors"><i className="fa-solid fa-plus text-xs"></i></button>
                 </div>
                 <button 
                   onClick={isInCart ? goToCheckout : addToCart}
                   className="flex-1 bg-slate-900 text-white py-5 rounded-2xl font-bold tracking-[0.2em] uppercase hover:bg-emerald-700 transition-all shadow-xl active:scale-95"
                 >
                    {isInCart ? 'Go to Checkout' : 'Add to Cart'}
                 </button>
              </div>
            </div>
          </div>
        </div>

        {/* INTERACTIVE EXPLODED VIEW SECTION */}
        <section className="mb-32 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center bg-slate-900 rounded-[4rem] p-12 lg:p-24 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_100%_0%,rgba(16,185,129,0.1),transparent)]" />
            
            <div className="relative z-10">
               <span className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.3em] mb-4 block">The Internal Core</span>
               <h2 className="text-4xl lg:text-6xl font-serif text-white leading-none mb-8">Anatomy of <br/><span className="italic font-light text-emerald-200">Atmosphere.</span></h2>
               <p className="text-slate-400 text-lg leading-relaxed mb-8 max-w-md">Every Aire Series G5 is built with three distinct architectural layers designed to filter 99.9% of particles while maintaining near-silent operation.</p>
               <div className="space-y-4">
                  <div className="flex items-center gap-4 text-white text-sm font-bold uppercase tracking-widest border-b border-white/10 pb-4">
                     <span className="text-emerald-500">01</span> Monolithic Chassis
                  </div>
                  <div className="flex items-center gap-4 text-white text-sm font-bold uppercase tracking-widest border-b border-white/10 pb-4">
                     <span className="text-emerald-500">02</span> HEPA H14 Architecture
                  </div>
                  <div className="flex items-center gap-4 text-white text-sm font-bold uppercase tracking-widest border-b border-white/10 pb-4">
                     <span className="text-emerald-500">03</span> Magnetic Turbine
                  </div>
               </div>
            </div>

            {/* THE EXPLODED VIEW VISUAL */}
            <div className="relative h-[500px] flex items-center justify-center group">
                <div className="relative w-48 h-64 layer-chassis z-30">
                   <div className="w-full h-full bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 flex items-center justify-center">
                      <i className="fa-solid fa-cube text-white/20 text-4xl"></i>
                   </div>
                   <span className="absolute -left-20 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase tracking-widest text-emerald-400">Chassis</span>
                </div>
                <div className="absolute w-40 h-52 layer-filter z-20">
                   <div className="w-full h-full bg-emerald-500/20 backdrop-blur-md rounded-2xl border border-emerald-500/40" />
                   <span className="absolute -right-20 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase tracking-widest text-emerald-400">HEPA-H14</span>
                </div>
                <div className="absolute w-32 h-32 layer-motor z-10">
                   <div className="w-full h-full bg-white rounded-full flex items-center justify-center shadow-2xl animate-spin-slow">
                      <i className="fa-solid fa-fan text-slate-900 text-2xl"></i>
                   </div>
                   <span className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-widest text-emerald-400 whitespace-nowrap">Proprietary Motor</span>
                </div>
            </div>
        </section>

        {/* RELATED SHOWCASE */}
        <section className="border-t border-slate-100 pt-20">
            <div className="flex justify-between items-end mb-12">
               <h2 className="text-4xl font-serif text-slate-900">Similar <span className="italic font-light">Atmospheres</span></h2>
               <button className="text-[10px] font-black uppercase tracking-widest text-emerald-700 border-b border-emerald-700 pb-1">View Full Series</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                {relatedProducts.map(p => (
                   <div key={p.id} className="group cursor-pointer" onClick={() => { navigate(`/product/${p.category}/${p.slug}`); window.scrollTo(0,0); }}>
                      <div className="aspect-[4/5] bg-slate-50 rounded-[2.5rem] overflow-hidden mb-6 relative border border-slate-100 shadow-sm transition-transform duration-700 group-hover:-translate-y-2">
                         <img src={p.image} className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700" />
                      </div>
                      <h3 className="text-xl font-serif text-slate-900 mb-2">{p.title}</h3>
                      <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest">₹{p.price.toLocaleString()}</p>
                   </div>
                ))}
            </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ProductDetailPage;