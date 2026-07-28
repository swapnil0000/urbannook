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
    <div className="bg-paper min-h-screen text-ink font-inter relative selection:bg-brand selection:text-white">
      
      {/* --- BACKGROUND ELEMENTS --- */}
      {/* Large Watermark */}
      <div className="absolute top-20 left-0 w-full overflow-hidden pointer-events-none opacity-[0.04]">
        <h1 className="font-archivo text-[15vw] font-extrabold text-center leading-none text-ink tracking-tighter uppercase whitespace-nowrap">
          Terms &amp; Use
        </h1>
      </div>

      {/* Ambient Glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand/5 rounded-full blur-[120px] pointer-events-none"></div>

      {/* --- MAIN CONTENT --- */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-20 md:py-28">
        
        {/* Header */}
        <div className="mb-2 text-left  border-b border-hair pb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-hair w-fit mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-brand"></span>
            <span className="gl-lbl text-[10px] text-brand">Conditions</span>
          </div>

          <h1 className="font-archivo text-4xl md:text-6xl font-extrabold text-ink mb-4 leading-tight">
            Terms &amp; <span className="text-brand">Conditions</span>
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
              <span className="gl-lbl text-brand text-sm">01.</span> Introduction
            </h2>
            <p className="leading-relaxed text-muted">
              Welcome to Urban Nook. These Terms and Conditions govern your use of our website (urbannook.in) and the purchase of products from our online store. By accessing our site or purchasing our products, you agree to be bound by these terms. If you do not agree with any part of these terms, please do not use our services.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="font-archivo text-xl md:text-2xl font-bold text-ink mb-4 flex items-center gap-3">
              <span className="gl-lbl text-brand text-sm">02.</span> Eligibility & Account
            </h2>
            <p className="leading-relaxed text-muted mb-4">
              By using this site, you represent that you are at least the age of majority in your state or province of residence. You are responsible for maintaining the confidentiality of your account information and password.
            </p>
            <ul className="list-disc pl-5 space-y-2 text-muted marker:text-brand">
              <li>You must provide accurate and current information during registration.</li>
              <li>You are responsible for all activities that occur under your account.</li>
              <li>We reserve the right to terminate accounts or cancel orders at our sole discretion.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="font-archivo text-xl md:text-2xl font-bold text-ink mb-4 flex items-center gap-3">
              <span className="gl-lbl text-brand text-sm">03.</span> Products & Pricing
            </h2>
            <p className="leading-relaxed text-muted mb-4">
              We strive to display the colors and images of our products as accurately as possible. However, we cannot guarantee that your computer monitor's display of any color will be accurate.
            </p>
            <p className="leading-relaxed text-muted">
              All prices are subject to change without notice. We reserve the right to modify or discontinue any product at any time. We shall not be liable to you or to any third-party for any modification, price change, suspension, or discontinuance of the Service.
            </p>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="font-archivo text-xl md:text-2xl font-bold text-ink mb-4 flex items-center gap-3">
              <span className="gl-lbl text-brand text-sm">04.</span> Payments & Billing
            </h2>
            <p className="leading-relaxed text-muted mb-4">
              We accept payments via <strong className="text-ink font-semibold">Razorpay</strong>, which supports Credit/Debit Cards, UPI, Net Banking, and Wallets. By providing payment information, you represent that you have the legal right to use the payment method provided.
            </p>
            <p className="leading-relaxed text-muted">
              In the event that we make a change to or cancel an order, we may attempt to notify you by contacting the e-mail and/or billing address/phone number provided at the time the order was made.
            </p>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="font-archivo text-xl md:text-2xl font-bold text-ink mb-4 flex items-center gap-3">
              <span className="gl-lbl text-brand text-sm">05.</span> Shipping, Returns & Cancellations
            </h2>
            <p className="leading-relaxed text-muted">
              Our shipping, return, and cancellation policies are an integral part of these Terms. Please review our specific policies for detailed information:
            </p>
            <div className="flex flex-wrap gap-4 mt-6">
              <Link to="/shipping-policy" className="text-sm border border-hair px-4 py-2 rounded bg-white text-faint">Shipping Policy</Link>
              <Link to="/cancellation-refund" className="text-sm border border-hair px-4 py-2 rounded bg-white text-faint ">Cancellation &amp; Refund</Link>
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="font-archivo text-xl md:text-2xl font-bold text-ink mb-4 flex items-center gap-3">
              <span className="gl-lbl text-brand text-sm">06.</span> Intellectual Property
            </h2>
            <p className="leading-relaxed text-muted">
              All content included on this site, such as text, graphics, logos, button icons, images, and software, is the property of Urban Nook or its content suppliers and protected by Indian and international copyright laws. Unauthorized use of any content is strictly prohibited.
            </p>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="font-archivo text-xl md:text-2xl font-bold text-ink mb-4 flex items-center gap-3">
              <span className="gl-lbl text-brand text-sm">07.</span> Governing Law
            </h2>
            <p className="leading-relaxed text-muted">
              These Terms of Service and any separate agreements whereby we provide you Services shall be governed by and construed in accordance with the laws of <strong className="text-ink font-semibold">Gurgaon, India</strong>. Any disputes arising in connection with these terms shall be subject to the exclusive jurisdiction of the courts located in Gurgaon.
            </p>
          </section>

          {/* Section 8: Warranty */}
          <section id="warranty-policy">
            <h2 className="font-archivo text-xl md:text-2xl font-bold text-ink mb-4 flex items-center gap-3">
              <span className="gl-lbl text-brand text-sm">08.</span> Warranty Policy
            </h2>

            <div className="space-y-8">
              {/* Scope */}
              <div>
                <h3 className="text-base font-bold text-ink mb-3 flex items-center gap-2">
                  <i className="fa-solid fa-shield-halved text-brand text-sm"></i>
                  Scope of Warranty
                </h3>
                <p className="text-muted leading-relaxed mb-3">This warranty covers only:</p>
                <ul className="list-disc pl-5 space-y-1.5 text-muted marker:text-brand">
                  <li>Manufacturing defects</li>
                  <li>Electrical failure under normal usage conditions</li>
                </ul>
                <p className="text-muted leading-relaxed mt-4 mb-3">The warranty does <strong className="text-ink font-semibold">not</strong> cover:</p>
                <ul className="list-disc pl-5 space-y-1.5 text-muted marker:text-red-400">
                  <li>Physical damage, burns, or breakage</li>
                  <li>Damage due to misuse, improper handling, or unauthorized modifications</li>
                  <li>Damage caused by power surges, water exposure, or external factors</li>
                </ul>
              </div>

              {/* Warranty Period */}
              <div>
                <h3 className="text-base font-bold text-ink mb-3 flex items-center gap-2">
                  <i className="fa-solid fa-calendar text-brand text-sm"></i>
                  Warranty Period
                </h3>
                <p className="text-muted leading-relaxed">
                  The warranty period shall be calculated from the <strong className="text-ink font-semibold">date of manufacturing</strong>, not from the date of purchase or delivery.
                </p>
              </div>

              {/* Claim Process */}
              <div>
                <h3 className="text-base font-bold text-ink mb-3 flex items-center gap-2">
                  <i className="fa-solid fa-file-lines text-brand text-sm"></i>
                  Claim Process
                </h3>
                <p className="text-muted leading-relaxed mb-3">To initiate a warranty claim, the customer must:</p>
                <ul className="list-disc pl-5 space-y-1.5 text-muted marker:text-brand">
                  <li>Provide valid proof of purchase (invoice / order ID)</li>
                  <li>Share clear images/videos of the defect (if requested)</li>
                  <li>Ship the defective product to the provided address after approval</li>
                  <li>The customer is responsible for <strong className="text-ink font-semibold">both-way shipping charges</strong> (sending the defective product and receiving the replacement/repaired unit)</li>
                </ul>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};

export default TermsConditions;