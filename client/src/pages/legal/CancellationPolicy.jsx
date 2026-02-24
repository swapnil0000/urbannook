import React, { useEffect } from 'react';
// Import the helper
import {  SUPPORT_EMAIL } from '../../utils/contactHelper';

const CancellationPolicy = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="bg-[#2e443c] min-h-screen text-gray-300 font-sans relative selection:bg-[#F5DEB3] selection:text-white">
      
      {/* Background Elements */}
      <div className="fixed top-20 left-0 w-full overflow-hidden pointer-events-none opacity-[0.02]">
        <h1 className="text-[15vw] font-bold text-center leading-none text-white tracking-tighter uppercase whitespace-nowrap">
          Refund Policy
        </h1>
      </div>
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-20 md:py-28">
        
        {/* Header */}
        <div className="mb-2 text-left  border-b border-white/10 pb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 w-fit mb-6 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F5DEB3]"></span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#F5DEB3]">Support</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-serif text-white mb-4 leading-tight">
            Cancellation & <span className="italic text-[#F5DEB3]">Refunds</span>
          </h1>
          <p className="text-gray-400 text-sm md:text-base">
            Transparent policies for a worry-free experience.
          </p>
        </div>

        {/* Content */}
        <div className="space-y-12">
          
          <section>
            <h2 className="text-xl md:text-2xl font-serif text-white mb-4">
              <span className='text-[#F5DEB3]'> 01.</span> Order Cancellation</h2>
            <p className="leading-relaxed text-gray-400 mb-4">
              You may cancel your order at any time <strong>before it has been dispatched</strong> from our warehouse. Once the shipping label is generated and the product leaves our facility, the order cannot be cancelled.
            </p>
            <div className="bg-white  p-6 rounded-[1rem]">
              <p className="text-sm text-gray-400">
                To cancel, please email <strong className="text-[#a89068] select-all">{SUPPORT_EMAIL}</strong> with your Order ID immediately.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-serif text-white mb-4"><span className='text-[#F5DEB3]'> 02.</span> Returns & Replacements</h2>
            <p className="leading-relaxed text-gray-400 mb-4">
              We have a strict <strong>7-day replacement policy</strong> applicable only for damaged, defective, or incorrect items. Since our products are made-to-order or limited batch, we do not accept returns for "change of mind."
            </p>
            <ul className="list-disc pl-5 space-y-2 text-gray-400 marker:text-[#F5DEB3]">
              <li><strong>Damaged/Defective:</strong> If you receive a broken item, please record an unboxing video and send it to us within 48 hours.</li>
              <li><strong>Wrong Item:</strong> We will arrange a reverse pickup and ship the correct item immediately at no extra cost.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-serif text-white mb-4"><span className='text-[#F5DEB3]'> 03.</span> Refund Timeline</h2>
            <p className="leading-relaxed text-gray-400">
              If a refund is approved (for cancelled orders or unfulfillable items), it will be processed to your original payment method within <strong>5-7 business days</strong>. Banks may take an additional 3-5 days to reflect the amount in your account.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default CancellationPolicy;