import React, { useEffect } from 'react';

const Return = () => {
  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Last Updated Date
  const lastUpdated = "January 6, 2026";

  return (
    <div className="bg-paper min-h-screen text-ink font-inter relative selection:bg-brand selection:text-white">

      {/* --- BACKGROUND ELEMENTS --- */}
      {/* Large Watermark */}
      <div className="absolute top-20 left-0 w-full overflow-hidden pointer-events-none opacity-[0.04]">
        <h1 className="font-archivo text-[15vw] font-extrabold text-center leading-none text-ink tracking-tighter uppercase whitespace-nowrap">
          Returns
        </h1>
      </div>

      {/* Ambient Glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand/5 rounded-full blur-[120px] pointer-events-none"></div>

      {/* --- MAIN CONTENT --- */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-20 md:py-28">

        {/* Header */}
        <div className="mb-10 text-left border-b border-hair pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-hair w-fit mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-brand"></span>
            <span className="gl-lbl text-[10px] text-brand">Policy</span>
          </div>

          <h1 className="font-archivo text-4xl md:text-6xl font-extrabold text-ink mb-4 leading-[1.05] tracking-tight">
            Return &amp; <span className="text-brand">Exchange</span>
          </h1>
          <p className="text-muted text-sm md:text-base">
            Last Updated: <span className="text-ink font-semibold">{lastUpdated}</span>
          </p>
        </div>

        {/* Content Blocks */}
        <div className="space-y-12">

          {/* Section 1 */}
          <section>
            <h2 className="font-archivo text-xl md:text-2xl font-bold text-ink mb-4 flex items-center gap-3">
              <span className="gl-lbl text-brand text-sm">01.</span> General Policy
            </h2>
            <p className="leading-relaxed text-muted">
              At Urban Nook, we take pride in the quality of our craftsmanship. If you are not completely satisfied with your purchase, we offer a comprehensive return policy. You may initiate a return request within <strong className="text-ink font-semibold">7 days</strong> of receiving your order.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="font-archivo text-xl md:text-2xl font-bold text-ink mb-4 flex items-center gap-3">
              <span className="gl-lbl text-brand text-sm">02.</span> Eligibility Criteria
            </h2>
            <p className="leading-relaxed text-muted mb-4">
              To be eligible for a return or exchange, your item must meet the following conditions:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-muted marker:text-brand">
              <li>The item must be unused and in the same condition that you received it.</li>
              <li>It must be in the original packaging with all tags and protective covers intact.</li>
              <li>You must provide the receipt or proof of purchase.</li>
              <li>Items marked as &quot;Final Sale&quot; or &quot;Clearance&quot; are not eligible for return.</li>
            </ul>
          </section>

          {/* Section 3: Distinct Box for Damaged Goods */}
          <section className="bg-surface border border-hair p-6">
            <h2 className="font-archivo text-lg md:text-xl font-bold text-brand mb-2 flex items-center gap-3">
              <span className="gl-lbl text-brand text-sm">03.</span> Damaged or Defective Items
            </h2>
            <p className="leading-relaxed text-muted text-sm">
              Please inspect your order upon reception. If the item is defective, damaged, or if you receive the wrong item, contact us immediately within <strong className="text-ink font-semibold">48 hours</strong> with unboxing photos/videos so that we can evaluate the issue and make it right.
            </p>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="font-archivo text-xl md:text-2xl font-bold text-ink mb-4 flex items-center gap-3">
              <span className="gl-lbl text-brand text-sm">04.</span> Non-Returnable Items
            </h2>
            <p className="leading-relaxed text-muted mb-4">
              Certain types of items cannot be returned due to their nature:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="bg-white p-4 border border-hair">
                  <h3 className="text-brand font-bold text-sm mb-1">Custom Orders</h3>
                  <p className="text-xs text-muted">Personalized or 3D printed-to-order items.</p>
               </div>
               <div className="bg-white p-4 border border-hair">
                  <h3 className="text-brand font-bold text-sm mb-1">Gift Cards</h3>
                  <p className="text-xs text-muted">Digital or physical gift vouchers.</p>
               </div>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="font-archivo text-xl md:text-2xl font-bold text-ink mb-4 flex items-center gap-3">
              <span className="gl-lbl text-brand text-sm">05.</span> Refund Process
            </h2>
            <p className="leading-relaxed text-muted">
              Once your return is received and inspected, we will send you an email to notify you that we have received your returned item. We will also notify you of the approval or rejection of your refund.
              <br /><br />
              If approved, your refund will be processed, and a credit will automatically be applied to your original method of payment within <strong className="text-ink font-semibold">5-7 business days</strong>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Return;
