import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Footer from '../../component/layout/Footer';

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

  const [activeInput, setActiveInput] = useState(null);

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

  // --- Animation Variants ---
  const fadeIn = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
  };

  const stagger = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
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
      subInfo: "Sector 44, 122003",
    }
  ];

  return (
    // BASE: Deep Forest Green (Not Black)
    <div className="bg-[#0F261F] min-h-screen text-[#E2E8F0] font-sans relative selection:bg-[#F5DEB3] selection:text-[#0F261F] overflow-x-hidden">
      
      {/* 1. BACKGROUND ATMOSPHERE */}
      {/* Subtle Radial Gradient to give depth (lighting effect) */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[#1A3C32] via-[#0F261F] to-[#0a1f18] pointer-events-none z-0"></div>
      
      {/* Noise Texture for 'Paper/Fabric' feel */}
      <div className="fixed inset-0 opacity-[0.04] pointer-events-none z-0 mix-blend-overlay" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
      </div>

      {/* --- HERO SECTION --- */}
      <section className="relative pt-36 pb-20 px-6 lg:px-12 z-10">
        <div className="max-w-7xl mx-auto">
             <motion.div 
               initial="hidden"
               animate="visible"
               variants={stagger}
               className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center"
             >
                {/* Text Content */}
                <div>
                    <motion.div variants={fadeIn} className="flex items-center gap-4 mb-8">
                        <span className="h-[1px] w-16 bg-[#F5DEB3]/40"></span>
                        <span className="text-xs font-bold tracking-[0.3em] text-[#F5DEB3] uppercase">
                            Connect
                        </span>
                    </motion.div>
                    
                    <motion.h1 variants={fadeIn} className="text-5xl md:text-7xl lg:text-8xl font-serif text-white leading-[1.1] mb-8">
                        Start a <br />
                        <span className="text-[#F5DEB3] opacity-90 italic font-light">Conversation.</span>
                    </motion.h1>
                    
                    <motion.p variants={fadeIn} className="text-lg text-green-100/60 font-light leading-relaxed max-w-md border-l border-[#F5DEB3]/20 pl-6">
                       For inquiries about our collections, bespoke designs, or studio visits, our team is ready to assist you.
                    </motion.p>
                </div>

                {/* Visual Content (Glassmorphism Card) */}
                <motion.div 
                  variants={fadeIn}
                  className="relative h-[500px] w-full bg-white/5 backdrop-blur-sm rounded-[3rem] border border-white/10 p-4"
                >
                    <div className="w-full h-full rounded-[2.5rem] overflow-hidden relative">
                         <img 
                            src="https://images.unsplash.com/photo-1615873968403-89e068629265?q=80&w=1200&auto=format&fit=crop" 
                            alt="Green Interior" 
                            className="w-full h-full object-cover opacity-80 hover:scale-105 transition-transform duration-[1.5s]"
                        />
                        {/* Overlay to blend image with green theme */}
                        <div className="absolute inset-0 bg-[#0F261F]/30 mix-blend-multiply"></div>
                        
                        {/* Floating Contact Badge */}
                        <div className="absolute bottom-8 right-8 bg-[#F5DEB3] text-[#0F261F] w-24 h-24 rounded-full flex flex-col items-center justify-center shadow-lg animate-spin-slow cursor-pointer hover:scale-110 transition-transform">
                             <i className="fa-solid fa-arrow-down-long text-2xl mb-1"></i>
                        </div>
                    </div>
                </motion.div>
             </motion.div>
        </div>
      </section>

      {/* --- CONTACT INFO GRID --- */}
      <section className="py-20 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {contactInfo.map((item, index) => (
                    <motion.div 
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1 }}
                        className="group bg-[#153229] p-10 rounded-[20px] border border-white/5 hover:border-[#F5DEB3]/30 hover:bg-[#1A3C32] transition-all duration-500"
                    >
                        <div className="flex justify-between items-start mb-12">
                            <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-[#F5DEB3] group-hover:bg-[#F5DEB3] group-hover:text-[#0F261F] transition-colors duration-500">
                                <i className={item.icon}></i>
                            </div>
                            <span className="text-4xl font-serif text-[#F5DEB3]/10 group-hover:text-[#F5DEB3]/20 transition-colors">
                                0{item.id}
                            </span>
                        </div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-[#F5DEB3] mb-3">{item.title}</h3>
                        <p className="text-xl font-serif text-white">{item.info}</p>
                        <p className="text-sm text-green-100/40 mt-1">{item.subInfo}</p>
                    </motion.div>
                ))}
            </div>
        </div>
      </section>

      {/* --- FORM SECTION --- */}
      <section className="py-24 px-6 relative z-10">
        <div className="max-w-4xl mx-auto">
            
            <div className="mb-16">
                <h2 className="text-4xl md:text-5xl font-serif text-[#F5DEB3] mb-6">Send us a message</h2>
                <div className="h-[1px] w-full bg-gradient-to-r from-[#F5DEB3]/50 to-transparent"></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-16">
                
                {/* Row 1: Name & Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                    <div className="relative group">
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            onFocus={() => setActiveInput('name')}
                            onBlur={() => setActiveInput(null)}
                            required
                            className="w-full bg-transparent border-b border-[#F5DEB3]/20 py-4 text-xl text-[#F5DEB3] focus:outline-none focus:border-[#F5DEB3] transition-all duration-500 placeholder-transparent"
                            placeholder="Name"
                            id="name"
                        />
                        <label 
                            htmlFor="name" 
                            className={`absolute left-0 transition-all duration-300 pointer-events-none uppercase tracking-widest text-[10px] font-bold ${
                                activeInput === 'name' || formData.name 
                                ? '-top-4 text-[#F5DEB3]' 
                                : 'top-5 text-green-100/50'
                            }`}
                        >
                            Your Name
                        </label>
                    </div>

                    <div className="relative group">
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            onFocus={() => setActiveInput('email')}
                            onBlur={() => setActiveInput(null)}
                            required
                            className="w-full bg-transparent border-b border-[#F5DEB3]/20 py-4 text-xl text-[#F5DEB3] focus:outline-none focus:border-[#F5DEB3] transition-all duration-500 placeholder-transparent"
                            placeholder="Email"
                            id="email"
                        />
                        <label 
                            htmlFor="email" 
                            className={`absolute left-0 transition-all duration-300 pointer-events-none uppercase tracking-widest text-[10px] font-bold ${
                                activeInput === 'email' || formData.email 
                                ? '-top-4 text-[#F5DEB3]' 
                                : 'top-5 text-green-100/50'
                            }`}
                        >
                            Email Address
                        </label>
                    </div>
                </div>

                {/* Subject Pills */}
                <div>
                    <p className="block uppercase tracking-widest text-[10px] font-bold text-green-100/50 mb-6">Inquiry Type</p>
                    <div className="flex flex-wrap gap-4">
                        {['Product Inquiry', 'Interior Design', 'Partnership', 'Support'].map((option) => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => setFormData({...formData, subject: option})}
                                className={`px-8 py-3 rounded-full text-sm transition-all duration-300 border ${
                                    formData.subject === option 
                                    ? 'bg-[#F5DEB3] text-[#0F261F] border-[#F5DEB3] font-bold' 
                                    : 'bg-transparent text-green-100/60 border-[#F5DEB3]/20 hover:border-[#F5DEB3] hover:text-[#F5DEB3]'
                                }`}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Message */}
                <div className="relative group">
                    <textarea
                        name="message"
                        value={formData.message}
                        onChange={handleInputChange}
                        onFocus={() => setActiveInput('message')}
                        onBlur={() => setActiveInput(null)}
                        required
                        rows="1"
                        className="w-full bg-transparent border-b border-[#F5DEB3]/20 py-4 text-xl text-[#F5DEB3] focus:outline-none focus:border-[#F5DEB3] transition-all duration-500 placeholder-transparent resize-none min-h-[80px]"
                        placeholder="Message"
                        id="message"
                    ></textarea>
                    <label 
                        htmlFor="message" 
                        className={`absolute left-0 transition-all duration-300 pointer-events-none uppercase tracking-widest text-[10px] font-bold ${
                            activeInput === 'message' || formData.message 
                            ? 'top-0 text-[#F5DEB3]' 
                            : 'top-8 text-green-100/50'
                        }`}
                    >
                        How can we help?
                    </label>
                </div>

                {/* Submit Button */}
                <div className="flex justify-start">
                    <button
                        type="submit"
                        className="group relative px-10 py-5 bg-transparent border border-[#F5DEB3] text-[#F5DEB3] overflow-hidden rounded-full font-bold uppercase tracking-widest text-xs hover:text-[#0F261F] transition-colors duration-500"
                    >
                        {/* Hover fill effect */}
                        <div className="absolute inset-0 w-0 bg-[#F5DEB3] transition-all duration-[250ms] ease-out group-hover:w-full"></div>
                        <span className="relative z-10 flex items-center gap-3">
                            Send Request
                            <i className="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                        </span>
                    </button>
                </div>
            </form>
        </div>
      </section>

      {/* --- MAP BANNER --- */}
      <section className="h-[300px] w-full relative z-10 border-t border-[#F5DEB3]/10 overflow-hidden">
         <img 
            src="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1200&auto=format&fit=crop" 
            className="w-full h-full object-cover grayscale opacity-40 hover:grayscale-0 hover:opacity-60 transition-all duration-[2s]"
            alt="Location"
         />
         <div className="absolute inset-0 flex items-center justify-center">
             <div className="bg-[#0F261F]/90 backdrop-blur-md px-10 py-6 border border-[#F5DEB3]/20 rounded-sm">
                 <p className="text-[#F5DEB3] text-center font-serif text-2xl italic">Visit the Studio</p>
                 <p className="text-green-100/60 text-center text-xs uppercase tracking-widest mt-2">Gurgaon, Sector 44</p>
             </div>
         </div>
      </section>

      <Footer />
    </div>
  );
};

export default ContactPage;