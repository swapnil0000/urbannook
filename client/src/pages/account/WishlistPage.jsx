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

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#1c3026]">
        <div className="w-16 h-16 border border-[#F5DEB3] rounded-full animate-spin border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="bg-[#2e443c] min-h-screen font-sans text-gray-200 selection:bg-[#F5DEB3] selection:text-[#1c3026] relative overflow-hidden">
      {/* Lighting Effect */}
      <div className="fixed top-0 left-0 w-[300px] h-[300px] bg-[#1c3026] rounded-full blur-[150px] pointer-events-none opacity-40"></div>

      {/* --- HERO SECTION --- */}
      <section className="pt-32 pb-12 px-6 lg:px-12 relative z-10">
        <div className="max-w-7xl mx-auto border-b border-[#F5DEB3]/10 pb-12 flex flex-col md:flex-row items-end justify-between gap-8">
            <motion.div 
              initial={{ opacity: 0, x: -20 }} 
              animate={{ opacity: 1, x: 0 }}
            >
                <span className="inline-block px-3 py-1.5 mb-6 text-[10px] font-bold tracking-[0.3em] text-[#1c3026] uppercase bg-[#F5DEB3] rounded-full shadow-lg shadow-[#F5DEB3]/10">
                    Your Selection
                </span>
                <h1 className="text-5xl md:text-7xl font-serif text-[#F5DEB3] leading-tight mb-4">
                    The Curated <br />
                    <span className="italic font-light opacity-80">Wishlist.</span>
                </h1>
                <p className="text-gray-300 font-light max-w-md text-sm md:text-base">
                    Handpicked pieces waiting to transform your living space.
                </p>
            </motion.div>
            
            <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-[0.2em] text-[#F5DEB3]/60 bg-white/5 px-6 py-3 rounded-full border border-[#F5DEB3]/10">
                <i className="fa-solid fa-heart text-[#F5DEB3]"></i>
                <span>{wishlistItems.length} Saved Items</span>
            </div>
        </div>
      </section>

      {/* --- WISHLIST GRID --- */}
      <section className="px-6 lg:px-12 pb-32 relative z-10">
        <div className="max-w-7xl mx-auto">
          
          {wishlistItems.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-32 text-center"
            >
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-8 border border-[#F5DEB3]/10">
                    <i className="fa-regular fa-heart text-4xl text-[#F5DEB3]/30"></i>
                </div>
                <h3 className="text-3xl font-serif text-[#F5DEB3] mb-4">Your collection is empty</h3>
                <p className="text-gray-400 mb-10 max-w-sm font-light">Explore our handcrafted 3D printed lamps and stands to start your collection.</p>
                <button 
                    onClick={() => navigate('/products')}
                    className="px-10 py-4 bg-[#F5DEB3] text-[#1c3026] rounded-full font-bold uppercase tracking-widest text-xs hover:bg-white transition-all shadow-xl shadow-[#F5DEB3]/10"
                >
                    Return to Shop
                </button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              <AnimatePresence>
                {wishlistItems.map((item, index) => (
                  <motion.div 
                    key={item.productId} 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.1 }}
                    className="group relative bg-[#1c3026]/40 rounded-[2.5rem] overflow-hidden border border-[#F5DEB3]/10 hover:border-[#F5DEB3]/30 transition-all duration-500 hover:shadow-2xl hover:shadow-black/20"
                  >
                    {/* Image Section */}
                    <div className="relative aspect-[4/5] overflow-hidden bg-[#e8e6e1]/5">
                      <img 
                        src={item.productImg || '/placeholder.jpg'} 
                        alt={item.productName}
                        className="w-full h-full object-contain p-8 transition-transform duration-700 group-hover:scale-110"
                      />
                      
                      {/* Badge and Remove Button */}
                      <div className="absolute top-6 left-6 right-6 flex justify-between items-start">
                        {item.productStatus === 'out_of_stock' ? (
                          <span className="bg-red-500/90 text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">
                            Sold Out
                          </span>
                        ) : (
                          <span className="bg-[#F5DEB3] text-[#1c3026] text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">
                            In Stock
                          </span>
                        )}

                        <button
                          onClick={() => handleRemove(item.productId)}
                          className="w-10 h-10 flex items-center justify-center rounded-full bg-[#1c3026]/60 hover:bg-red-500 text-white backdrop-blur-md transition-all duration-300 border border-white/10"
                        >
                          <i className="fa-solid fa-xmark text-sm"></i>
                        </button>
                      </div>

                      {/* Floating Price Tag */}
                      <div className="absolute bottom-6 right-6">
                        <div className="bg-[#1c3026] text-[#F5DEB3] px-4 py-2 rounded-2xl border border-[#F5DEB3]/20 font-light text-lg">
                          ₹{item.sellingPrice?.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-8">
                      <div className="mb-6">
                        <h3 className="text-2xl font-serif text-[#F5DEB3] mb-1 group-hover:text-white transition-colors">
                          {item.productName}
                        </h3>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#F5DEB3]/40">
                          {item.productCategory}
                        </p>
                      </div>

                      {/* Action Button */}
                      {isInCart(item.productId) ? (
                        <button
                          onClick={() => navigate('/checkout')}
                          className="w-full h-14 rounded-2xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all duration-300 bg-[#F5DEB3] text-[#1c3026] hover:bg-white shadow-xl shadow-[#F5DEB3]/5"
                        >
                          <span>Go to Checkout</span>
                          <i className="fa-solid fa-arrow-right"></i>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAddToCart(item)}
                          disabled={item.productStatus === 'out_of_stock' || addingItems.has(item.productId) || isAddingToCart}
                          className={`w-full h-14 rounded-2xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all duration-300 ${
                            item.productStatus !== 'out_of_stock' && !addingItems.has(item.productId)
                              ? 'bg-white/5 text-[#F5DEB3] hover:bg-[#F5DEB3] hover:text-[#1c3026] border border-[#F5DEB3]/20' 
                              : 'bg-white/5 text-gray-600 cursor-not-allowed border border-white/5'
                          }`}
                        >
                          {addingItems.has(item.productId) ? (
                            <i className="fa-solid fa-spinner fa-spin"></i>
                          ) : (
                            <>
                              <span>{item.productStatus === 'out_of_stock' ? 'Sold Out' : 'Move to Cart'}</span>
                              <i className="fa-solid fa-plus-circle text-xs"></i>
                            </>
                          )}
                        </button>
                      )}
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