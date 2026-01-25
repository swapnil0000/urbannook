import React, { useEffect} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGetOrderHistoryQuery } from '../../store/api/userApi';

const MyOrdersPage = () => {
  const { data: orderResponse, isLoading, error } = useGetOrderHistoryQuery();
  const orders = orderResponse?.data || [];

   useEffect(() => {
      window.scrollTo(0, 0);
   }, []);
  
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
  
  const getStatusConfig = (status) => {
    switch (status) {
      case 'Delivered': return { text: 'text-[#F5DEB3]', icon: 'fa-check', label: 'Delivered' };
      case 'Processing': return { text: 'text-blue-400', icon: 'fa-rotate', label: 'In Production' };
      case 'Shipped': return { text: 'text-emerald-400', icon: 'fa-truck-fast', label: 'On The Way' };
      default: return { text: 'text-gray-400', icon: 'fa-question', label: status };
    }
  };

  return (
    <div className="bg-[#1c3026] min-h-screen font-sans text-[#e8e6e1] selection:bg-[#F5DEB3] selection:text-[#1c3026]">

      {/* --- AMBIENT BACKGROUND --- */}
      <div className="fixed top-0 left-0 w-full h-[600px] bg-gradient-to-b from-[#2a4538] to-[#1c3026] pointer-events-none opacity-60"></div>
      <div className="fixed -bottom-40 -left-40 w-[600px] h-[600px] bg-[#F5DEB3] rounded-full blur-[200px] opacity-[0.03] pointer-events-none"></div>

      <main className="max-w-5xl mx-auto pt-28 pb-20 px-4 lg:px-12 relative z-10">
        
        {/* --- PAGE HEADER --- */}
        <div className="mb-12 text-center lg:text-left sticky top-24 z-20 bg-[#1c3026]/90 backdrop-blur-xl py-4 -mx-4 px-4 lg:mx-0 lg:px-0 border-b border-white/5 lg:border-none">
           <h1 className="text-4xl md:text-6xl font-serif text-white mb-2">
             Order <span className="italic text-[#F5DEB3]">Archive.</span>
           </h1>
           <p className="text-[#F5DEB3]/60 text-sm md:text-base font-light tracking-wide">
             Track your active shipments and view purchase history.
           </p>
        </div>

        {/* --- ORDERS LIST --- */}
        <AnimatePresence>
        {orders.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#e8e6e1]/5 rounded-[2.5rem] p-12 lg:p-20 text-center border border-white/5 flex flex-col items-center backdrop-blur-sm"
          >
             <div className="w-20 h-20 bg-[#1c3026] rounded-full flex items-center justify-center mb-6 border border-white/10 shadow-inner">
                <i className="fa-solid fa-box-open text-[#F5DEB3]/50 text-2xl"></i>
             </div>
             <h3 className="text-2xl font-serif text-white mb-3">No orders found.</h3>
             <p className="text-gray-400 text-sm mb-10 max-w-xs mx-auto leading-relaxed">
                Your collection awaits. Start your journey with our latest arrivals.
             </p>
             <button className="px-10 py-4 bg-[#F5DEB3] text-[#1c3026] rounded-full font-bold uppercase tracking-widest text-xs hover:bg-white transition-all shadow-lg active:scale-95">
               Start Shopping
             </button>
          </motion.div>
        ) : (
          
          <div className="space-y-8">
            {orders.map((order, idx) => {
              const status = getStatusConfig(order.status);
              
              return (
                <motion.div 
                    key={order.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-[#e8e6e1]/5 rounded-[2rem] border border-white/5 hover:border-[#F5DEB3]/20 transition-all duration-300 group overflow-hidden"
                >
                    {/* 1. HEADER ROW */}
                    <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 bg-black/10">
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border border-white/10 ${status.text} bg-white/5`}>
                                <i className={`fa-solid ${status.icon}`}></i>
                            </div>
                            <div>
                                <span className="block font-serif text-lg text-white">{status.label}</span>
                                <span className="text-xs text-gray-500 font-mono tracking-wider">ID: {order.orderId || order.id}</span>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-8 text-right md:text-left">
                            <div>
                                <span className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Ordered On</span>
                                <span className="text-sm font-medium text-gray-300">
                                    {new Date(order.createdAt || order.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                            </div>
                            <div>
                                <span className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">Total</span>
                                <span className="text-sm font-bold text-[#F5DEB3] font-mono">₹{(order.totalAmount || order.total)?.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* PROGRESS BAR (Only if not delivered) */}
                    {order.status !== 'Delivered' && (
                        <div className="w-full h-1 bg-white/5">
                            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500" style={{ width: `${order.timeline}%` }}></div>
                        </div>
                    )}

                    {/* 2. ITEMS GRID */}
                    <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(order.items || []).map((item, index) => (
                        <div key={index} className="flex gap-5 p-4 rounded-xl bg-[#1c3026]/50 border border-white/5 hover:bg-[#1c3026] transition-colors">
                          <div className="w-16 h-16 rounded-lg bg-[#e8e6e1] p-1 shrink-0 overflow-hidden">
                            <img src={item.image || item.productImage || '/placeholder.jpg'} alt={item.name || item.productName} className="w-full h-full object-contain mix-blend-multiply" />
                          </div>
                          <div className="min-w-0 flex flex-col justify-center">
                            <h4 className="font-medium text-white text-sm truncate mb-1">{item.name || item.productName}</h4>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span>{item.variant || 'Standard'}</span>
                                <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                                <span>Qty: {item.quantity || 1}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 3. FOOTER ACTIONS */}
                    <div className="px-6 md:px-8 pb-6 md:pb-8 pt-0 flex flex-col sm:flex-row justify-end gap-3">
                        <button className="px-6 py-3 border border-white/10 text-gray-400 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:text-white hover:border-white/30 transition-all flex items-center justify-center gap-2">
                            <i className="fa-solid fa-file-invoice"></i> Invoice
                        </button>
                        
                        <button className="px-6 py-3 bg-[#F5DEB3] text-[#1c3026] rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-white transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95">
                            {order.status === 'Delivered' ? 'Buy Again' : 'Track Package'} 
                            <i className={`fa-solid ${order.status === 'Delivered' ? 'fa-rotate-right' : 'fa-location-arrow'}`}></i>
                        </button>
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