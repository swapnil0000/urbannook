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
  // Safe navigation to get the orders array based on your data structure
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
  };

  // --- HELPER: Status Config ---
  const getStatusConfig = (status) => {
    const s = status?.toUpperCase();
    switch (s) {
      case 'DELIVERED': 
        return { text: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', icon: 'fa-check-circle', label: 'Delivered' };
      case 'SHIPPED': 
        return { text: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20', icon: 'fa-truck-fast', label: 'In Transit' };
      case 'CREATED': 
      case 'PROCESSING':
        return { text: 'text-[#F5DEB3]', bg: 'bg-[#F5DEB3]/10', border: 'border-[#F5DEB3]/20', icon: 'fa-box-open', label: 'Processing' };
      case 'CANCELLED': 
        return { text: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20', icon: 'fa-ban', label: 'Cancelled' };
      default: 
        return { text: 'text-gray-400', bg: 'bg-gray-400/10', border: 'border-gray-400/20', icon: 'fa-circle-info', label: status };
    }
  };

  if (isLoading) {
    return (
      <div className="bg-[#1c3026] min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-[#F5DEB3] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#1c3026] min-h-screen flex items-center justify-center text-white">
        <div className="text-center">
          <h2 className="text-2xl mb-4">Failed to load orders</h2>
          <p className="text-gray-400">Please try again later</p>
        </div>
      </div>
    );
  }

  return (
    // RESTORED ORIGINAL BACKGROUND COLOR
    <div className="bg-[#1c3026] min-h-screen font-sans text-[#e8e6e1] selection:bg-[#F5DEB3] selection:text-[#1c3026]">

      {/* --- RESTORED ORIGINAL AMBIENT BACKGROUND --- */}
      <div className="fixed top-0 left-0 w-full h-[600px] bg-gradient-to-b from-[#2a4538] to-[#1c3026] pointer-events-none opacity-60"></div>
      <div className="fixed -bottom-40 -left-40 w-[600px] h-[600px] bg-[#F5DEB3] rounded-full blur-[200px] opacity-[0.03] pointer-events-none"></div>

      <main className="max-w-5xl mx-auto pt-28 pb-20 px-4 md:px-8 relative z-10">
        
        {/* --- HEADER --- */}
        <div className="mb-10 md:mb-16 flex flex-col md:flex-row md:items-end justify-between gap-4">
           <div>
             <div className="flex items-center gap-3 mb-2">
                 <span className="h-[1px] w-8 bg-[#F5DEB3]"></span>
                 <span className="text-[#F5DEB3] font-bold tracking-[0.2em] uppercase text-[10px]">History</span>
             </div>
             <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-white leading-tight">
               Order <span className="italic text-[#F5DEB3] opacity-90">Archive.</span>
             </h1>
           </div>
           
           {/* Stat Pill */}
           <div className="px-5 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm flex items-center gap-3">
               <span className="text-gray-400 text-xs uppercase tracking-wider">Total Orders</span>
               <span className="text-[#F5DEB3] font-bold font-serif text-xl">{orderResponse?.data?.totalOrders || orders.length}</span>
           </div>
        </div>

        {/* --- ORDERS LIST (New Enhanced Layout) --- */}
        <AnimatePresence mode='wait'>
        {orders.length === 0 ? (
          // EMPTY STATE
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-[3rem] border border-white/5 border-dashed backdrop-blur-sm"
          >
             <div className="w-24 h-24 bg-[#1c3026] rounded-full flex items-center justify-center mb-6 shadow-inner border border-white/10">
                <i className="fa-solid fa-box-open text-[#F5DEB3] text-3xl opacity-50"></i>
             </div>
             <h3 className="text-2xl font-serif text-white mb-2">Your collection is empty.</h3>
             <p className="text-gray-400 text-sm mb-8">Discover our latest artifacts and illuminated designs.</p>
             <button 
               onClick={() => navigate('/products')}
               className="px-8 py-3 bg-[#F5DEB3] text-[#1c3026] rounded-full font-bold uppercase tracking-widest text-[10px] hover:bg-white hover:scale-105 transition-all duration-300 shadow-lg"
             >
               Browse Collection
             </button>
          </motion.div>
        ) : (
          // ORDER CARDS
          <div className="space-y-6">
            {orders.map((order, idx) => {
              const statusConfig = getStatusConfig(order.status);
              const dateObj = new Date(order.createdAt);
              
              return (
                <motion.div 
                    key={order.orderId}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    // Used bg-white/5 to blend with your #1c3026 background nicely
                    className="bg-[#e8e6e1]/5 backdrop-blur-md rounded-[24px] border border-white/5 overflow-hidden group hover:border-[#F5DEB3]/30 transition-all duration-500 hover:shadow-2xl hover:shadow-black/20"
                >
                    {/* --- CARD HEADER --- */}
                    <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-black/10">
                        
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
                                    <span className="w-1 h-1 rounded-full bg-gray-500"></span>
                                    <span className="text-xs text-gray-400">
                                        {dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 group/id cursor-pointer" onClick={() => copyToClipboard(order.orderId)}>
                                    <span className="font-serif text-white text-lg leading-none">
                                        Order #{order.orderId.slice(0, 8)}...
                                    </span>
                                    <i className="fa-regular fa-copy text-gray-500 text-xs opacity-0 group-hover/id:opacity-100 transition-opacity"></i>
                                </div>
                             </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-3 mt-2 md:mt-0">
                             <button className="flex-1 md:flex-none py-2 px-4 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/30 text-[10px] font-bold uppercase tracking-widest transition-all">
                                Invoice
                             </button>
                             {statusConfig.label !== 'Delivered' && (
                                 <button className="flex-1 md:flex-none py-2 px-4 rounded-xl bg-[#F5DEB3] text-[#1c3026] text-[10px] font-bold uppercase tracking-widest hover:bg-white transition-all shadow-lg shadow-[#F5DEB3]/10">
                                    Track
                                 </button>
                             )}
                        </div>
                    </div>

                    {/* --- ITEMS LIST --- */}
                    <div className="p-6">
                        {/* Order Tracker */}
                        <div className="mb-6 pb-6 border-b border-white/5">
                            <Suspense fallback={<ComponentLoader />}>
                                <OrderTracker status={order.status} />
                            </Suspense>
                            
                            {/* Tracking Information */}
                            {order.trackingInfo && (order.trackingInfo.carrier || order.trackingInfo.trackingNumber) && (
                                <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <i className="fa-solid fa-truck text-[#F5DEB3] text-sm"></i>
                                        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Tracking Details</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                        {order.trackingInfo.carrier && (
                                            <div>
                                                <span className="text-gray-500 text-xs">Carrier:</span>
                                                <p className="text-white font-medium">{order.trackingInfo.carrier}</p>
                                            </div>
                                        )}
                                        {order.trackingInfo.trackingNumber && (
                                            <div>
                                                <span className="text-gray-500 text-xs">Tracking Number:</span>
                                                <p className="text-white font-mono text-sm">{order.trackingInfo.trackingNumber}</p>
                                            </div>
                                        )}
                                        {order.trackingInfo.estimatedDelivery && (
                                            <div className="md:col-span-2">
                                                <span className="text-gray-500 text-xs">Estimated Delivery:</span>
                                                <p className="text-[#F5DEB3] font-medium">
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
                                    <div key={i} className="flex gap-4 items-center">
                                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-[#e8e6e1] p-2 shrink-0 overflow-hidden border border-white/10">
                                            <img 
                                                src={imgUrl.includes('demo') ? 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?q=80&w=200' : imgUrl} 
                                                alt={name} 
                                                className="w-full h-full object-contain mix-blend-multiply" 
                                            />
                                        </div>

                                        <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center justify-between gap-2">
                                            <div>
                                                <h4 className="text-white font-medium text-sm md:text-base truncate pr-4">{name}</h4>
                                                <p className="text-gray-400 text-xs mb-1">{variant}</p>
                                                <div className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[10px] text-gray-400">
                                                    Qty: {qty}
                                                </div>
                                            </div>
                                            
                                            <div className="text-right">
                                                <p className="text-[#F5DEB3] font-mono font-bold">₹{(price * qty).toLocaleString()}</p>
                                                <p className="text-gray-500 text-[10px]">₹{price} ea</p>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* --- FOOTER TOTAL --- */}
                    <div className="px-6 py-4 bg-black/20 border-t border-white/5 flex justify-between items-center">
                        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Total Amount</span>
                        <span className="text-xl font-serif text-white">₹{order.amount.toLocaleString()}</span>
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