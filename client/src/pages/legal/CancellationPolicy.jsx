import React, { useEffect } from 'react';
// Import the helper
import {  SUPPORT_EMAIL } from '../../utils/contactHelper';

const CancellationPolicy = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="bg-paper min-h-screen text-ink font-inter relative selection:bg-brand selection:text-white">
      
      {/* Background Elements */}
      <div className="absolute top-20 left-0 w-full overflow-hidden pointer-events-none opacity-[0.04]">
        <h1 className="font-archivo text-[15vw] font-extrabold text-center leading-none text-ink tracking-tighter uppercase whitespace-nowrap">
          Refund Policy
        </h1>
      </div>
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-20 md:py-28">
        
        {/* Header */}
        <div className="mb-2 text-left  border-b border-hair pb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-hair w-fit mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-brand"></span>
            <span className="gl-lbl text-[10px] text-brand">Support</span>
          </div>

          <h1 className="font-archivo text-4xl md:text-6xl font-extrabold text-ink mb-4 leading-tight">
            Cancellation &amp; <span className="text-brand">Refunds</span>
          </h1>
          <p className="text-muted text-sm md:text-base">
            Transparent policies for a worry-free experience.
          </p>
        </div>

        {/* Content */}
        <div className="space-y-12">
          
          <section>
            <h2 className="font-archivo text-xl md:text-2xl font-bold text-ink mb-4">
              <span className="gl-lbl text-brand text-sm"> 01.</span> Order Cancellation</h2>
            <p className="leading-relaxed text-muted mb-4">
              You may cancel your order at any time <strong className="text-ink font-semibold">before it has been dispatched</strong> from our warehouse. Once the shipping label is generated and the product leaves our facility, the order cannot be cancelled.
            </p>
            <div className="bg-white  p-6 rounded-[1rem] border border-hair">
              <p className="text-sm text-muted">
                To cancel, please email <strong className="text-brand select-all">{SUPPORT_EMAIL}</strong> with your Order ID immediately.
              </p>
            </div>
          </section>

          <section>
            <h2 className="font-archivo text-xl md:text-2xl font-bold text-ink mb-4"><span className="gl-lbl text-brand text-sm"> 02.</span> Returns &amp; Replacements</h2>
            <p className="leading-relaxed text-muted mb-4">
              We have a strict <strong className="text-ink font-semibold">3-day replacement policy</strong> applicable only for damaged, defective, or incorrect items. Since our products are made-to-order or limited batch, we do not accept returns for <span className="font-bold text-brand">&quot;change of mind&quot;</span>.
            </p>
            <ul className="list-disc pl-5 space-y-2 text-muted marker:text-brand">
              <li><strong className="text-ink font-semibold">Damaged/Defective:</strong> To claim a replacement or return for a damaged or defective item, customers must provide a clear unboxing video in which the product label is clearly visible, and share it with us within the mentioned time window.</li>
              <li><strong className="text-ink font-semibold">Wrong Item:</strong> If you receive the wrong item, please share an unboxing video clearly showing the package label within the specified time period for verification. Once confirmed, we will arrange a reverse pickup and send the correct item at no additional cost.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-archivo text-xl md:text-2xl font-bold text-ink mb-4"><span className="gl-lbl text-brand text-sm"> 03.</span> Refund Timeline</h2>
            <p className="leading-relaxed text-muted">
              If a refund is approved (for cancelled orders or unfulfillable items), it will be processed to your original payment method within <strong className="text-ink font-semibold">5-7 business days</strong>. Banks may take an additional 3-5 days to reflect the amount in your account.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default CancellationPolicy;