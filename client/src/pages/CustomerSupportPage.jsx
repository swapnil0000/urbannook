import React, { useState, useEffect } from 'react';
import Footer from '../component/layout/Footer';
import NewHeader from '../component/layout/NewHeader';

const CustomerSupportPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [activeTab, setActiveTab] = useState('contact');
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    priority: 'medium'
  });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Support request:', formData);
  };

  const faqs = [
    {
      question: 'How can I track my order?',
      answer: 'You can track your order by going to "My Orders" section and clicking on "Track Order" button. You will also receive email updates at every stage.'
    },
    {
      question: 'What is your return policy?',
      answer: 'We offer a 7-day return policy for damaged or defective items. Please record an unboxing video to facilitate the process.'
    },
    {
      question: 'Do you provide assembly service?',
      answer: 'Currently, our products are DIY assembly or pre-assembled. We provide detailed manuals and video guides for all flat-pack items.'
    },
    {
      question: 'How long does delivery take?',
      answer: 'Standard delivery takes 5-7 business days across India. Metro cities usually receive orders within 3-4 days.'
    }
  ];

  return (
    <div className="bg-[#0a1a13] min-h-screen font-sans text-gray-300 selection:bg-emerald-500 selection:text-white">
      <NewHeader />

      {/* --- HERO SECTION --- */}
      <section className="pt-40 pb-16 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-[120px] pointer-events-none"></div>
        
        <div className="max-w-5xl mx-auto border-b border-white/10 pb-12 relative z-10 flex flex-col md:flex-row items-end justify-between gap-8">
            <div>
                <span className="inline-block px-3 py-1 mb-6 text-[10px] font-bold tracking-[0.3em] text-emerald-400 uppercase bg-white/5 border border-white/10 rounded-full">
                    24/7 Support
                </span>
                <h1 className="text-5xl md:text-7xl font-serif text-white leading-[0.9] mb-4">
                    Here to <br />
                    <span className="italic font-light text-emerald-500">Help.</span>
                </h1>
                <p className="text-gray-400 font-light max-w-md text-sm md:text-base">
                    Whether it's a styling question or an order update, our concierge team is at your service.
                </p>
            </div>
            
            {/* Tab Switcher */}
            <div className="flex bg-white/5 p-1 rounded-full border border-white/10 backdrop-blur-sm">
                {['contact', 'faq'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-8 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                            activeTab === tab 
                            ? 'bg-white text-[#0a1a13] shadow-lg' 
                            : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        {tab === 'contact' ? 'Message Us' : 'FAQs'}
                    </button>
                ))}
            </div>
        </div>
      </section>

      {/* --- MAIN CONTENT AREA --- */}
      <section className="px-6 pb-32">
        <div className="max-w-5xl mx-auto">
          
          {/* CONTACT TAB */}
          {activeTab === 'contact' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* Left: Form */}
                <div className="lg:col-span-7 bg-white/5 rounded-[2.5rem] p-8 md:p-12 border border-white/10">
                    <h3 className="text-2xl font-serif text-white mb-8">Submit a Request</h3>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="group">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-2">Topic</label>
                                <select
                                    name="subject"
                                    value={formData.subject}
                                    onChange={handleInputChange}
                                    className="w-full bg-[#0a1a13] border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                                    required
                                >
                                    <option value="">Select Topic</option>
                                    <option value="order">Order Status</option>
                                    <option value="product">Product Details</option>
                                    <option value="return">Return Request</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div className="group">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-2">Urgency</label>
                                <select
                                    name="priority"
                                    value={formData.priority}
                                    onChange={handleInputChange}
                                    className="w-full bg-[#0a1a13] border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                                >
                                    <option value="low">Standard</option>
                                    <option value="high">Urgent</option>
                                </select>
                            </div>
                        </div>

                        <div className="group">
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-2">Message</label>
                            <textarea
                                name="message"
                                value={formData.message}
                                onChange={handleInputChange}
                                rows="5"
                                className="w-full bg-[#0a1a13] border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors resize-none placeholder-white/20"
                                placeholder="How can we assist you today?"
                                required
                            ></textarea>
                        </div>

                        <button
                            type="submit"
                            className="w-full py-4 bg-white text-[#0a1a13] rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-emerald-500 hover:text-white transition-all shadow-lg"
                        >
                            Send Message
                        </button>
                    </form>
                </div>

                {/* Right: Quick Links */}
                <div className="lg:col-span-5 space-y-6">
                    {[
                        { icon: 'fa-phone', title: 'Call Support', desc: '+91 63864 55982', sub: 'Mon-Sat, 9AM - 7PM', action: 'tel:+916386455982' },
                        { icon: 'fa-envelope', title: 'Email Us', desc: 'support@urbannook.in', sub: 'Response in 24h', action: 'mailto:support@urbannook.in' },
                        { icon: 'fa-whatsapp', title: 'WhatsApp', desc: 'Chat Instantly', sub: 'Available 24/7', action: 'https://wa.me/916386455982' }
                    ].map((item, idx) => (
                        <a 
                            key={idx}
                            href={item.action}
                            className="flex items-center gap-6 p-6 rounded-[2rem] bg-white/5 border border-white/10 hover:bg-white/10 hover:border-emerald-500/30 transition-all group"
                        >
                            <div className="w-14 h-14 rounded-full bg-[#0a1a13] border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                                <i className={`fa-brands ${item.icon.includes('whatsapp') ? '' : 'fa-solid'} ${item.icon} text-emerald-500 text-xl`}></i>
                            </div>
                            <div>
                                <h4 className="text-white font-serif text-xl">{item.title}</h4>
                                <p className="text-emerald-400 font-bold text-sm mb-0.5">{item.desc}</p>
                                <p className="text-gray-500 text-[10px] uppercase tracking-widest">{item.sub}</p>
                            </div>
                        </a>
                    ))}
                </div>
            </div>
          )}

          {/* FAQ TAB */}
          {activeTab === 'faq' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {faqs.map((faq, index) => (
                  <div key={index} className="bg-white/5 border border-white/10 rounded-[2rem] p-8 hover:bg-white/10 transition-colors">
                    <h4 className="font-serif text-xl text-white mb-4 flex items-start gap-3">
                        <span className="text-emerald-500 text-sm mt-1.5">0{index + 1}.</span>
                        {faq.question}
                    </h4>
                    <p className="text-gray-400 text-sm leading-relaxed pl-8 border-l border-white/10 ml-1.5">
                        {faq.answer}
                    </p>
                  </div>
                ))}
                
                {/* More FAQ CTA */}
                <div className="md:col-span-2 text-center mt-8">
                    <p className="text-gray-500 text-sm mb-4">Still have questions?</p>
                    <a href="/faqs" className="inline-block border-b border-emerald-500 text-emerald-500 pb-1 text-xs font-bold uppercase tracking-widest hover:text-white hover:border-white transition-all">
                        View Help Center
                    </a>
                </div>
            </div>
          )}

        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CustomerSupportPage;