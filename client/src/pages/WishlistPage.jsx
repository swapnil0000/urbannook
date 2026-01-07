import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from '../component/layout/Footer';
import NewHeader from '../component/layout/NewHeader';

const WishlistPage = () => {
   useEffect(() => {
      window.scrollTo(0, 0);
    }, []);

  const navigate = useNavigate();

  // Mock Data (Replace with real data source)
  const [wishlistItems, setWishlistItems] = useState([
    {
      id: 1,
      name: 'Modern Sectional Sofa',
      price: 45999,
      originalPrice: 52999,
      // Using Unsplash image for demo match
      image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=1000&auto=format&fit=crop',
      inStock: true,
      rating: 4.5,
      category: 'seating',
      slug: 'modern-sectional-sofa'
    },
    {
      id: 2,
      name: 'Wooden Dining Table',
      price: 18999,
      originalPrice: 22999,
      image: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?q=80&w=1000&auto=format&fit=crop',
      inStock: false,
      rating: 4.2,
      category: 'tables',
      slug: 'wooden-dining-table'
    },
    {
      id: 3,
      name: 'Luxury Bed Frame',
      price: 32999,
      originalPrice: 38999,
      image: 'https://images.unsplash.com/photo-1505693416388-b0346efee535?q=80&w=1000&auto=format&fit=crop',
      inStock: true,
      rating: 4.8,
      category: 'bedroom',
      slug: 'luxury-bed-frame'
    }
  ]);

  const removeFromWishlist = (id) => {
    setWishlistItems(items => items.filter(item => item.id !== id));
  };

  const addToCart = (item) => {
    console.log('Adding to cart:', item);
    // Add logic to add to cart
  };

  return (
    <div className="bg-[#0a1a13] min-h-screen font-sans text-gray-300 selection:bg-emerald-500 selection:text-white">
      <NewHeader />

      {/* --- HERO SECTION --- */}
      <section className="pt-40 pb-16 px-6 relative overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto border-b border-white/10 pb-12 relative z-10 flex flex-col md:flex-row items-end justify-between gap-8">
            <div>
                <span className="inline-block px-3 py-1 mb-6 text-[10px] font-bold tracking-[0.3em] text-emerald-400 uppercase bg-white/5 border border-white/10 rounded-full">
                    Saved Items
                </span>
                <h1 className="text-5xl md:text-7xl font-serif text-white leading-[0.9] mb-4">
                    Your Curated <br />
                    <span className="italic font-light text-emerald-500">Collection.</span>
                </h1>
                <p className="text-gray-400 font-light max-w-md text-sm md:text-base">
                    Pieces you love, saved for when the moment is right.
                </p>
            </div>
            
            <div className="flex items-center gap-4 text-sm font-bold uppercase tracking-widest text-white/50">
                <i className="fa-solid fa-heart text-emerald-500"></i>
                <span>{wishlistItems.length} Items</span>
            </div>
        </div>
      </section>

      {/* --- WISHLIST GRID --- */}
      <section className="px-6 pb-32">
        <div className="max-w-7xl mx-auto">
          
          {wishlistItems.length === 0 ? (
            // EMPTY STATE
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6">
                    <i className="fa-regular fa-heart text-4xl text-emerald-500/50"></i>
                </div>
                <h3 className="text-3xl font-serif text-white mb-2">Your collection is empty</h3>
                <p className="text-gray-400 mb-8 max-w-sm">Start exploring our curated pieces to build your dream space.</p>
                <button 
                    onClick={() => navigate('/products')}
                    className="px-8 py-3 bg-white text-[#0a1a13] rounded-full font-bold uppercase tracking-widest text-xs hover:bg-emerald-500 hover:text-white transition-all"
                >
                    Explore Products
                </button>
            </div>
          ) : (
            // GRID STATE
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {wishlistItems.map((item) => (
                <div key={item.id} className="group relative bg-[#0f251b] rounded-[2rem] overflow-hidden border border-white/5 hover:border-emerald-500/30 transition-all duration-500">
                  
                  {/* Image Container */}
                  <div className="relative aspect-[4/5] overflow-hidden">
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100"
                    />
                    
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f251b] via-transparent to-transparent opacity-90"></div>

                    {/* Stock Badge */}
                    {!item.inStock && (
                        <div className="absolute top-4 left-4 bg-red-500/90 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                            Sold Out
                        </div>
                    )}

                    {/* Remove Button (Top Right) */}
                    <button
                      onClick={() => removeFromWishlist(item.id)}
                      className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 hover:bg-red-500 backdrop-blur-md text-white transition-colors duration-300 z-20 group/btn"
                    >
                      <i className="fa-solid fa-xmark text-sm group-hover/btn:rotate-90 transition-transform"></i>
                    </button>
                  </div>

                  {/* Content Container (Floats over image bottom) */}
                  <div className="absolute bottom-0 left-0 w-full p-6 md:p-8">
                    <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                        
                        {/* Rating */}
                        <div className="flex items-center gap-2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-75">
                            <div className="flex text-emerald-400 text-[9px] gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                    <i key={i} className={`fa-solid fa-star ${i < Math.floor(item.rating) ? '' : 'text-gray-600'}`}></i>
                                ))}
                            </div>
                            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Top Rated</span>
                        </div>

                        {/* Title & Price */}
                        <div className="flex justify-between items-end mb-6">
                            <div>
                                <h3 className="text-2xl font-serif text-white leading-tight mb-1">{item.name}</h3>
                                <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                                    {item.category}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xl font-light text-emerald-400">₹{item.price.toLocaleString()}</p>
                                <p className="text-xs text-gray-600 line-through decoration-emerald-900">₹{item.originalPrice.toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Add to Cart Button */}
                        <button
                            onClick={() => addToCart(item)}
                            disabled={!item.inStock}
                            className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all duration-300 ${
                                item.inStock 
                                ? 'bg-white text-[#0a1a13] hover:bg-emerald-500 hover:text-white shadow-lg' 
                                : 'bg-white/10 text-gray-500 cursor-not-allowed'
                            }`}
                        >
                            {item.inStock ? (
                                <>
                                    <span>Add to Cart</span>
                                    <i className="fa-solid fa-arrow-right"></i>
                                </>
                            ) : (
                                <span>Restocking Soon</span>
                            )}
                        </button>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default WishlistPage;