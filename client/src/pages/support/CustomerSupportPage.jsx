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
        <div className="bg-[#2e443c] min-h-screen font-sans text-gray-200 selection:bg-[#a89068] selection:text-white">

            {/* --- AMBIENT BACKGROUND --- */}
            <div className="fixed top-0 left-0 w-full h-[600px] bg-gradient-to-b from-[#1a2822] to-[#2e443c] pointer-events-none opacity-60"></div>
            <div className="fixed -bottom-40 -left-40 w-[600px] h-[600px] bg-[#a89068] rounded-full blur-[200px] opacity-[0.05] pointer-events-none"></div>

            <main className="max-w-5xl mx-auto pt-28 pb-20 px-4 md:px-8 relative z-10">

                {/* --- HEADER --- */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#a89068]/20 pb-8 lg:pb-12">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="h-[1px] w-8 bg-[#F5DEB3]"></span>
                            <span className="text-[#F5DEB3] font-bold tracking-[0.2em] uppercase text-[10px]">Support</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-white leading-tight">
                            How can we <span className="italic text-[#F5DEB3] ">assist you?</span>
                        </h1>
                    </div>
                </div>

                {/* --- TAB SWITCHER --- */}
                <div className="flex justify-start mb-8">
                    <div className="bg-[#f5f7f8] p-1.5 rounded-full border border-white/5 backdrop-blur-md flex relative shadow-inner">
                        {['contact', 'faq'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`relative px-6 md:px-8 py-2.5 md:py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all z-10 ${activeTab === tab ? 'text-white' : 'text-gray-400 hover:text-gray-400'
                                    }`}
                            >
                                {tab === 'contact' ? 'Message Us' : 'Common Queries'}
                                {activeTab === tab && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute inset-0 bg-[#a89068] rounded-full -z-10 shadow-lg shadow-[#a89068]/20"
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
                            {/* Left: Interactive Form (LIGHT BOX) */}
                            <div className="lg:col-span-8 bg-[#f5f7f8] border border-transparent rounded-[24px] p-6 md:p-8 shadow-xl">
                                <div className="mb-8 border-b border-gray-200 pb-6">
                                    <h3 className="text-2xl font-serif text-[#2e443c] mb-2">Send a Request</h3>
                                    <p className="text-sm text-gray-500 font-light">Our team typically responds within 2 hours.</p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] uppercase tracking-widest text-[#a89068] font-bold ml-2">Your Name</label>
                                            <input
                                                name="name"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                type="text"
                                                required
                                                className="w-full bg-white border border-gray-200 rounded-xl px-5 py-4 text-[#2e443c] focus:border-[#a89068] focus:outline-none transition-colors placeholder-gray-300 shadow-sm"
                                                placeholder="John Doe"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] uppercase tracking-widest text-[#a89068] font-bold ml-2">Email Address</label>
                                            <input
                                                name="email"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                type="email"
                                                required
                                                className="w-full bg-white border border-gray-200 rounded-xl px-5 py-4 text-[#2e443c] focus:border-[#a89068] focus:outline-none transition-colors placeholder-gray-300 shadow-sm"
                                                placeholder="john@example.com"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase tracking-widest text-[#a89068] font-bold ml-2">Topic</label>
                                        <div className="relative">
                                            <select
                                                name="subject"
                                                value={formData.subject}
                                                onChange={handleInputChange}
                                                className="w-full bg-white border border-gray-200 rounded-xl px-5 py-4 text-[#2e443c] focus:border-[#a89068] focus:outline-none transition-colors appearance-none cursor-pointer shadow-sm"
                                            >
                                                <option value="" className="text-gray-400">Select a topic...</option>
                                                <option value="order">Order Status</option>
                                                <option value="product">Product Inquiry</option>
                                                <option value="returns">Returns & Refunds</option>
                                                <option value="other">Other</option>
                                            </select>
                                            <i className="fa-solid fa-chevron-down absolute right-5 top-1/2 -translate-y-1/2 text-[#a89068] text-xs pointer-events-none"></i>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase tracking-widest text-[#a89068] font-bold ml-2">Message</label>
                                        <textarea
                                            name="message"
                                            value={formData.message}
                                            onChange={handleInputChange}
                                            required
                                            rows="4"
                                            className="w-full bg-white border border-gray-200 rounded-xl px-5 py-4 text-[#2e443c] focus:border-[#a89068] focus:outline-none transition-colors placeholder-gray-300 resize-none shadow-sm"
                                            placeholder="How can we help you today?"
                                        ></textarea>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting || submitSuccess}
                                        className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest text-xs transition-all shadow-lg flex items-center justify-center gap-3 ${submitSuccess
                                                ? 'bg-green-600 text-white'
                                                : 'bg-[#a89068] text-white hover:bg-[#2e443c]'
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

                            {/* Right: Contact Cards (LIGHT BOXES) */}
                            <div className="lg:col-span-4 space-y-4">
                                {/* Call Support */}
                                <a href="tel:+918299638749" className="block p-6 rounded-2xl bg-[#f5f7f8] border border-transparent hover:border-[#a89068]/50 hover:shadow-lg transition-all group cursor-pointer shadow-md">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-full bg-[#a89068]/10 flex items-center justify-center text-[#a89068] group-hover:bg-[#a89068] group-hover:text-white transition-all">
                                            <i className="fa-solid fa-phone"></i>
                                        </div>
                                        <div>
                                            <h4 className="text-[#2e443c] font-serif text-lg mb-1 group-hover:text-[#a89068] transition-colors">Call Support</h4>
                                            <p className="text-[#a89068] font-mono text-sm mb-2 font-bold">+91 82996 38749</p>
                                            <p className="text-xs text-gray-500">Mon-Sat, 9AM - 7PM</p>
                                        </div>
                                    </div>
                                </a>

                                {/* Email Us */}
                                <a href="mailto:support@urbannook.in" className="block p-6 rounded-2xl bg-[#f5f7f8] border border-transparent hover:border-[#a89068]/50 hover:shadow-lg transition-all group cursor-pointer shadow-md">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-full bg-[#a89068]/10 flex items-center justify-center text-[#a89068] group-hover:bg-[#a89068] group-hover:text-white transition-all">
                                            <i className="fa-solid fa-envelope"></i>
                                        </div>
                                        <div>
                                            <h4 className="text-[#2e443c] font-serif text-lg mb-1 group-hover:text-[#a89068] transition-colors">Email Us</h4>
                                            <p className="text-[#a89068] font-mono text-sm mb-2 hover:underline font-bold">support@urbannook.in</p>
                                            <p className="text-xs text-gray-500">Guaranteed response in 24h</p>
                                        </div>
                                    </div>
                                </a>

                                {/* WhatsApp */}
                                <a href="https://wa.me/918299638749" target="_blank" rel="noreferrer" className="block p-6 rounded-2xl bg-[#f5f7f8] border border-transparent hover:border-[#a89068]/50 hover:shadow-lg transition-all group cursor-pointer shadow-md">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-full bg-[#a89068]/10 flex items-center justify-center text-[#a89068] group-hover:bg-[#a89068] group-hover:text-white transition-all">
                                            <i className="fa-brands fa-whatsapp text-xl"></i>
                                        </div>
                                        <div>
                                            <h4 className="text-[#2e443c] font-serif text-lg mb-1 group-hover:text-[#a89068] transition-colors">Chat on WhatsApp</h4>
                                            <p className="text-[#a89068] font-mono text-sm mb-2 font-bold">+91 82996 38749</p>
                                            <p className="text-xs text-gray-500">Available 24/7</p>
                                        </div>
                                    </div>
                                </a>
                            </div>

                        </motion.div>
                    )}

                    {/* --- FAQ TAB (LIGHT BOX) --- */}
                    {activeTab === 'faq' && (
                        <motion.div
                            key="faq"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="bg-[#f5f7f8] border border-transparent rounded-[24px] overflow-hidden shadow-xl">
                                {faqs.map((faq, index) => (
                                    <div key={faq.id} className="border-b border-gray-200 last:border-0">
                                        <button
                                            onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                                            className="w-full p-6 md:p-8 flex justify-between items-center text-left group hover:bg-white transition-colors"
                                        >
                                            <span className={`text-base md:text-lg font-serif transition-colors ${expandedFaq === index ? 'text-[#a89068]' : 'text-[#2e443c]'}`}>
                                                {faq.question}
                                            </span>
                                            <span className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300 ${expandedFaq === index ? 'rotate-180 bg-[#a89068] text-white border-[#a89068]' : 'text-gray-400 border-gray-200'}`}>
                                                <i className="fa-solid fa-chevron-down text-xs"></i>
                                            </span>
                                        </button>
                                        <AnimatePresence>
                                            {expandedFaq === index && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden bg-white"
                                                >
                                                    <div className="px-6 md:px-8 pb-8 text-gray-500 text-sm leading-relaxed font-light">
                                                        {faq.answer}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 text-center">
                                <p className="text-gray-400 text-xs uppercase tracking-widest mb-4">Still need help?</p>
                                <button
                                    onClick={() => setActiveTab('contact')}
                                    className="text-[#a89068] border-b border-[#a89068] pb-1 hover:text-white hover:border-white transition-colors text-sm font-serif italic"
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