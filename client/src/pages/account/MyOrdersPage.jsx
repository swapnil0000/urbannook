import { useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import { useGetOrderHistoryQuery } from '../../store/api/userApi';
import { ComponentLoader } from '../../component/layout/LoadingSpinner';
import { useUI } from '../../hooks/useRedux';

// Lazy load heavy components
const OrderTracker = lazy(() => import('../../component/OrderTracker'));

const MyOrdersPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const { openLoginModal, showNotification } = useUI();
  const { data: orderResponse, isLoading, error } = useGetOrderHistoryQuery();
  
  const orders = orderResponse?.data?.orders || [];

  useEffect(() => {
    window.scrollTo(0, 0);
    
    // Check authentication
    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(";").shift();
      return null;
    };

    const userToken = getCookie('userAccessToken');
    const hasLocalUser = localStorage.getItem('user');
    const isLoggedIn = isAuthenticated || userToken || hasLocalUser;

    if (!isLoggedIn) {
      showNotification('Please login to view your orders', 'error');
      openLoginModal();
      navigate('/');
    }
  }, [isAuthenticated, navigate, openLoginModal, showNotification]);

  // --- HELPER: Copy ID ---
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showNotification('Order ID copied to clipboard', 'info');
  };

  // --- HELPER: Status Config (Updated Colors for Light Card) ---
  const getStatusConfig = (status) => {
    const s = status?.toUpperCase();
    switch (s) {
      case 'DELIVERED': 
        return { text: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-200', icon: 'fa-check-circle', label: 'Delivered' };
      case 'SHIPPED': 
        return { text: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-200', icon: 'fa-truck-fast', label: 'In Transit' };
      case 'CREATED': 
      case 'PROCESSING':
        return { text: 'text-[#a89068]', bg: 'bg-[#a89068]/10', border: 'border-[#a89068]/20', icon: 'fa-box-open', label: 'Processing' };
      case 'CANCELLED': 
        return { text: 'text-red-600', bg: 'bg-red-100', border: 'border-red-200', icon: 'fa-ban', label: 'Cancelled' };
      default: 
        return { text: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-200', icon: 'fa-circle-info', label: status };
    }
  };

  if (isLoading) {
    return (
      <div className="bg-[#2e443c] min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-[#a89068] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#2e443c] min-h-screen flex items-center justify-center text-[#F5DEB3]">
        <div className="text-center">
          <h2 className="text-2xl mb-4 font-serif">Failed to load orders</h2>
          <p className="text-gray-400 text-sm">Please try again later</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#2e443c] min-h-screen font-sans text-gray-200 selection:bg-[#a89068] selection:text-white">

      {/* --- AMBIENT BACKGROUND --- */}
      <div className="fixed top-0 left-0 w-full h-[600px] bg-gradient-to-b from-[#1a2822] to-[#2e443c] pointer-events-none opacity-60"></div>
      <div className="fixed -bottom-40 -left-40 w-[600px] h-[600px] bg-[#a89068] rounded-full blur-[200px] opacity-[0.05] pointer-events-none"></div>

      <main className="max-w-5xl mx-auto pt-28 pb-20 px-4 md:px-8 relative z-10">
        
        {/* --- HEADER --- */}
        <div className="mb-10 md:mb-16 flex flex-col md:flex-row md:items-end justify-between gap-4">
           <div>
             <div className="flex items-center gap-3 mb-2">
                 <span className="h-[1px] w-8 bg-[#F5DEB3]"></span>
                 <span className="text-[#F5DEB3] font-bold tracking-[0.2em] uppercase text-[10px]">History</span>
             </div>
             <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-white leading-tight">
               Order <span className="italic text-[#F5DEB3]">Archive.</span>
             </h1>
           </div>
           
           {/* Stat Pill */}
           <div className="px-5 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm flex items-center gap-3">
               <span className="text-gray-400 text-xs uppercase tracking-wider">Total Orders</span>
               <span className="text-[#F5DEB3] font-bold font-serif text-xl">{orderResponse?.data?.totalOrders || orders.length}</span>
           </div>
        </div>

        {/* --- ORDERS LIST --- */}
        <AnimatePresence mode='wait'>
        {orders.length === 0 ? (
          // EMPTY STATE (Light Box)
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 bg-[#f5f7f8] rounded-[3rem] border border-white/5 shadow-2xl"
          >
             <div className="w-24 h-24 bg-[#a89068]/10 rounded-full flex items-center justify-center mb-6 border border-[#a89068]/20">
                <i className="fa-solid fa-box-open text-[#F5DEB3] text-3xl"></i>
             </div>
             <h3 className="text-2xl font-serif text-[#2e443c] mb-2">Your collection is empty.</h3>
             <p className="text-gray-500 text-sm mb-8 font-light">Discover our latest artifacts and illuminated designs.</p>
             <button 
               onClick={() => navigate('/products')}
               className="px-8 py-3 bg-[#a89068] text-white rounded-full font-bold uppercase tracking-widest text-[10px] hover:bg-[#2e443c] hover:scale-105 transition-all duration-300 shadow-lg"
             >
               Browse Collection
             </button>
          </motion.div>
        ) : (
          // ORDER CARDS (Light Boxes)
          <div className="space-y-8">
            {orders.map((order, idx) => {
              const statusConfig = getStatusConfig(order.status);
              const dateObj = new Date(order.createdAt);
              
              return (
                <motion.div 
                    key={order.orderId}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-[#f5f7f8] rounded-[24px] border border-transparent overflow-hidden shadow-xl hover:shadow-[0_20px_40px_rgba(0,0,0,0.2)] hover:translate-y-[-5px] transition-all duration-500 group"
                >
                    {/* --- CARD HEADER --- */}
                    <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50">
                        
                        {/* Left: ID & Date */}
                        <div className="flex items-start gap-4">
                             <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${statusConfig.bg} border ${statusConfig.border} shrink-0`}>
                                <i className={`fa-solid ${statusConfig.icon} ${statusConfig.text} text-lg`}></i>
                             </div>
                             <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${statusConfig.text}`}>
                                        {statusConfig.label}
                                    </span>
                                    <span className="w-1 h-1 rounded-full bg-gray-400"></span>
                                    <span className="text-xs text-gray-500">
                                        {dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 group/id cursor-pointer" onClick={() => copyToClipboard(order.orderId)}>
                                    <span className="font-serif text-[#2e443c] text-lg leading-none group-hover/id:text-[#a89068] transition-colors">
                                        Order #{order.orderId.slice(0, 8)}...
                                    </span>
                                    <i className="fa-regular fa-copy text-gray-400 text-xs opacity-0 group-hover/id:opacity-100 transition-opacity"></i>
                                </div>
                             </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-3 mt-2 md:mt-0">
                             <button className="flex-1 md:flex-none py-2 px-4 rounded-xl border border-gray-300 text-gray-500 hover:text-[#2e443c] hover:border-[#2e443c] text-[10px] font-bold uppercase tracking-widest transition-all">
                                Invoice
                             </button>
                             {statusConfig.label !== 'Delivered' && (
                                 <button className="flex-1 md:flex-none py-2 px-4 rounded-xl bg-[#a89068] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#2e443c] transition-all shadow-md">
                                    Track
                                 </button>
                             )}
                        </div>
                    </div>

                    {/* --- ITEMS LIST --- */}
                    <div className="p-6">
                        {/* Order Tracker */}
                        <div className="mb-6 pb-6 border-b border-gray-200">
                            <Suspense fallback={<ComponentLoader />}>
                                {/* Note: OrderTracker might need internal styling updates if it assumes dark mode */}
                                <OrderTracker status={order.status} />
                            </Suspense>
                            
                            {/* Tracking Information */}
                            {order.trackingInfo && (order.trackingInfo.carrier || order.trackingInfo.trackingNumber) && (
                                <div className="mt-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                        <i className="fa-solid fa-truck text-[#a89068] text-sm"></i>
                                        <span className="text-xs font-bold uppercase tracking-wider text-[#a89068]">Tracking Details</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                        {order.trackingInfo.carrier && (
                                            <div>
                                                <span className="text-gray-400 text-xs font-bold">Carrier:</span>
                                                <p className="text-[#2e443c] font-medium">{order.trackingInfo.carrier}</p>
                                            </div>
                                        )}
                                        {order.trackingInfo.trackingNumber && (
                                            <div>
                                                <span className="text-gray-400 text-xs font-bold">Tracking Number:</span>
                                                <p className="text-[#2e443c] font-mono text-sm">{order.trackingInfo.trackingNumber}</p>
                                            </div>
                                        )}
                                        {order.trackingInfo.estimatedDelivery && (
                                            <div className="md:col-span-2">
                                                <span className="text-gray-400 text-xs font-bold">Estimated Delivery:</span>
                                                <p className="text-[#a89068] font-medium">
                                                    {new Date(order.trackingInfo.estimatedDelivery).toLocaleDateString('en-GB', { 
                                                        day: 'numeric', 
                                                        month: 'long', 
                                                        year: 'numeric' 
                                                    })}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Contact Information */}
                            {(order.senderMobile || order.receiverMobile) && (
                                <div className="mt-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                        <i className="fa-solid fa-mobile text-[#a89068] text-sm"></i>
                                        <span className="text-xs font-bold uppercase tracking-wider text-[#a89068]">Contact Information</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                        {order.senderMobile && order.receiverMobile && order.senderMobile === order.receiverMobile ? (
                                            <div>
                                                <span className="text-gray-400 text-xs font-bold">Contact Number:</span>
                                                <p className="text-[#2e443c] font-medium">{order.senderMobile}</p>
                                            </div>
                                        ) : (
                                            <>
                                                {order.senderMobile && (
                                                    <div>
                                                        <span className="text-gray-400 text-xs font-bold">Payment Contact:</span>
                                                        <p className="text-[#2e443c] font-medium">{order.senderMobile}</p>
                                                    </div>
                                                )}
                                                {order.receiverMobile && (
                                                    <div>
                                                        <span className="text-gray-400 text-xs font-bold">Delivery Contact:</span>
                                                        <p className="text-[#2e443c] font-medium">{order.receiverMobile}</p>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid gap-4">
                            {order.items.map((item, i) => {
                                const snapshot = item.productSnapshot || {};
                                const imgUrl = item.productImg || snapshot.productImg || '/placeholder.jpg';
                                const name = item.productName || snapshot.productName || 'Unknown Product';
                                const variant = item.productCategory || snapshot.productCategory || 'Standard';
                                const price = item.priceAtPurchase || snapshot.priceAtPurchase || 0;
                                const qty = item.quantity || snapshot.quantity || 1;

                                return (
                                    <div key={i} className="flex gap-4 items-center group/item hover:bg-white p-2 rounded-xl transition-colors">
                                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-white p-2 shrink-0 overflow-hidden border border-gray-200 shadow-sm">
                                            <img 
                                                src={imgUrl.includes('demo') ? 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?q=80&w=200' : imgUrl} 
                                                alt={name} 
                                                className="w-full h-full object-contain mix-blend-multiply" 
                                            />
                                        </div>

                                        <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center justify-between gap-2">
                                            <div>
                                                <h4 className="text-[#2e443c] font-medium text-sm md:text-base truncate pr-4 group-hover/item:text-[#a89068] transition-colors">{name}</h4>
                                                <p className="text-gray-500 text-xs mb-1">{variant}</p>
                                                <div className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 border border-gray-200 text-[10px] text-gray-500 font-bold">
                                                    Qty: {qty}
                                                </div>
                                            </div>
                                            
                                            <div className="text-right">
                                                <p className="text-[#2e443c] font-mono font-bold">₹{(price * qty).toLocaleString()}</p>
                                                <p className="text-gray-400 text-[10px]">₹{price} ea</p>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* --- FOOTER TOTAL --- */}
                    <div className="px-6 py-4 bg-gray-100 border-t border-gray-200 flex justify-between items-center">
                        <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Amount</span>
                        <span className="text-xl font-serif text-[#2e443c]">₹{order.amount.toLocaleString()}</span>
                    </div>

                </motion.div>
              );
            })}
          </div>
        )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default MyOrdersPage;