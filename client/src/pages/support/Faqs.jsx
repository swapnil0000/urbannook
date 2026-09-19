import React, { useEffect } from 'react';
import SEOHead from '../../component/SEOHead';

const Faq = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const faqs = [
    {
      category: "Orders & Shipping",
      items: [
        { q: "How long does shipping take?", a: "We offer express shipping within 24 - 48 hours across India." },
        { q: "Can I track my order?", a: "Yes, once your order is shipped, you will receive a tracking link via email." },
        { q: "Do you ship internationally?", a: "Currently, we only ship within India. International shipping is coming soon!" }
      ]
    },
    {
      category: "Product & Care",
      items: [
        { q: "What materials do you use?", a: "We primarily use PLA+ (a biodegradable thermoplastic) and PETG for our 3D printed items, but based on the customer's requirement we also print ABS/TPU and other materials." },
        { q: "Are the products durable?", a: "Yes! Our 3D printed items are designed with high infill density for structural integrity, making them durable for everyday use." },
        { q: "Do you offer customization?", a: "We accept custom orders for bulk corporate gifting. Please contact support for details." }
      ]
    },
    {
      category: "Payments",
      items: [
        { q: "What payment methods are accepted?", a: "We accept all major Credit/Debit Cards, UPI (GPay, PhonePe), Net Banking, and Wallets via Razorpay." },
        { q: "Is Cash on Delivery (COD) available?", a: "Yes, COD is available for select products." }
      ]
    }
  ];

  const faqStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.flatMap(cat =>
      cat.items.map(item => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      }))
    ),
  };

  return (
    <div className="bg-paper min-h-screen text-ink font-inter relative selection:bg-brand selection:text-white">
      <SEOHead
        title="FAQs"
        description="Frequently asked questions about UrbanNook — shipping, returns, custom orders, assembly, and more."
        url="/faqs"
        structuredData={faqStructuredData}
      />

      {/* Background Elements */}
      <div className="absolute top-20 left-0 w-full overflow-hidden pointer-events-none opacity-[0.04]">
        <h1 className="font-archivo text-[15vw] font-extrabold text-center leading-none text-ink tracking-tighter uppercase whitespace-nowrap">
          Questions
        </h1>
      </div>
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-20 md:py-28">

        {/* Header */}
        <div className="mb-16 text-left border-b border-hair pb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-hair w-fit mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-brand"></span>
            <span className="gl-lbl text-[10px] text-brand">Help Center</span>
          </div>

          <h1 className="font-archivo text-4xl md:text-6xl font-extrabold text-ink mb-4 leading-[1.05] tracking-tight">
            Frequently Asked <span className="text-brand">Questions</span>
          </h1>
          <p className="text-muted text-sm md:text-base max-w-2xl">
            Everything you need to know about our products and billing. Can&apos;t find the answer you&apos;re looking for? Chat with us.
          </p>
        </div>

        {/* FAQ Grid */}
        <div className="space-y-16">
          {faqs.map((section, idx) => (
            <div key={idx} className="grid md:grid-cols-3 gap-8 md:gap-12">
              {/* Category Title */}
              <div className="md:col-span-1">
                <h3 className="font-archivo text-2xl font-bold text-ink sticky top-24">{section.category}</h3>
                <div className="h-1 w-12 bg-brand mt-4"></div>
              </div>

              {/* Questions */}
              <div className="md:col-span-2 space-y-10">
                {section.items.map((item, itemIdx) => (
                  <div key={itemIdx} className="group">
                    <h4 className="text-ink font-bold text-lg mb-3 flex items-start gap-3">
                      <span className="gl-lbl text-brand text-sm mt-1">0{itemIdx + 1}.</span>
                      {item.q}
                    </h4>
                    <p className="text-muted leading-relaxed pl-7 border-l-2 border-hair ml-1.5">
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
