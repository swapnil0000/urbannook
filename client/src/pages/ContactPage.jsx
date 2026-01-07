import React, { useState, useEffect } from 'react';
import Footer from '../component/layout/Footer';

const ContactPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'Product Inquiry',
    message: ''
  });

  const [activeCard, setActiveCard] = useState(null);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
  };

  const contactInfo = [
    {
      id: 1,
      icon: "fa-solid fa-phone",
      title: "Concierge",
      info: "+91 63864 55982",
      subInfo: "Mon-Sat, 9am - 7pm",
    },
    {
      id: 2,
      icon: "fa-solid fa-envelope",
      title: "Digital Inquiries",
      info: "support@urbannook.in",
      subInfo: "Response within 24h",
    },
    {
      id: 3,
      icon: "fa-solid fa-location-dot",
      title: "The Studio",
      info: "Gurgaon, India",
      subInfo: "By Appointment Only",
    }
  ];

  return (
    <div className="bg-[#0a1a13] min-h-screen text-gray-300 font-sans relative selection:bg-emerald-500 selection:text-white">
      
      {/* --- 1. HERO SECTION (Fixed Layout) --- */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
             {/* GRID LAYOUT: Left Text | Right Image */}
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center border-b border-white/10 pb-12">
                
                {/* LEFT: Text */}
                <div>
                    <span className="inline-block px-3 py-1 mb-6 text-[10px] font-bold tracking-[0.3em] text-emerald-400 uppercase bg-white/5 border border-white/10 rounded-full">
                        Get in Touch
                    </span>
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif text-white leading-[0.9] mb-8">
                        Let's start a <br />
                        <span className="italic font-light text-emerald-500">conversation.</span>
                    </h1>
                    <p className="text-lg md:text-xl text-gray-400 font-light leading-relaxed">
                        Whether you have a question about our collections, need styling advice, or just want to say hello, our team is ready.
                    </p>
                </div>

                {/* RIGHT: Visual Element */}
                <div className="relative h-[400px] md:h-[500px] w-full rounded-[3rem] overflow-hidden border border-white/10 group">
                    <img 
                        src="https://images.unsplash.com/photo-1596524430615-b46475ddff6e?q=80&w=1200&auto=format&fit=crop" 
                        alt="Contact Us" 
                        className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity duration-700 grayscale group-hover:grayscale-0"
                    />
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a1a13] via-transparent to-transparent"></div>
                    
                    {/* Floating Action Button within Image */}
                    <div className="absolute bottom-8 right-8">
                        <a href="mailto:support@urbannook.in" className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-xl hover:scale-110 transition-transform animate-bounce">
                           <i className="fa-solid fa-envelope text-xl"></i>
                        </a>
                    </div>
                </div>

             </div>
        </div>
      </section>

      {/* --- 2. INTERACTIVE CONTACT CARDS --- */}
      <section className="py-16 px-6 relative z-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            {contactInfo.map((item) => (
                <div 
                    key={item.id}
                    onMouseEnter={() => setActiveCard(item.id)}
                    onMouseLeave={() => setActiveCard(null)}
                    className={`group relative overflow-hidden p-8 rounded-[2rem] border transition-all duration-500 ${
                        activeCard === item.id ? 'border-emerald-500/50 bg-white/5' : 'border-white/10 bg-white/[0.02]'
                    }`}
                >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white mb-6 transition-all duration-500 ${
                        activeCard === item.id ? 'bg-emerald-600 scale-110' : 'bg-white/10'
                    }`}>
                        <i className={item.icon}></i>
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">{item.title}</h3>
                    <p className="text-xl md:text-2xl font-serif text-white mb-1">{item.info}</p>
                    <p className="text-sm text-emerald-400/80">{item.subInfo}</p>
                    
                    {/* Decorative Glow */}
                    <div className={`absolute -right-10 -bottom-10 w-32 h-32 rounded-full blur-[50px] transition-opacity duration-500 ${
                        activeCard === item.id ? 'opacity-40 bg-emerald-500' : 'opacity-0'
                    }`}></div>
                </div>
            ))}
        </div>
      </section>

      {/* --- 3. SPLIT FORM & MAP SECTION --- */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto bg-white/5 rounded-[3rem] border border-white/10 overflow-hidden relative">
            
            <div className="grid grid-cols-1 lg:grid-cols-12">
                
                {/* LEFT: The Form */}
                <div className="lg:col-span-7 p-8 md:p-16">
                    <h2 className="text-3xl font-serif text-white mb-2">Send a message</h2>
                    <p className="text-gray-400 mb-10 text-sm">We usually respond within a few hours.</p>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="group">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-2 group-focus-within:text-white transition-colors">Full Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full bg-transparent border-b border-white/20 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors placeholder-white/20"
                                    placeholder="John Doe"
                                />
                            </div>
                            <div className="group">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-2 group-focus-within:text-white transition-colors">Email Address</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full bg-transparent border-b border-white/20 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors placeholder-white/20"
                                    placeholder="john@example.com"
                                />
                            </div>
                        </div>

                        <div className="group">
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-2 group-focus-within:text-white transition-colors">Subject</label>
                            <select
                                name="subject"
                                value={formData.subject}
                                onChange={handleInputChange}
                                className="w-full bg-transparent border-b border-white/20 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer [&>option]:bg-[#0a1a13]"
                            >
                                <option value="Product Inquiry">Product Inquiry</option>
                                <option value="Order Status">Order Status</option>
                                <option value="Partnership">Partnership</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div className="group">
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-2 group-focus-within:text-white transition-colors">Message</label>
                            <textarea
                                name="message"
                                value={formData.message}
                                onChange={handleInputChange}
                                required
                                rows="4"
                                className="w-full bg-transparent border-b border-white/20 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors resize-none placeholder-white/20"
                                placeholder="How can we help you today?"
                            ></textarea>
                        </div>

                        <button
                            type="submit"
                            className="group flex items-center gap-4 bg-white text-[#0a1a13] px-8 py-4 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-emerald-500 hover:text-white transition-all duration-300"
                        >
                            <span>Dispatch Message</span>
                            <i className="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                        </button>
                    </form>
                </div>

                {/* RIGHT: Visual / Map Area */}
                <div className="lg:col-span-5 relative bg-emerald-900/20 border-t lg:border-t-0 lg:border-l border-white/10 overflow-hidden min-h-[400px]">
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center opacity-40 grayscale mix-blend-luminosity hover:grayscale-0 hover:opacity-60 transition-all duration-700"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a1a13] to-transparent"></div>
                    
                    <div className="absolute bottom-0 left-0 w-full p-10">
                        <div className="mb-8">
                            <h3 className="text-white font-serif text-2xl mb-2">Social Constellation</h3>
                            <div className="flex gap-4">
                                {['instagram', 'facebook', 'twitter', 'linkedin'].map((social) => (
                                    <a key={social} href="#" className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all">
                                        <i className={`fa-brands fa-${social}`}></i>
                                    </a>
                                ))}
                            </div>
                        </div>
                        <div>
                            <p className="text-emerald-500 text-xs font-bold uppercase tracking-widest mb-2">Visit Us</p>
                            <p className="text-white text-sm leading-relaxed opacity-80">
                                Urban Nook HQ<br/>
                                Sector 44, Gurgaon<br/>
                                India - 122003
                            </p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
      </section>

      {/* --- 4. LIVE CHAT CTA --- */}
      <section className="px-6 pb-20">
        <div className="max-w-7xl mx-auto text-center py-12 border-t border-white/10">
            <h2 className="text-2xl font-serif text-white mb-4">Need immediate assistance?</h2>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <button className="text-emerald-400 font-bold uppercase tracking-widest text-xs hover:text-white transition-colors flex items-center gap-2">
                <i className="fa-solid fa-comment-dots"></i> Start Live Chat
              </button>
              <span className="text-gray-700">|</span>
              <a href="tel:+916386455982" className="text-emerald-400 font-bold uppercase tracking-widest text-xs hover:text-white transition-colors flex items-center gap-2">
                <i className="fa-solid fa-phone"></i> Call Concierge
              </a>
            </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ContactPage;