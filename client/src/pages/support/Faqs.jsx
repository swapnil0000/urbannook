import React, { useEffect } from 'react';
import SEOHead from '../../component/SEOHead';
import DocShell from '../../component/DocShell';

const Faq = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const faqs = [
    {
      category: "Orders & Shipping",
      items: [
        // { q: "How long does shipping take?", a: "We offer express shipping within 24 - 48 hours across India." }, // paused: no 24-48 hr promise for now
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
        { q: "Is Cash on Delivery (COD) available?", a: "We offer partial COD on select products - pay a small advance online to confirm the order, and the rest in cash on delivery. Full COD (no advance) is not available." }
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
    <DocShell
      wide
      eyebrow="Help Center"
      title="Frequently Asked Questions"
      sub="Everything you need to know about our products and billing. Can't find the answer you're looking for? Chat with us."
    >
      <SEOHead
        title="FAQs"
        description="Frequently asked questions about UrbanNook - shipping, exchanges, custom orders, assembly, and more."
        url="/faqs"
        structuredData={faqStructuredData}
      />

      {/* every answer is visible on the page: category = h2, question = h3 */}
      <div className="rd-faqp">
        {faqs.map((section) => (
          <section key={section.category} className="rd-faqp-sec">
            <h2 className="rd-faqp-cat font-archivo text-ink">{section.category}</h2>
            <div>
              {section.items.map((item, itemIdx) => (
                <div key={item.q} className="rd-faqp-item">
                  <h3 className="font-archivo text-ink">
                    <span className="font-mono" aria-hidden="true">{String(itemIdx + 1).padStart(2, '0')}</span>
                    {item.q}
                  </h3>
                  <p className="font-inter text-muted">{item.a}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </DocShell>
  );
};

export default Faq;
