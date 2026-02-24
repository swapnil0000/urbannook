import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const TermsConditions = () => {
  
  // --- ADDED: Scroll to top on mount ---
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Last Updated Date
  const lastUpdated = "January 6, 2026";

  return (
    <div className="bg-[#2e443c] min-h-screen text-gray-300 font-sans relative selection:bg-[#F5DEB3] selection:text-white">
      
      {/* --- BACKGROUND ELEMENTS --- */}
      {/* Large Watermark */}
      <div className="fixed top-20 left-0 w-full overflow-hidden pointer-events-none opacity-[0.02]">
        <h1 className="text-[15vw] font-bold text-center leading-none text-white tracking-tighter uppercase whitespace-nowrap">
          Terms & Use
        </h1>
      </div>
      
      {/* Ambient Glow */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* --- MAIN CONTENT --- */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-20 md:py-28">
        
        {/* Header */}
        <div className="mb-2 text-left  border-b border-white/10 pb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 w-fit mb-6 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F5DEB3]"></span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#F5DEB3]">Conditions</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-serif text-white mb-4 leading-tight">
            Terms & <span className="italic text-[#F5DEB3]">Conditions</span>
          </h1>
          <p className="text-gray-400 text-sm md:text-base">
            Last Updated: <span className="text-[#F5DEB3]">{lastUpdated}</span>
          </p>
        </div>

        {/* Content Blocks */}
        <div className="space-y-12">
          
          {/* Section 1 */}
          <section>
            <h2 className="text-xl md:text-2xl font-serif text-white mb-4 flex items-center gap-3">
              <span className="text-[#F5DEB3] text-sm font-sans font-bold">01.</span> Introduction
            </h2>
            <p className="leading-relaxed text-gray-400">
              Welcome to Urban Nook. These Terms and Conditions govern your use of our website (urbannook.in) and the purchase of products from our online store. By accessing our site or purchasing our products, you agree to be bound by these terms. If you do not agree with any part of these terms, please do not use our services.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-xl md:text-2xl font-serif text-white mb-4 flex items-center gap-3">
              <span className="text-[#F5DEB3] text-sm font-sans font-bold">02.</span> Eligibility & Account
            </h2>
            <p className="leading-relaxed text-gray-400 mb-4">
              By using this site, you represent that you are at least the age of majority in your state or province of residence. You are responsible for maintaining the confidentiality of your account information and password.
            </p>
            <ul className="list-disc pl-5 space-y-2 text-gray-400 marker:text-[#F5DEB3]">
              <li>You must provide accurate and current information during registration.</li>
              <li>You are responsible for all activities that occur under your account.</li>
              <li>We reserve the right to terminate accounts or cancel orders at our sole discretion.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-xl md:text-2xl font-serif text-white mb-4 flex items-center gap-3">
              <span className="text-[#F5DEB3] text-sm font-sans font-bold">03.</span> Products & Pricing
            </h2>
            <p className="leading-relaxed text-gray-400 mb-4">
              We strive to display the colors and images of our products as accurately as possible. However, we cannot guarantee that your computer monitor's display of any color will be accurate.
            </p>
            <p className="leading-relaxed text-gray-400">
              All prices are subject to change without notice. We reserve the right to modify or discontinue any product at any time. We shall not be liable to you or to any third-party for any modification, price change, suspension, or discontinuance of the Service.
            </p>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-xl md:text-2xl font-serif text-white mb-4 flex items-center gap-3">
              <span className="text-[#F5DEB3] text-sm font-sans font-bold">04.</span> Payments & Billing
            </h2>
            <p className="leading-relaxed text-gray-400 mb-4">
              We accept payments via <strong>Razorpay</strong>, which supports Credit/Debit Cards, UPI, Net Banking, and Wallets. By providing payment information, you represent that you have the legal right to use the payment method provided.
            </p>
            <p className="leading-relaxed text-gray-400">
              In the event that we make a change to or cancel an order, we may attempt to notify you by contacting the e-mail and/or billing address/phone number provided at the time the order was made.
            </p>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-xl md:text-2xl font-serif text-white mb-4 flex items-center gap-3">
              <span className="text-[#F5DEB3] text-sm font-sans font-bold">05.</span> Shipping, Returns & Cancellations
            </h2>
            <p className="leading-relaxed text-gray-400">
              Our shipping, return, and cancellation policies are an integral part of these Terms. Please review our specific policies for detailed information:
            </p>
            <div className="flex flex-wrap gap-4 mt-6">
              <Link to="/shipping-policy" className="text-sm border border-white px-4 py-2 rounded bg-white text-gray-500">Shipping Policy</Link>
              <Link to="/cancellation-refund" className="text-sm border border-white px-4 py-2 rounded bg-white text-gray-500 ">Cancellation & Refund</Link>
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-xl md:text-2xl font-serif text-white mb-4 flex items-center gap-3">
              <span className="text-[#F5DEB3] text-sm font-sans font-bold">06.</span> Intellectual Property
            </h2>
            <p className="leading-relaxed text-gray-400">
              All content included on this site, such as text, graphics, logos, button icons, images, and software, is the property of Urban Nook or its content suppliers and protected by Indian and international copyright laws. Unauthorized use of any content is strictly prohibited.
            </p>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-xl md:text-2xl font-serif text-white mb-4 flex items-center gap-3">
              <span className="text-[#F5DEB3] text-sm font-sans font-bold">07.</span> Governing Law
            </h2>
            <p className="leading-relaxed text-gray-400">
              These Terms of Service and any separate agreements whereby we provide you Services shall be governed by and construed in accordance with the laws of <strong>Gurgaon, India</strong>. Any disputes arising in connection with these terms shall be subject to the exclusive jurisdiction of the courts located in Gurgaon.
            </p>
          </section>

          {/* Section 8: Contact */}
      
        </div>
      </div>
    </div>
  );
};

export default TermsConditions;