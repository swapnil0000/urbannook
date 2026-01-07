import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const Return = () => {
  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Last Updated Date
  const lastUpdated = "January 6, 2026";

  return (
    <div className="bg-[#0a1a13] min-h-screen text-gray-300 font-sans relative selection:bg-emerald-500 selection:text-white">
      
      {/* --- BACKGROUND ELEMENTS --- */}
      {/* Large Watermark */}
      <div className="fixed top-20 left-0 w-full overflow-hidden pointer-events-none opacity-[0.02]">
        <h1 className="text-[15vw] font-bold text-center leading-none text-white tracking-tighter uppercase whitespace-nowrap">
          Returns
        </h1>
      </div>
      
      {/* Ambient Glow */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* --- MAIN CONTENT --- */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-20 md:py-28">
        
        {/* Header */}
        <div className="mb-16 text-center md:text-left border-b border-white/10 pb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 w-fit mb-6 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Policy</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-serif text-white mb-4 leading-tight">
            Return & <span className="italic text-emerald-500/80">Exchange</span>
          </h1>
          <p className="text-gray-400 text-sm md:text-base">
            Last Updated: <span className="text-white">{lastUpdated}</span>
          </p>
        </div>

        {/* Content Blocks */}
        <div className="space-y-12">
          
          {/* Section 1 */}
          <section>
            <h2 className="text-xl md:text-2xl font-serif text-white mb-4 flex items-center gap-3">
              <span className="text-emerald-500 text-sm font-sans font-bold">01.</span> General Policy
            </h2>
            <p className="leading-relaxed text-gray-400">
              At Urban Nook, we take pride in the quality of our craftsmanship. If you are not completely satisfied with your purchase, we offer a comprehensive return policy. You may initiate a return request within <strong>7 days</strong> of receiving your order.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-xl md:text-2xl font-serif text-white mb-4 flex items-center gap-3">
              <span className="text-emerald-500 text-sm font-sans font-bold">02.</span> Eligibility Criteria
            </h2>
            <p className="leading-relaxed text-gray-400 mb-4">
              To be eligible for a return or exchange, your item must meet the following conditions:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-gray-400 marker:text-emerald-500">
              <li>The item must be unused and in the same condition that you received it.</li>
              <li>It must be in the original packaging with all tags and protective covers intact.</li>
              <li>You must provide the receipt or proof of purchase.</li>
              <li>Items marked as "Final Sale" or "Clearance" are not eligible for return.</li>
            </ul>
          </section>

          {/* Section 3: Distinct Box for Damaged Goods */}
          <section className="bg-white/5 border-l-2 border-emerald-500 p-6 rounded-r-xl">
            <h2 className="text-lg md:text-xl font-serif text-white mb-2 flex items-center gap-3">
              <span className="text-emerald-500 text-sm font-sans font-bold">03.</span> Damaged or Defective Items
            </h2>
            <p className="leading-relaxed text-gray-400 text-sm">
              Please inspect your order upon reception. If the item is defective, damaged, or if you receive the wrong item, contact us immediately within <strong>48 hours</strong> with unboxing photos/videos so that we can evaluate the issue and make it right.
            </p>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-xl md:text-2xl font-serif text-white mb-4 flex items-center gap-3">
              <span className="text-emerald-500 text-sm font-sans font-bold">04.</span> Non-Returnable Items
            </h2>
            <p className="leading-relaxed text-gray-400 mb-4">
              Certain types of items cannot be returned due to their nature:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                  <h3 className="text-white font-bold text-sm mb-1">Custom Orders</h3>
                  <p className="text-xs text-gray-400">Personalized or 3D printed-to-order items.</p>
               </div>
               <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                  <h3 className="text-white font-bold text-sm mb-1">Gift Cards</h3>
                  <p className="text-xs text-gray-400">Digital or physical gift vouchers.</p>
               </div>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-xl md:text-2xl font-serif text-white mb-4 flex items-center gap-3">
              <span className="text-emerald-500 text-sm font-sans font-bold">05.</span> Refund Process
            </h2>
            <p className="leading-relaxed text-gray-400">
              Once your return is received and inspected, we will send you an email to notify you that we have received your returned item. We will also notify you of the approval or rejection of your refund.
              <br /><br />
              If approved, your refund will be processed, and a credit will automatically be applied to your original method of payment within <strong>5-7 business days</strong>.
            </p>
          </section>

          {/* Section 6: Contact */}
          <section className="bg-white/5 p-8 rounded-2xl border border-white/10 mt-12">
            <h2 className="text-xl md:text-2xl font-serif text-white mb-4">Start a Return?</h2>
            <p className="text-gray-400 mb-6">
              To initiate a return, please contact our support team with your Order ID and reason for return.
            </p>
            <div className="flex flex-wrap gap-4">
                <a href="mailto:support@urbannook.in" className="inline-flex items-center gap-3 text-emerald-400 hover:text-emerald-300 font-bold tracking-wide uppercase text-sm group transition-all">
                <span>Email Support</span>
                <i className="fa-solid fa-envelope group-hover:translate-x-1 transition-transform"></i>
                </a>
                <span className="text-gray-600">|</span>
                <Link to="/contact-us" className="inline-flex items-center gap-3 text-white hover:text-gray-300 font-bold tracking-wide uppercase text-sm transition-all">
                    Contact Page
                </Link>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};

export default Return;