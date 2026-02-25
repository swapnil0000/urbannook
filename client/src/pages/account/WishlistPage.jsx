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
    <div className="min-h-screen bg-[#2e443c] relative font-sans selection:bg-[#F5DEB3] selection:text-[#2e443c] pb-10">
      
      {/* --- Ambient Background Glow --- */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#F5DEB3]/5 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Hero Section */}
      <section className="pt-32 pb-8 md:pt-34 md:pb-5 px-6 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
          
          {/* LEFT SIDE: Heading & Description */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 backdrop-blur-md border border-white/10 mb-4 md:mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F5DEB3] animate-pulse"></span>
              <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.25em] text-[#F5DEB3]">
                Your Selection
              </span>
            </div>
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-serif text-white leading-[0.9] mb-2">
              Curated{' '}
              <span className="italic font-light text-[#F5DEB3]">Wishlist.</span>
            </h1>
            <p className="text-sm md:text-base text-green-50/70 font-light leading-relaxed max-w-md">
              Your handpicked collection of atmospheric pieces.
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
          ) : wishlistItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 bg-black/10 rounded-[2rem] border border-white/5 backdrop-blur-sm">
              <i className="fa-regular fa-heart text-4xl text-[#F5DEB3]/50 mb-4"></i>
              <h2 className="text-2xl font-serif text-white mb-2">Your collection is empty</h2>
              <p className="text-green-50/60 mb-6 font-light">Save your favorite pieces to easily find them later.</p>
              <button 
                onClick={() => navigate('/products')}
                className="bg-[#F5DEB3] text-[#2e443c] px-8 py-3 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-white transition-colors"
              >
                Explore Collection
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              <AnimatePresence>
                {wishlistItems?.map((item) => (
                  <motion.div 
                    key={item.productId} 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    layout
                    className="group relative rounded-[2rem] overflow-hidden bg-black/20 border border-white/5 shadow-lg hover:shadow-2xl hover:border-[#F5DEB3]/30 transition-all duration-500 flex flex-col"
                  >
                    {/* Remove Button (Floating Top Right) */}
                    <div className="absolute top-4 right-4 z-20">
                      <button
                        onClick={() => handleRemove(item.productId)}
                        className="w-9 h-9 backdrop-blur-md rounded-full flex items-center justify-center shadow-xl transition-colors bg-white/90 text-gray-700 hover:bg-red-500 hover:text-white"
                      >
                        <i className="fa-solid fa-xmark text-xs"></i>
                      </button>
                    </div>

                    {/* Clickable Card Area */}
                    <div 
                      className="flex flex-col max-h-[520px] cursor-pointer"
                      onClick={() => navigate(`/product/${item.productId}`)}
                    >
                      
                      <div className="relative w-full aspect-square bg-[#f8f8f5] overflow-hidden">
                        {item.productStatus === 'out_of_stock' && (
                          <div className="absolute top-4 left-4 z-10">
                            <span className="bg-red-500 text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-md shadow-sm">
                              Sold Out
                            </span>
                          </div>
                        )}
                        <img 
                          src={item.productImg || '/placeholder.jpg'} 
                          alt={item.productName}
                          className="w-full h-full object-cover mix-blend-multiply transition-transform duration-[1.5s] group-hover:scale-110"
                        />
                      </div>

                      {/* TEXT & CTA SECTION */}
                      <div className="p-4 md:p-4 flex flex-col flex-grow justify-between bg-[#f5f7f8]">
                        
                        <div className="mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a89068] block opacity-80">
                            {item.productCategory}
                          </span>
                          <h3 className="font-serif text-xl md:text-2xl text-gray-500 leading-snug line-clamp-2">
                            {item.productName}
                          </h3>
                        </div>
                        
                        <div className="flex justify-between items-end pt-2 border-t border-[#F5DEB3]/10 mt-auto">
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Pricing</span>
                            <span className="text-lg md:text-xl font-semibold text-[#a89068]">
                              ₹{item.sellingPrice?.toLocaleString()}
                            </span>
                          </div>
                          
                          {/* Interactive Arrow CTA */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToCart(item);
                            }}
                            disabled={item.productStatus === 'out_of_stock' || addingItems.has(item.productId)}
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                              item.productStatus !== 'out_of_stock' && !addingItems.has(item.productId)
                                ? 'bg-[#F5DEB3]/10 text-gray-500 group-hover:bg-[#F5DEB3] group-hover:text-[#2e443c]'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            {addingItems.has(item.productId) ? (
                              <div className="w-3 h-3 border-2 border-[#a89068] border-t-transparent rounded-full animate-spin"></div>
                            ) : isInCart(item.productId) ? (
                              <i className="fa-solid fa-check text-xs"></i>
                            ) : (
                              <i className="fa-solid fa-bag-shopping text-xs"></i>
                            )}
                          </button>
                        </div>

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