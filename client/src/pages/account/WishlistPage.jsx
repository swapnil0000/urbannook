import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useGetWishlistQuery, useRemoveFromWishlistMutation, useAddToCartMutation } from '../../store/api/userApi';
import { useUI } from '../../hooks/useRedux';
import { motion, AnimatePresence } from 'framer-motion';

const WishlistPage = () => {
  const navigate = useNavigate();
  const { showNotification } = useUI();
  const { data: wishlistData, isLoading, refetch } = useGetWishlistQuery();
  const [removeFromWishlist] = useRemoveFromWishlistMutation();
  const [addToCart, { isLoading: isAddingToCart }] = useAddToCartMutation();
  
  const [addingItems, setAddingItems] = useState(new Set());
  const cartItems = useSelector((state) => state.cart.items);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const wishlistItems = wishlistData?.data || [];

  const isInCart = (productId) => {
    return cartItems.some(item => item.id === productId || item.productId === productId);
  };

  const handleRemove = async (productId) => {
    try {
      await removeFromWishlist(productId).unwrap();
      refetch();
      showNotification('Item removed from wishlist', 'success');
    } catch (error) {
      showNotification('Failed to remove item', 'error');
    }
  };

  const handleAddToCart = async (item) => {
    if (addingItems.has(item.productId)) return;
    if (isInCart(item.productId)) {
      navigate('/checkout');
      return;
    }

    setAddingItems(prev => new Set(prev).add(item.productId));

    try {
      await addToCart({
        productId: item.productId || item._id,
        quantity: 1
      }).unwrap();
      
      setAddingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.productId);
        return newSet;
      });
      showNotification('Added to cart', 'success');
    } catch (error) {
      showNotification(error?.data?.message || 'Failed to add to cart', 'error');
      setAddingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.productId);
        return newSet;
      });
    }
  };

  return (
    <div className="bg-[#2e443c] min-h-screen font-sans text-gray-200 selection:bg-[#F5DEB3] selection:text-[#1c3026] relative overflow-hidden pb-20">
      
      {/* Ambient Lighting Effect */}
      <div className="fixed top-0 right-0 w-[400px] h-[400px] bg-[#F5DEB3]/5 rounded-full blur-[100px] pointer-events-none"></div>

      {/* --- COMPACT HERO SECTION --- */}
      <section className="pt-28 pb-6 px-4 md:px-8 max-w-[1400px] mx-auto relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-4">
            <div>
                <div className="inline-flex items-center gap-2 mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F5DEB3] animate-pulse"></span>
                    <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.25em] text-[#F5DEB3]">
                        Your Selection
                    </span>
                </div>
                <h1 className="text-3xl md:text-5xl font-serif text-white leading-none">
                    Curated <span className="italic font-light text-[#F5DEB3]">Wishlist.</span>
                </h1>
            </div>
            
            <div className="text-xs text-green-50/60 font-medium uppercase tracking-widest hidden md:flex items-center gap-2">
                <i className="fa-solid fa-heart text-[#F5DEB3]/50"></i>
                {isLoading ? 'Loading...' : `${wishlistItems.length} Saved Items`}
            </div>
        </div>
      </section>

      {/* --- MAIN CONTENT GRID --- */}
      <section className="px-4 md:px-8 relative z-10">
        <div className="max-w-[1400px] mx-auto">
          
          {isLoading ? (
            // Premium Loading Skeleton Grid
            <div className="grid grid-cols- md:grid-cols-1 lg:grid-cols-4 gap-3 md:gap-6 pt-6">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="bg-[#1c2b25] rounded-2xl md:rounded-[2rem] border border-white/5 overflow-hidden animate-pulse">
                        <div className="aspect-square bg-white/5"></div>
                        <div className="p-4 space-y-3">
                            <div className="h-2 bg-white/10 rounded w-1/3"></div>
                            <div className="h-4 bg-white/10 rounded w-3/4"></div>
                            <div className="h-4 bg-white/10 rounded w-1/2 mt-4"></div>
                            <div className="h-10 bg-white/5 rounded-xl w-full mt-4"></div>
                        </div>
                    </div>
                ))}
            </div>
          ) : wishlistItems.length === 0 ? (
            // Empty State
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-24 text-center bg-black/10 rounded-3xl border border-white/5 backdrop-blur-sm mt-6"
            >
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10 shadow-inner">
                    <i className="fa-regular fa-heart text-3xl text-[#F5DEB3]/50"></i>
                </div>
                <h3 className="text-2xl font-serif text-white mb-2">Your collection is empty</h3>
                <p className="text-green-50/50 mb-8 max-w-sm font-light text-sm">Save your favorite atmospheric pieces here to easily find them later.</p>
                <button 
                    onClick={() => navigate('/products')}
                    className="px-8 py-3.5 bg-[#F5DEB3] text-[#1c3026] rounded-full font-bold uppercase tracking-widest text-[10px] hover:bg-white transition-all shadow-lg active:scale-95"
                >
                    Explore Collection
                </button>
            </motion.div>
          ) : (
            // High Density Product Grid
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 pt-6">
              <AnimatePresence>
                {wishlistItems?.map((item) => (
                  <motion.div 
                    key={item.productId} 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    layout
                    className="group flex flex-col bg-[#1c2b25] rounded-2xl md:rounded-[2rem] overflow-hidden border border-white/5 shadow-lg hover:shadow-2xl hover:border-[#F5DEB3]/30 transition-all duration-300"
                  >
                    
                    {/* 1. IMAGE CONTAINER (Perfect 1:1 Square) */}
                    <div className="relative w-full aspect-square bg-[#f8f8f5] overflow-hidden">
                      
                      {/* Top Badges / Actions */}
                      <div className="absolute top-2 left-2 right-2 md:top-3 md:left-3 md:right-3 flex justify-between items-start z-20">
                        {item.productStatus === 'out_of_stock' ? (
                          <span className="bg-red-500 text-white text-[8px] md:text-[9px] font-bold uppercase tracking-widest px-2 py-1 md:px-3 md:py-1.5 rounded-md shadow-sm">
                            Sold Out
                          </span>
                        ) : (
                          <span></span> // Spacer to push X to the right
                        )}

                        <button
                          onClick={() => handleRemove(item.productId)}
                          className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-full bg-white/80 hover:bg-red-500 text-gray-600 hover:text-white backdrop-blur-md transition-all duration-300 shadow-md"
                        >
                          <i className="fa-solid fa-xmark text-xs md:text-sm"></i>
                        </button>
                      </div>

                      {/* Product Image */}
                      <div className="absolute inset-0 cursor-pointer" onClick={() => navigate(`/product/${item.productId}`)}>
                        <img 
                            src={item.productImg || '/placeholder.jpg'} 
                            alt={item.productName}
                            className="w-full h-full object-contain mix-blend-multiply transition-transform duration-700 group-hover:scale-105"
                        />
                      </div>
                    </div>

                    {/* 2. COMPACT DETAILS & CTA */}
                    <div className="p-3 md:p-5 flex flex-col flex-grow bg-gradient-to-t from-black/20 to-transparent">
                      
                      <div className="mb-2 cursor-pointer" onClick={() => navigate(`/product/${item.productId}`)}>
                        <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-widest text-[#F5DEB3] mb-1 block line-clamp-1 opacity-80">
                          {item.productCategory}
                        </span>
                        <h3 className="font-serif text-sm md:text-lg text-white truncate">
                          {item.productName}
                        </h3>
                      </div>

                      <div className="text-sm md:text-lg font-bold text-white mb-3 md:mb-4">
                          ₹{item.sellingPrice?.toLocaleString()}
                      </div>

                      {/* Full-Width Action Button */}
                      <div className="mt-auto">
                          {isInCart(item?.productId) ? (
                            <button
                                onClick={() => navigate('/checkout')}
                                className="w-full py-2.5 md:py-3.5 rounded-xl font-bold uppercase tracking-widest text-[9px] md:text-[10px] flex items-center justify-center gap-2 transition-all duration-300 bg-[#F5DEB3] text-[#1c3026] hover:bg-white shadow-lg"
                            >
                                <span>Checkout</span>
                                <i className="fa-solid fa-arrow-right"></i>
                            </button>
                          ) : (
                            <button
                                onClick={() => handleAddToCart(item)}
                                disabled={item?.productStatus === 'out_of_stock' || addingItems.has(item?.productId) || isAddingToCart}
                                className={`w-full py-2.5 md:py-3.5 rounded-xl font-bold uppercase tracking-widest text-[9px] md:text-[10px] flex items-center justify-center gap-2 transition-all duration-300 ${
                                    item?.productStatus !== 'out_of_stock' && !addingItems.has(item?.productId)
                                    ? 'bg-white/5 text-[#F5DEB3] hover:bg-[#F5DEB3] hover:text-[#1c3026] border border-white/10 hover:border-[#F5DEB3]' 
                                    : 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5'
                                }`}
                            >
                                {addingItems.has(item?.productId) ? (
                                    <div className="w-3 h-3 border-2 border-[#F5DEB3] border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <span>{item.productStatus === 'out_of_stock' ? 'Sold Out' : 'Move to Cart'}</span>
                                        {item.productStatus !== 'out_of_stock' && <i className="fa-solid fa-bag-shopping text-[10px]"></i>}
                                    </>
                                )}
                            </button>
                          )}
                      </div>

                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </section>

    </div>
  );
};

export default WishlistPage;