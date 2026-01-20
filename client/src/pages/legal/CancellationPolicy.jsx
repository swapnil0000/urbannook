import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const CancellationPolicy = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="bg-[#0a1a13] min-h-screen text-gray-300 font-sans relative selection:bg-emerald-500 selection:text-white">
      
      {/* Background Elements */}
      <div className="fixed top-20 left-0 w-full overflow-hidden pointer-events-none opacity-[0.02]">
        <h1 className="text-[15vw] font-bold text-center leading-none text-white tracking-tighter uppercase whitespace-nowrap">
          Refund Policy
        </h1>
      </div>
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-20 md:py-28">
        
        {/* Header */}
        <div className="mb-16 text-center md:text-left border-b border-white/10 pb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 w-fit mb-6 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Support</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-serif text-white mb-4 leading-tight">
            Cancellation & <span className="italic text-emerald-500/80">Refunds</span>
          </h1>
          <p className="text-gray-400 text-sm md:text-base">
            Transparent policies for a worry-free experience.
          </p>
        </div>

        {/* Content */}
        <div className="space-y-12">
          
          <section>
            <h2 className="text-xl md:text-2xl font-serif text-white mb-4">01. Order Cancellation</h2>
            <p className="leading-relaxed text-gray-400 mb-4">
              You may cancel your order at any time <strong>before it has been dispatched</strong> from our warehouse. Once the shipping label is generated and the product leaves our facility, the order cannot be cancelled.
            </p>
            <div className="bg-white/5 border-l-2 border-emerald-500 p-6 rounded-r-xl">
              <p className="text-sm text-emerald-100">
                To cancel, please email <strong className="text-white">support@urbannook.in</strong> with your Order ID immediately.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-serif text-white mb-4">02. Returns & Replacements</h2>
            <p className="leading-relaxed text-gray-400 mb-4">
              We have a strict <strong>7-day replacement policy</strong> applicable only for damaged, defective, or incorrect items. Since our products are made-to-order or limited batch, we do not accept returns for "change of mind."
            </p>
            <ul className="list-disc pl-5 space-y-2 text-gray-400 marker:text-emerald-500">
              <li><strong>Damaged/Defective:</strong> If you receive a broken item, please record an unboxing video and send it to us within 48 hours.</li>
              <li><strong>Wrong Item:</strong> We will arrange a reverse pickup and ship the correct item immediately at no extra cost.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-serif text-white mb-4">03. Refund Timeline</h2>
            <p className="leading-relaxed text-gray-400">
              If a refund is approved (for cancelled orders or unfulfillable items), it will be processed to your original payment method within <strong>5-7 business days</strong>. Banks may take an additional 3-5 days to reflect the amount in your account.
            </p>
          </section>

          {/* Contact CTA */}
          <section className="bg-emerald-900/20 p-8 rounded-2xl border border-emerald-500/20 mt-12 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-serif text-white mb-1">Need to return an item?</h3>
              <p className="text-sm text-gray-400">Initiate a request via our support center.</p>
            </div>
            <a href="mailto:support@urbannook.in" className="bg-emerald-600 text-white px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-emerald-500 transition-all">
              Email Support
            </a>
          </section>

        </div>
      </div>
    </div>
  );
};

export default CancellationPolicy;