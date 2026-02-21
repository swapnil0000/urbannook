import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CustomerSupportPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [activeTab, setActiveTab] = useState('contact');
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitSuccess(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
      setTimeout(() => setSubmitSuccess(false), 3000);
    }, 1500);
  };

  const faqs = [
    {
      id: 1,
      question: 'How do I track my shipment?',
      answer: 'Once your order is dispatched, you will receive a tracking link via email and SMS. You can also view live status in the "My Orders" section of your profile.'
    },
    {
      id: 2,
      question: 'What is the return timeline?',
      answer: 'We accept returns within 7 days of delivery for damaged or defective products. Please ensure the item is unused and in original packaging with tags intact.'
    },
    {
      id: 3,
      question: 'Is assembly required?',
      answer: 'Most of our decor items are pre-assembled. For larger furniture pieces, we provide a detailed, easy-to-follow manual and all necessary tools in the box.'
    },
    {
      id: 4,
      question: 'Do you ship internationally?',
      answer: 'Currently, we ship to all pin codes within India. International shipping is part of our future roadmap. Stay tuned!'
    }
  ];

  return (
    <div className="bg-[#1c3026] min-h-screen font-sans text-[#e8e6e1] selection:bg-[#F5DEB3] selection:text-[#1c3026]">

      {/* --- AMBIENT BACKGROUND --- */}
      <div className="fixed top-0 left-0 w-full h-[600px] bg-gradient-to-b from-[#2a4538] to-[#1c3026] pointer-events-none opacity-60"></div>
      <div className="fixed -bottom-40 -left-40 w-[600px] h-[600px] bg-[#F5DEB3] rounded-full blur-[200px] opacity-[0.03] pointer-events-none"></div>

      <main className="max-w-5xl mx-auto pt-28 pb-20 px-4 md:px-8 relative z-10">
        
        {/* --- HEADER --- */}
        <div className="mb-10 md:mb-16 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-8 lg:pb-12">
           <div>
             <div className="flex items-center gap-3 mb-2">
                 <span className="h-[1px] w-8 bg-[#F5DEB3]"></span>
                 <span className="text-[#F5DEB3] font-bold tracking-[0.2em] uppercase text-[10px]">Support</span>
             </div>
             <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-white leading-tight">
               How can we <span className="italic text-[#F5DEB3] opacity-90">assist you?</span>
             </h1>
           </div>
        </div>

        {/* --- TAB SWITCHER --- */}
        <div className="flex justify-start mb-8">
            <div className="bg-black/20 p-1.5 rounded-full border border-white/5 backdrop-blur-md flex relative">
                {['contact', 'faq'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`relative px-6 md:px-8 py-2.5 md:py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all z-10 ${
                            activeTab === tab ? 'text-[#1c3026]' : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        {tab === 'contact' ? 'Message Us' : 'Common Queries'}
                        {activeTab === tab && (
                            <motion.div 
                                layoutId="activeTab"
                                className="absolute inset-0 bg-[#F5DEB3] rounded-full -z-10 shadow-lg shadow-[#F5DEB3]/20"
                            />
                        )}
                    </button>
                ))}
            </div>
        </div>

        <AnimatePresence mode="wait">
            
            {/* --- CONTACT FORM TAB --- */}
            {activeTab === 'contact' && (
                <motion.div
                    key="contact"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start"
                >
                    {/* Left: Interactive Form */}
                    <div className="lg:col-span-8 bg-[#e8e6e1]/5 backdrop-blur-md border border-white/5 rounded-[24px] p-6 md:p-8 shadow-2xl">
                        <div className="mb-8">
                            <h3 className="text-2xl font-serif text-white mb-2">Send a Request</h3>
                            <p className="text-sm text-gray-400 font-light">Our team typically responds within 2 hours.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase tracking-widest text-[#F5DEB3]/70 font-bold ml-2">Your Name</label>
                                    <input 
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        type="text" 
                                        required
                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-5 py-4 text-white focus:border-[#F5DEB3] focus:outline-none transition-colors placeholder-white/20"
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase tracking-widest text-[#F5DEB3]/70 font-bold ml-2">Email Address</label>
                                    <input 
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        type="email" 
                                        required
                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-5 py-4 text-white focus:border-[#F5DEB3] focus:outline-none transition-colors placeholder-white/20"
                                        placeholder="john@example.com"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-widest text-[#F5DEB3]/70 font-bold ml-2">Topic</label>
                                <div className="relative">
                                    <select 
                                        name="subject"
                                        value={formData.subject}
                                        onChange={handleInputChange}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-5 py-4 text-white focus:border-[#F5DEB3] focus:outline-none transition-colors appearance-none cursor-pointer"
                                    >
                                        <option value="" className="bg-[#1c3026]">Select a topic...</option>
                                        <option value="order" className="bg-[#1c3026]">Order Status</option>
                                        <option value="product" className="bg-[#1c3026]">Product Inquiry</option>
                                        <option value="returns" className="bg-[#1c3026]">Returns & Refunds</option>
                                        <option value="other" className="bg-[#1c3026]">Other</option>
                                    </select>
                                    <i className="fa-solid fa-chevron-down absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 text-xs pointer-events-none"></i>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-widest text-[#F5DEB3]/70 font-bold ml-2">Message</label>
                                <textarea 
                                    name="message"
                                    value={formData.message}
                                    onChange={handleInputChange}
                                    required
                                    rows="4"
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-5 py-4 text-white focus:border-[#F5DEB3] focus:outline-none transition-colors placeholder-white/20 resize-none"
                                    placeholder="How can we help you today?"
                                ></textarea>
                            </div>

                            <button 
                                type="submit"
                                disabled={isSubmitting || submitSuccess}
                                className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest text-xs transition-all shadow-lg flex items-center justify-center gap-3 ${
                                    submitSuccess 
                                    ? 'bg-green-600 text-white' 
                                    : 'bg-[#F5DEB3] text-[#1c3026] hover:bg-white'
                                }`}
                            >
                                {isSubmitting ? (
                                    <>Processing...</>
                                ) : submitSuccess ? (
                                    <><i className="fa-solid fa-check"></i> Message Sent</>
                                ) : (
                                    <>Send Message <i className="fa-solid fa-paper-plane"></i></>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Right: Contact Cards */}
                    <div className="lg:col-span-4 space-y-4">
                        <div className="p-6 rounded-2xl bg-[#e8e6e1]/5 border border-white/10 hover:border-[#F5DEB3]/30 transition-all group">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-full bg-[#F5DEB3]/10 flex items-center justify-center text-[#F5DEB3] group-hover:scale-110 transition-transform">
                                    <i className="fa-solid fa-phone"></i>
                                </div>
                                <div>
                                    <h4 className="text-white font-serif text-lg mb-1">Call Support</h4>
                                    <p className="text-[#F5DEB3] font-mono text-sm mb-2">+91 63864 55982</p>
                                    <p className="text-xs text-gray-500">Mon-Sat, 9AM - 7PM</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 rounded-2xl bg-[#e8e6e1]/5 border border-white/10 hover:border-[#F5DEB3]/30 transition-all group">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-full bg-[#F5DEB3]/10 flex items-center justify-center text-[#F5DEB3] group-hover:scale-110 transition-transform">
                                    <i className="fa-solid fa-envelope"></i>
                                </div>
                                <div>
                                    <h4 className="text-white font-serif text-lg mb-1">Email Us</h4>
                                    <a href="mailto:support@urbannook.in" className="text-[#F5DEB3] font-mono text-sm mb-2 block hover:underline">support@urbannook.in</a>
                                    <p className="text-xs text-gray-500">Guaranteed response in 24h</p>
                                </div>
                            </div>
                        </div>

                        <a href="https://wa.me/918299638749" target="_blank" rel="noreferrer" className="block p-6 rounded-2xl bg-[#e8e6e1]/5 border border-white/10 hover:border-[#F5DEB3]/30 transition-all group cursor-pointer">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-full bg-[#F5DEB3]/10 flex items-center justify-center text-[#F5DEB3] group-hover:scale-110 transition-transform">
                                    <i className="fa-brands fa-whatsapp text-xl"></i>
                                </div>
                                <div>
                                    <h4 className="text-white font-serif text-lg mb-1">Chat on WhatsApp</h4>
                                    <p className="text-[#F5DEB3] font-mono text-sm mb-2">+91 82996 38749</p>
                                    <p className="text-xs text-gray-500">Available 24/7</p>
                                </div>
                            </div>
                        </a>
                    </div>
                </motion.div>
            )}

            {/* --- FAQ TAB --- */}
            {activeTab === 'faq' && (
                <motion.div
                    key="faq"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                >
                    <div className="bg-[#e8e6e1]/5 backdrop-blur-md border border-white/5 rounded-[24px] overflow-hidden">
                        {faqs.map((faq, index) => (
                            <div key={faq.id} className="border-b border-white/5 last:border-0">
                                <button 
                                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                                    className="w-full p-6 md:p-8 flex justify-between items-center text-left group hover:bg-white/5 transition-colors"
                                >
                                    <span className={`text-base md:text-lg font-serif transition-colors ${expandedFaq === index ? 'text-[#F5DEB3]' : 'text-white'}`}>
                                        {faq.question}
                                    </span>
                                    <span className={`w-8 h-8 rounded-full border border-white/10 flex items-center justify-center transition-all duration-300 ${expandedFaq === index ? 'rotate-180 bg-[#F5DEB3] text-[#1c3026] border-[#F5DEB3]' : 'text-gray-400'}`}>
                                        <i className="fa-solid fa-chevron-down text-xs"></i>
                                    </span>
                                </button>
                                <AnimatePresence>
                                    {expandedFaq === index && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-6 md:px-8 pb-8 text-gray-400 text-sm leading-relaxed font-light">
                                                {faq.answer}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 text-center">
                        <p className="text-gray-500 text-xs uppercase tracking-widest mb-4">Still need help?</p>
                        <button 
                            onClick={() => setActiveTab('contact')}
                            className="text-[#F5DEB3] border-b border-[#F5DEB3] pb-1 hover:text-white hover:border-white transition-colors text-sm font-serif italic"
                        >
                            Write to us directly
                        </button>
                    </div>
                </motion.div>
            )}

        </AnimatePresence>
      </main>

    </div>
  );
};

export default CustomerSupportPage;