import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useGetWishlistQuery, useRemoveFromWishlistMutation, useAddToCartMutation } from '../../store/api/userApi';
import { setWishlistItems } from '../../store/slices/wishlistSlice';

const WishlistPage = () => {
   const dispatch = useDispatch();
   useEffect(() => {
      window.scrollTo(0, 0);
    }, []);

  const navigate = useNavigate();
  const { data: wishlistResponse, isLoading, refetch } = useGetWishlistQuery();
  const [removeFromWishlist] = useRemoveFromWishlistMutation();
  const [addToCart] = useAddToCartMutation();

  const wishlistItems = wishlistResponse?.data || [];

  // Load wishlist items into Redux store when component mounts
  useEffect(() => {
    if (wishlistResponse?.data) {
      dispatch(setWishlistItems(wishlistResponse.data));
    }
  }, [wishlistResponse, dispatch]);

  const handleRemoveFromWishlist = async (productId) => {
    try {
      await removeFromWishlist(productId).unwrap();
      refetch(); // Refetch wishlist data from server
    } catch (error) {
      console.error('Failed to remove from wishlist:', error);
    }
  };

  const handleAddToCart = async (item) => {
    try {
      await addToCart([{ productName: item.productName, quantity: 1 }]).unwrap();
      alert('Added to cart successfully!');
    } catch (error) {
      console.error('Failed to add to cart:', error);
      alert('Failed to add to cart');
    }
  };

  return (
    <div className="bg-[#0a1a13] min-h-screen font-sans text-gray-300 selection:bg-emerald-500 selection:text-white">

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
          ) : isLoading ? (
            // LOADING STATE
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mb-4"></div>
                <p className="text-gray-400">Loading your wishlist...</p>
            </div>
          ) : (
            // GRID STATE
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {wishlistItems.map((item) => (
                <div key={item.productId} className="group relative bg-[#0f251b] rounded-[2rem] overflow-hidden border border-white/5 hover:border-emerald-500/30 transition-all duration-500">
                  
                  {/* Image Container */}
                  <div className="relative aspect-[4/5] overflow-hidden">
                    <img 
                      src={item.productImg || '/placeholder.jpg'} 
                      alt={item.productName}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100"
                    />
                    
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f251b] via-transparent to-transparent opacity-90"></div>

                    {/* Stock Badge */}
                    {item.productStatus === 'out_of_stock' && (
                        <div className="absolute top-4 left-4 bg-red-500/90 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                            Sold Out
                        </div>
                    )}

                    {/* Remove Button (Top Right) */}
                    <button
                      onClick={() => handleRemoveFromWishlist(item.productId)}
                      className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 hover:bg-red-500 backdrop-blur-md text-white transition-colors duration-300 z-20 group/btn"
                    >
                      <i className="fa-solid fa-xmark text-sm group-hover/btn:rotate-90 transition-transform"></i>
                    </button>
                  </div>

                  {/* Content Container (Floats over image bottom) */}
                  <div className="absolute bottom-0 left-0 w-full p-6 md:p-8">
                    <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                        
                        {/* Title & Price */}
                        <div className="flex justify-between items-end mb-6">
                            <div>
                                <h3 className="text-2xl font-serif text-white leading-tight mb-1">{item.productName}</h3>
                                <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                                    {item.productCategory}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xl font-light text-emerald-400">₹{item.sellingPrice?.toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Add to Cart Button */}
                        <button
                            onClick={() => handleAddToCart(item)}
                            disabled={item.productStatus === 'out_of_stock'}
                            className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all duration-300 ${
                                item.productStatus !== 'out_of_stock' 
                                ? 'bg-white text-[#0a1a13] hover:bg-emerald-500 hover:text-white shadow-lg' 
                                : 'bg-white/10 text-gray-500 cursor-not-allowed'
                            }`}
                        >
                            {item.productStatus !== 'out_of_stock' ? (
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

    </div>
  );
};

export default WishlistPage;