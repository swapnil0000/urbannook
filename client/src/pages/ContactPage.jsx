import React, { useState } from 'react';
import NewHeader from '../component/layout/NewHeader';
import Footer from '../component/layout/Footer';

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [hoveredCard, setHoveredCard] = useState(null);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission
    console.log('Form submitted:', formData);
  };

  const contactInfo = [
    {
      id: 1,
      icon: "fa-solid fa-phone",
      title: "Call Us",
      info: "+91 63864 55982",
      subInfo: "Mon-Sat 9AM-7PM",
      colorClass: "text-primary",
      bgClass: "bg-primary/10"
    },
    {
      id: 2,
      icon: "fa-solid fa-envelope",
      title: "Email Us",
      info: "support@urbannook.in",
      subInfo: "We reply within 24 hours",
      colorClass: "text-accent",
      bgClass: "bg-accent/10"
    },
    {
      id: 3,
      icon: "fa-solid fa-location-dot",
      title: "Visit Us",
      info: "Gurgaon India",
      subInfo: "By appointment only",
      colorClass: "text-primary",
      bgClass: "bg-primary/10"
    },
    {
      id: 4,
      icon: "fa-solid fa-clock",
      title: "Business Hours",
      info: "Mon-Sat: 9AM-7PM",
      subInfo: "Sunday: Closed",
      colorClass: "text-accent",
      bgClass: "bg-accent/10"
    }
  ];

  const faqs = [
    {
      id: 1,
      question: "What is your return policy?",
      answer: "We offer a 30-day return policy for all unused items in original packaging."
    },
    {
      id: 2,
      question: "How long does shipping take?",
      answer: "Standard delivery takes 3-5 business days. Express delivery is available in 24-48 hours."
    },
    {
      id: 3,
      question: "Do you offer customization?",
      answer: "Yes! We offer customization services for most of our products. Contact us for details."
    },
    {
      id: 4,
      question: "What payment methods do you accept?",
      answer: "We accept all major credit cards, debit cards, UPI, net banking, and cash on delivery."
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-bgSecondary via-accent/5 to-primary/10"></div>
        <div className="absolute top-20 left-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-accent/5 rounded-full blur-2xl"></div>
        
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <h1 className="text-5xl font-bold text-textPrimary mb-6 animate-fadeInUp">
            Get In <span className="text-primary">Touch</span>
          </h1>
          <div className="w-20 h-1 bg-accent mx-auto mb-8 rounded-sm"></div>
          <p className="text-xl text-textSecondary max-w-3xl mx-auto leading-relaxed">
            Have questions about our products or need assistance? We're here to help! 
            Reach out to us through any of the channels below.
          </p>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="py-16 px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {contactInfo.map((info, index) => (
              <div
                key={info.id}
                onMouseEnter={() => setHoveredCard(info.id)}
                onMouseLeave={() => setHoveredCard(null)}
                className={`
                  ${hoveredCard === info.id ? 'bg-bgSecondary border-primary shadow-2xl -translate-y-2 scale-105' : 'bg-bgPrimary border-borderPrimary shadow-md'}
                  p-8 rounded-2xl text-center border-2 transition-all duration-500 ease-out cursor-pointer
                  animate-fadeInUp
                `}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div
                  className={`
                    w-16 h-16 mx-auto mb-6 rounded-full ${info.bgClass} flex items-center justify-center
                    transition-all duration-400 ease-out
                    ${hoveredCard === info.id ? 'rotate-360 scale-110' : 'rotate-0 scale-100'}
                  `}
                >
                  <i className={`${info.icon} text-2xl ${info.colorClass}`}></i>
                </div>
                <h3 className="text-xl font-bold text-textPrimary mb-3">{info.title}</h3>
                <p className="text-textPrimary font-semibold mb-2">{info.info}</p>
                <p className="text-textSecondary text-sm">{info.subInfo}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form & Map Section */}
      <section className="py-20 px-8 bg-bgSecondary">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div className="bg-bgPrimary rounded-2xl p-8 shadow-lg">
              <h2 className="text-3xl font-bold text-textPrimary mb-6">Send us a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-textSecondary font-semibold mb-2">Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-borderPrimary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-textSecondary font-semibold mb-2">Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-borderPrimary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-textSecondary font-semibold mb-2">Subject *</label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-borderPrimary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    placeholder="What's this about?"
                  />
                </div>
                <div>
                  <label className="block text-textSecondary font-semibold mb-2">Message *</label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    required
                    rows="6"
                    className="w-full px-4 py-3 border border-borderPrimary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
                    placeholder="Tell us more about your inquiry..."
                  ></textarea>
                </div>
                <button
                  type="submit"
                  className="w-full bg-primary hover:bg-accent text-white py-4 px-8 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center gap-3"
                >
                  Send Message
                  <i className="fa-solid fa-paper-plane"></i>
                </button>
              </form>
            </div>

            {/* Map & Additional Info */}
            <div className="space-y-8">
              {/* Map Placeholder */}
              <div className="bg-bgPrimary rounded-2xl p-8 shadow-lg h-80 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fa-solid fa-map-location-dot text-3xl text-primary"></i>
                  </div>
                  <h3 className="text-xl font-bold text-textPrimary mb-2">Find Us</h3>
                  <p className="text-textSecondary">Mumbai, India</p>
                  <p className="text-textSecondary text-sm mt-2">Interactive map coming soon</p>
                </div>
              </div>

              {/* Social Media */}
              <div className="bg-bgPrimary rounded-2xl p-8 shadow-lg">
                <h3 className="text-2xl font-bold text-textPrimary mb-6">Follow Us</h3>
                <div className="flex gap-4">
                  <a href="#" className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white hover:bg-accent transition-colors">
                    <i className="fa-brands fa-instagram"></i>
                  </a>
                  <a href="#" className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white hover:bg-accent transition-colors">
                    <i className="fa-brands fa-facebook"></i>
                  </a>
                  <a href="#" className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white hover:bg-accent transition-colors">
                    <i className="fa-brands fa-twitter"></i>
                  </a>
                  <a href="#" className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white hover:bg-accent transition-colors">
                    <i className="fa-brands fa-youtube"></i>
                  </a>
                </div>
                <p className="text-textSecondary text-sm mt-4">
                  Stay updated with our latest products and offers
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-textPrimary mb-4">Frequently Asked Questions</h2>
            <div className="w-16 h-1 bg-accent mx-auto mb-6 rounded-sm"></div>
            <p className="text-lg text-textSecondary">
              Quick answers to common questions
            </p>
          </div>

          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div
                key={faq.id}
                className="bg-bgPrimary rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 animate-fadeInUp"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <h3 className="text-lg font-bold text-textPrimary mb-3 flex items-center gap-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                    <i className="fa-solid fa-question text-primary text-sm"></i>
                  </div>
                  {faq.question}
                </h3>
                <p className="text-textSecondary leading-relaxed ml-9">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-8 bg-gradient-to-r from-primary to-accent text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Still Have Questions?</h2>
          <p className="text-lg opacity-90 mb-8">
            Our customer support team is always ready to help you
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-primary px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center gap-2">
              <i className="fa-solid fa-phone"></i>
              Call Now
            </button>
            <button className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-primary transition-colors flex items-center justify-center gap-2">
              <i className="fa-solid fa-comments"></i>
              Live Chat
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ContactPage;