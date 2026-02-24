import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

const aboutValues = [
    {
      id: "01",
      title: "Obsessive Quality",
      icon: "fa-gem",
      desc: "We don't just pick products; we test them for durability, texture, and soul. Every piece must earn its place in your home.",
    },
    {
      id: "02",
      title: "Radical Transparency",
      icon: "fa-scale-balanced",
      desc: "No hidden fees, no misleading materials. What you see is precisely the premium craftsmanship you receive.",
    },
    {
      id: "03",
      title: "Design Democracy",
      icon: "fa-compass-drafting",
      desc: "Great aesthetics shouldn't be a luxury. We utilize modern manufacturing to make architectural beauty accessible.",
    },
    {
      id: "04",
      title: "Human Connection",
      icon: "fa-handshake",
      desc: "Real support, secure transactions, and a dedicated team that treats your investment with the respect it deserves.",
    }
];

const AboutPage = () => {
    useEffect(() => {
      window.scrollTo(0, 0);
    }, []);

    // Animation Variants
    const fadeIn = {
      hidden: { opacity: 0, y: 30 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
    };

    const stagger = {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
    };

  return (
    // BASE: New Dark Green Background
    <div className="bg-[#2e443c] min-h-screen text-[#E2E8F0] font-sans relative selection:bg-[#a89068] selection:text-white overflow-x-hidden">
      
      {/* Subtle Texture Overlay */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none z-0 mix-blend-overlay" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
      </div>

      {/* --- 1. HERO SECTION --- */}
      <section className="relative lg:pt-32 pt-24 px-6 lg:px-12 overflow-hidden flex items-center border-b border-[#a89068]/20">
        {/* Abstract Ambient Glow */}
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-gradient-to-b from-[#1a2822] to-transparent rounded-full blur-[120px] pointer-events-none opacity-60"></div>
        
        <div className="max-w-7xl mx-auto relative z-10 w-full">
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={stagger}
              className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center mb-12"
            >
                
                {/* LEFT: Text Content */}
                <div className="lg:col-span-7">
                    <motion.div variants={fadeIn} className="flex items-center gap-4 mb-8">
                        <span className="h-[1px] w-12 bg-[#F5DEB3]"></span>
                        <span className="text-[10px] font-bold tracking-[0.3em] text-[#F5DEB3] uppercase">
                            Our Urbannook Story
                        </span>
                    </motion.div>
                    
                    <motion.h1 variants={fadeIn} className="text-4xl md:text-6xl lg:text-7xl font-serif text-white leading-[1.05] mb-8">
                        Designing calm corners <br />
                        <span className="italic text-[#F5DEB3] font-light">for chaotic lives.</span>
                    </motion.h1>
                    
                    <motion.p variants={fadeIn} className="text-lg md:text-xl text-gray-300 font-light leading-relaxed max-w-lg">
                        Your Home Should Tell The Story Of Who You Are, And Be A Collection Of What You Love.
                    </motion.p>
                </div>

                {/* RIGHT: Visual Element (Badge) */}
                <motion.div variants={fadeIn} className="hidden md:flex lg:col-span-5 relative">
                    <div className="relative w-full aspect-square max-w-md mx-auto rounded-full border border-white/10 flex items-center justify-center p-8 bg-gradient-to-br from-white/5 to-transparent backdrop-blur-sm shadow-2xl">
                        {/* Spinning Dashed Ring */}
                        <div className="absolute inset-4 rounded-full border border-dashed border-[#a89068]/30 animate-[spin_40s_linear_infinite]"></div>
                        
                        <div className="text-center relative z-10">
                            <div className="w-20 h-20 mx-auto bg-[#a89068]/10 rounded-full flex items-center justify-center mb-6 border border-[#a89068]/20">
                                <i className="fa-solid fa-shield-halved text-3xl text-[#a89068]"></i>
                            </div>
                            <h3 className="font-serif text-3xl text-white mb-2">Verified Trust</h3>
                            <p className="text-sm text-[#a89068] uppercase tracking-widest font-bold">Est. 2026 • India</p>
                        </div>
                    </div>
                </motion.div>

            </motion.div>
        </div>
      </section>

      {/* --- 2. MANIFESTO & METRICS --- */}
      <section className="py-20 px-6 lg:px-12 relative z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 items-start">
            
            {/* LEFT: Text Content */}
            <div className="lg:col-span-7 lg:sticky lg:top-32">
                <h2 className="text-4xl md:text-6xl font-serif text-white mb-10 leading-[1.1]">
                    Beyond the <br/>
                    <span className="italic text-[#F5DEB3]">Ordinary.</span>
                </h2>
                
                <div className="space-y-8 text-lg text-gray-300 font-light leading-relaxed">
                    <p className="border-l-2 border-[#F5DEB3]/50 pl-6 text-white font-medium">
                        When you purchase from UrbanNook, you aren't just buying an object; you are investing in a meticulously engineered piece of functional art.
                    </p>
                    <p>
                        Founded by design and engineering enthusiasts, we started with a simple frustration: why should everyday objects lack aesthetic integrity? We realized that to ensure quality, we had to control the entire process.
                    </p>
                    <p>
                        Today, every piece is prototyped, tested, and manufactured with precision. We use industry-leading secure payment gateways (Razorpay) and reliable logistics partners to ensure your investment is protected from checkout to unboxing.
                    </p>
                </div>
            </div>

            {/* RIGHT: Data & Trust Metrics (LIGHT BOXES) */}
            <div className="lg:col-span-5 space-y-6">
                
                {/* Metric Card 1 */}
                <div className="bg-[#f5f7f8] p-8 md:p-10 rounded-[2rem] border border-white/10 shadow-xl hover:translate-y-[-5px] transition-transform duration-300">
                    <div className="flex items-center gap-4 mb-4">
                        <i className="fa-solid fa-box-open text-2xl text-[#a89068]"></i>
                        <p className="text-4xl font-serif text-[#2e443c]">10+</p>
                    </div>
                    <p className="text-sm uppercase tracking-widest text-[#a89068] font-bold">Successful Deliveries</p>
                    <p className="text-xs text-gray-500 mt-3 border-t border-gray-200 pt-3">Trusted by Many homes across India.</p>
                </div>

                {/* Metric Card 2 */}
                <div className="bg-[#f5f7f8] p-8 md:p-10 rounded-[2rem] border border-white/10 shadow-xl hover:translate-y-[-5px] transition-transform duration-300">
                    <div className="flex items-center gap-4 mb-4">
                        <i className="fa-solid fa-lock text-2xl text-[#a89068]"></i>
                        <p className="text-4xl font-serif text-[#2e443c]">100%</p>
                    </div>
                    <p className="text-sm uppercase tracking-widest text-[#a89068] font-bold">Secure Transactions</p>
                    <p className="text-xs text-gray-500 mt-3 border-t border-gray-200 pt-3">End-to-end encryption backed by Razorpay.</p>
                </div>

                {/* Metric Card 3 */}
                <div className="bg-[#f5f7f8] p-8 md:p-10 rounded-[2rem] border border-transparent shadow-xl hover:translate-y-[-5px] transition-transform duration-300">
                    <div className="flex items-center gap-4 mb-4">
                        <i className="fa-solid fa-pen-ruler text-2xl text-[#a89068]"></i>
                        <p className="text-3xl font-serif text-[#2e443c]">In-House</p>
                    </div>
                    <p className="text-sm uppercase tracking-widest text-[#a89068] font-bold">Design & Production</p>
                    <p className="text-xs text-gray-500 mt-3 border-t border-[#2e443c]/10 pt-3">Strict quality control. No cheap drop-shipping.</p>
                </div>

            </div>
        </div>
      </section>

      {/* --- 3. CORE VALUES (Cards) --- */}
      <section className="py-24 px-6 lg:px-12 bg-[#1a2822]/50 border-t border-[#a89068]/20 relative z-10">
        <div className="max-w-7xl mx-auto">
            <div className="mb-16 flex flex-col md:flex-row justify-between items-end gap-8 border-b border-[#a89068]/20 pb-8">
                <div>
                    <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#F5DEB3] mb-3">The UrbanNook Standard</h2>
                    <p className="text-4xl md:text-5xl font-serif text-white">The principles we live by.</p>
                </div>
                <p className="text-gray-400 max-w-sm text-sm md:text-right font-light">
                    When you shop with us, you are protected by these four pillars of excellence.
                </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {aboutValues.map((val, i) => (
                    <motion.div 
                        key={val.id} 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                        className="group p-8 md:p-10 rounded-[2rem] bg-[#f5f7f8] border border-transparent hover:border-[#a89068]/50 hover:shadow-[0_0_30px_rgba(168,144,104,0.15)] transition-all duration-500 cursor-default"
                    >
                        <div className="flex justify-between items-start mb-8">
                            <i className={`fa-solid ${val.icon} text-2xl text-[#a89068] group-hover:scale-110 transition-transform duration-500`}></i>
                            <span className="text-2xl font-serif text-[#2e443c]/10 font-bold">
                                {val.id}
                            </span>
                        </div>
                        <h3 className="text-lg font-serif text-[#2e443c] mb-3">
                            {val.title}
                        </h3>
                        <p className="text-sm text-gray-600 font-light leading-relaxed">
                            {val.desc}
                        </p>
                    </motion.div>
                ))}
            </div>
        </div>
      </section>
      
    </div>
  );
};

export default AboutPage;