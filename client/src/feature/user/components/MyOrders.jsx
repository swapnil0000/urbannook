import React, { useState } from 'react';

const MyOrders = () => {
  const [orders] = useState([
    {
      id: 'SERIES-001',
      date: '2024-01-15',
      status: 'Delivered',
      total: 2499,
      items: [
        { name: 'Modern Sofa Set', image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200', price: 1999 },
        { name: 'Coffee Table', image: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=200', price: 500 }
      ]
    },
    {
      id: 'SERIES-002',
      date: '2024-01-20',
      status: 'Processing',
      total: 1299,
      items: [
        { name: 'Dining Chair', image: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=200', price: 1299 }
      ]
    }
  ]);

  const getStatusStyles = (status) => {
    switch (status) {
      case 'Delivered': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Processing': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Shipped': return 'bg-slate-900 text-white border-slate-900';
      default: return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] pt-32 pb-20 px-6 font-sans relative">
      
      {/* STUDIO BACKGROUND EFFECT */}
      <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-5%] right-[-5%] w-[60vw] h-[60vw] bg-[radial-gradient(circle,rgba(16,185,129,0.04)_0%,rgba(255,255,255,0)_70%)] blur-[100px]"></div>
          <div className="absolute bottom-[-5%] left-[-5%] w-[60vw] h-[60vw] bg-[radial-gradient(circle,rgba(59,130,246,0.03)_0%,rgba(255,255,255,0)_70%)] blur-[100px]"></div>
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        
        {/* HEADER */}
        <div className="mb-12">
           <span className="inline-block px-3 py-1 mb-4 text-[10px] font-black tracking-[0.3em] text-emerald-800 uppercase bg-emerald-50 rounded-full border border-emerald-100">
             Order History Console
           </span>
           <h1 className="text-5xl md:text-7xl font-serif text-slate-900 leading-[0.9]">
             Acquisition <span className="italic font-light text-emerald-700">Chronicle.</span>
           </h1>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white rounded-[3rem] p-20 text-center border border-slate-100 shadow-sm">
             <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <i className="fa-solid fa-box-open text-slate-300 text-2xl"></i>
             </div>
             <h3 className="text-xl font-serif text-slate-900 mb-2">The archive is empty.</h3>
             <p className="text-slate-400 text-sm mb-8 max-w-xs mx-auto">Your journey with Urban Nook hasn't started yet.</p>
             <button className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-emerald-700 transition-all shadow-xl">
               Browse Collection
             </button>
          </div>
        ) : (
          <div className="space-y-8">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-[3rem] p-8 md:p-10 border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.03)] hover:shadow-[0_30px_60px_rgba(0,0,0,0.06)] transition-all group">
                
                {/* ORDER METADATA */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 border-b border-slate-50 pb-8">
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Series ID</p>
                      <h3 className="text-xl font-serif text-slate-900">{order.id}</h3>
                    </div>
                    <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusStyles(order.status)}`}>
                      {order.status}
                    </div>
                  </div>
                  <div className="flex gap-12">
                     <div className="text-left md:text-right">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Initialization</p>
                        <p className="font-bold text-slate-900 text-sm">{new Date(order.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                     </div>
                     <div className="text-left md:text-right">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Investment</p>
                        <p className="font-serif text-xl text-slate-900">₹{order.total.toLocaleString()}</p>
                     </div>
                  </div>
                </div>

                {/* ITEM GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex items-center gap-5 p-4 bg-slate-50/50 rounded-2xl border border-white group-hover:bg-slate-50 transition-colors">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-sm shrink-0">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 text-sm truncate uppercase tracking-tight">{item.name}</h4>
                        <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mt-1">₹{item.price.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ACTION CONSOLE */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-[10px] text-slate-400 italic">Expected arrival curated by Urban Nook Concierge.</p>
                  <div className="flex gap-3 w-full sm:w-auto">
                    <button className="flex-1 sm:flex-none px-8 py-4 border border-slate-200 text-slate-900 rounded-2xl font-bold uppercase tracking-widest text-[9px] hover:bg-slate-50 transition-all">
                      Track Acquisition
                    </button>
                    <button className="flex-1 sm:flex-none px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest text-[9px] hover:bg-emerald-700 transition-all shadow-lg active:scale-95">
                      Re-Order Series
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrders;