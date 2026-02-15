import React, { useEffect } from 'react';

const Faq = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const faqs = [
    {
      category: "Orders & Shipping",
      items: [
        { q: "How long does shipping take?", a: "Standard shipping takes 5-7 business days. Metro cities usually receive orders within 3-4 days." },
        { q: "Can I track my order?", a: "Yes, once your order is shipped, you will receive a tracking link via email and SMS." },
        { q: "Do you ship internationally?", a: "Currently, we only ship within India. International shipping is coming soon!" }
      ]
    },
    {
      category: "Product & Care",
      items: [
        { q: "What materials do you use?", a: "We primarily use PLA+ (a biodegradable thermoplastic) for our 3D printed items, along with vegan leather and recycled fabrics." },
        { q: "Are the products durable?", a: "Yes! Our 3D printed items are designed with high infill density for structural integrity, making them durable for everyday use." },
        { q: "Do you offer customization?", a: "We accept custom orders for bulk corporate gifting. Please contact support for details." }
      ]
    },
    {
      category: "Payments",
      items: [
        { q: "What payment methods are accepted?", a: "We accept all major Credit/Debit Cards, UPI (GPay, PhonePe), Net Banking, and Wallets via Razorpay." },
        { q: "Is Cash on Delivery (COD) available?", a: "Yes, COD is available for select pincodes for orders up to ₹2,000." }
      ]
    }
  ];

  return (
    <div className="bg-[#2e443c] min-h-screen text-gray-300 font-sans relative selection:bg-[#F5DEB3] selection:text-white">
      
      {/* Background Elements */}
      <div className="fixed top-20 left-0 w-full overflow-hidden pointer-events-none opacity-[0.02]">
        <h1 className="text-[15vw] font-bold text-center leading-none text-white tracking-tighter uppercase whitespace-nowrap">
          Questions
        </h1>
      </div>
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-20 md:py-28">
        
        {/* Header */}
        <div className="mb-16 text-left border-b border-white/10 pb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 w-fit mb-6 backdrop-blur-md mx-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F5DEB3]"></span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#F5DEB3]">Help Center</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-serif text-white mb-4 leading-tight">
            Frequently Asked <span className="italic text-[#F5DEB3]">Questions</span>
          </h1>
          <p className="  text-left text-gray-400 text-sm md:text-base mx-auto">
            Everything you need to know about our products and billing. Can't find the answer you're looking for? Chat with us.
          </p>
        </div>

        {/* FAQ Grid */}
        <div className="space-y-16">
          {faqs.map((section, idx) => (
            <div key={idx} className="grid md:grid-cols-3 gap-8 md:gap-12">
              {/* Category Title */}
              <div className="md:col-span-1">
                <h3 className="text-2xl font-serif text-white sticky top-24">{section.category}</h3>
                <div className="h-1 w-12 bg-[#F5DEB3] mt-4 rounded-full"></div>
              </div>

              {/* Questions */}
              <div className="md:col-span-2 space-y-10">
                {section.items.map((item, itemIdx) => (
                  <div key={itemIdx} className="group">
                    <h4 className="text-white font-bold text-lg mb-3 flex items-start gap-3">
                      <span className="text-[#F5DEB3] text-sm mt-1">0{itemIdx + 1}.</span>
                      {item.q}
                    </h4>
                    <p className="text-gray-400 leading-relaxed pl-7 border-l border-white/10 ml-1.5">
                      {item.a}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Faq;