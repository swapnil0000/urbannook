import React, { useEffect, useState } from 'react';

const MyOrdersPage = () => {
  
  const [orders] = useState([
    {
      id: 'ORD-7782-XJ',
      date: '2025-10-15',
      status: 'Delivered',
      total: 2499,
      items: [
        { name: 'Aire Lounge Chair', image: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=400', price: 1999, variant: 'Charcoal Grey' },
        { name: 'Marble Coaster Set', image: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=400', price: 500, variant: 'Carrara White' }
      ]
    },
    {
      id: 'ORD-9921-MC',
      date: '2026-01-05',
      status: 'Processing',
      total: 1299,
      items: [
        { name: 'Minimalist Floor Lamp', image: 'https://images.unsplash.com/photo-1507473888900-52e1adad54cd?w=400', price: 1299, variant: 'Matte Black' }
      ]
    }
  ]);

   useEffect(() => {
      window.scrollTo(0, 0);
    }, []);
  

  const getStatusConfig = (status) => {
    switch (status) {
      case 'Delivered': return { bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400', icon: 'fa-check' };
      case 'Processing': return { bg: 'bg-blue-500/10 border-blue-500/20', text: 'text-blue-400', icon: 'fa-rotate' };
      case 'Shipped': return { bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-400', icon: 'fa-truck-fast' };
      default: return { bg: 'bg-white/5 border-white/10', text: 'text-gray-400', icon: 'fa-question' };
    }
  };

  return (
    <div className="bg-[#0a1a13] min-h-screen font-sans text-gray-300 selection:bg-emerald-500 selection:text-white pt-32 pb-20 md:pt-40 px-4 md:px-8 relative overflow-hidden">
      
      {/* --- BACKGROUND GLOW --- */}
      <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-5xl mx-auto relative z-10">
        
        {/* --- PAGE HEADER --- */}
        <div className="mb-12 border-b border-white/10 pb-8">
           <span className="inline-block px-3 py-1 mb-6 text-[10px] font-bold tracking-[0.3em] text-emerald-400 uppercase bg-white/5 border border-white/10 rounded-full">
             Acquisition Chronicle
           </span>
           <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif text-white leading-[0.95]">
             Your <span className="italic font-light text-emerald-500">History.</span>
           </h1>
        </div>

        {/* --- EMPTY STATE --- */}
        {orders.length === 0 ? (
          <div className="bg-white/5 rounded-[3rem] p-20 text-center border border-white/10 flex flex-col items-center">
             <div className="w-24 h-24 bg-[#0a1a13] rounded-full flex items-center justify-center mb-6 border border-white/10">
                <i className="fa-solid fa-wind text-gray-500 text-3xl"></i>
             </div>
             <h3 className="text-2xl font-serif text-white mb-3">The archive is silent.</h3>
             <p className="text-gray-500 text-sm mb-10 max-w-xs mx-auto leading-relaxed">
                Your journey with Urban Nook hasn't started yet. Let's find your first piece.
             </p>
             <button className="px-10 py-4 bg-white text-[#0a1a13] rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-emerald-500 hover:text-white transition-all shadow-lg">
               Explore Collection
             </button>
          </div>
        ) : (
          
          /* --- ORDERS LIST --- */
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {orders.map((order) => {
              const status = getStatusConfig(order.status);
              
              return (
                <div key={order.id} className="bg-white/5 rounded-[2.5rem] p-6 md:p-10 border border-white/10 hover:border-emerald-500/30 hover:bg-white/[0.07] transition-all duration-300 group overflow-hidden relative">
                    
                    {/* Decorative Bar on Left */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${order.status === 'Delivered' ? 'bg-emerald-500' : 'bg-gray-700'}`}></div>

                    {/* 1. TOP ROW: META DATA */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-8 border-b border-white/5">
                      
                      <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Series ID</span>
                          <span className="font-serif text-2xl text-white">{order.id}</span>
                      </div>

                      <div className="flex flex-wrap gap-8 md:gap-12">
                          <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Status</span>
                              <div className={`flex items-center gap-2 px-3 py-1 rounded-full w-fit border ${status.bg} ${status.text}`}>
                                  <i className={`fa-solid ${status.icon} text-[10px]`}></i>
                                  <span className="text-[10px] font-bold uppercase tracking-wider">{order.status}</span>
                              </div>
                          </div>
                          
                          <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Date</span>
                              <span className="text-sm font-bold text-white">
                                  {new Date(order.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                          </div>

                          <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Investment</span>
                              <span className="text-sm font-bold text-emerald-400">₹{order.total.toLocaleString()}</span>
                          </div>
                      </div>
                    </div>

                    {/* 2. MIDDLE ROW: ITEMS GRID */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex items-center gap-5 p-4 rounded-2xl border border-white/5 bg-[#0a1a13]/40 hover:bg-[#0a1a13]/80 transition-all duration-300">
                          <div className="w-20 h-20 rounded-xl overflow-hidden shadow-lg shrink-0 border border-white/10">
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-serif text-white text-lg leading-tight mb-1">{item.name}</h4>
                            <p className="text-[10px] text-gray-500 font-medium mb-2">{item.variant}</p>
                            <p className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded w-fit">₹{item.price.toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 3. BOTTOM ROW: ACTIONS */}
                    <div className="flex flex-col sm:flex-row items-center justify-end gap-4">
                        <button className="w-full sm:w-auto px-8 py-3.5 border border-white/20 text-gray-300 rounded-xl font-bold uppercase tracking-widest text-[9px] hover:bg-white hover:text-[#0a1a13] transition-all flex items-center justify-center gap-2">
                            <i className="fa-solid fa-receipt"></i> Invoice
                        </button>
                        
                        <button className="w-full sm:w-auto px-8 py-3.5 bg-emerald-500 text-white rounded-xl font-bold uppercase tracking-widest text-[9px] hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 active:scale-95">
                            Track Order <i className="fa-solid fa-arrow-right"></i>
                        </button>
                    </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrdersPage;