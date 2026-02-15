import React, { useEffect } from 'react';

const PrivacyPolicy = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="bg-[#2e443c] min-h-screen text-gray-300 font-sans relative selection:bg-[#F5DEB3] selection:text-white">
      
      {/* Background Elements */}
      <div className="fixed top-20 left-0 w-full overflow-hidden pointer-events-none opacity-[0.02]">
        <h1 className="text-[15vw] font-bold text-center leading-none text-white tracking-tighter uppercase whitespace-nowrap">
          Data Privacy
        </h1>
      </div>
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-20 md:py-28">
        
        {/* Header */}
        <div className="mb-16 text-center md:text-left border-b border-white/10 pb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 w-fit mb-6 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F5DEB3]"></span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#F5DEB3]">Security</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-serif text-white mb-4 leading-tight">
            Privacy <span className="italic text-[#F5DEB3]/80">Policy</span>
          </h1>
          <p className="text-gray-400 text-sm md:text-base">
            Your trust is our most valuable asset.
          </p>
        </div>

        {/* Content */}
        <div className="space-y-12">
          
          <section>
            <h2 className="text-xl md:text-2xl font-serif text-white mb-4">01. What We Collect</h2>
            <p className="leading-relaxed text-gray-400 mb-4">
              When you purchase something from our store, we collect personal information you give us such as your name, address, and email address.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                    <h3 className="text-white font-bold text-sm mb-1">Identity Data</h3>
                    <p className="text-xs text-gray-400">Name, Username, Shipping Address</p>
                </div>
                <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                    <h3 className="text-white font-bold text-sm mb-1">Contact Data</h3>
                    <p className="text-xs text-gray-400">Email Address, Phone Number</p>
                </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-serif text-white mb-4">02. Consent</h2>
            <p className="leading-relaxed text-gray-400">
              When you provide us with personal information to complete a transaction, verify your credit card, place an order, arrange for a delivery or return a purchase, we imply that you consent to our collecting it and using it for that specific reason only.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-serif text-white mb-4">03. Disclosure</h2>
            <p className="leading-relaxed text-gray-400">
              We may disclose your personal information if we are required by law to do so or if you violate our Terms of Service. We do <strong>not</strong> sell your data to third-party marketers.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-serif text-white mb-4">04. Third-Party Services</h2>
            <p className="leading-relaxed text-gray-400 mb-4">
              In general, the third-party providers used by us (such as Razorpay for payments and ShipRocket for logistics) will only collect, use and disclose your information to the extent necessary to allow them to perform the services they provide to us.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-serif text-white mb-4">05. Security</h2>
            <p className="leading-relaxed text-gray-400">
              To protect your personal information, we take reasonable precautions and follow industry best practices to make sure it is not inappropriately lost, misused, accessed, disclosed, altered or destroyed.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;