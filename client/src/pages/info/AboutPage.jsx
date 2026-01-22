import React, { useEffect, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Footer from '../../component/layout/Footer';
import NewHeader from '../../component/layout/NewHeader';

const aboutValues = [
    {
      id: "01",
      title: "Obsessive Quality",
      desc: "We don't just pick products; we test them for durability, texture, and soul.",
    },
    {
      id: "02",
      title: "Radical Sustainability",
      desc: "Eco-friendly isn't a buzzword. It's our baseline standard for every piece.",
    },
    {
      id: "03",
      title: "Design Democracy",
      desc: "Great aesthetics shouldn't be a luxury. We make beauty accessible.",
    },
    {
      id: "04",
      title: "Human Connection",
      desc: "Real support, easy returns, and a team that actually cares about your home.",
    }
];

const AboutPage = () => {
    useEffect(() => {
      window.scrollTo(0, 0);
    }, []);

    const targetRef = useRef(null);
    const { scrollYProgress } = useScroll({
      target: targetRef,
      offset: ["start end", "end start"]
    });

    const y = useTransform(scrollYProgress, [0, 1], [100, -100]);

    // Animation Variants
    const fadeIn = {
      hidden: { opacity: 0, y: 30 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
    };

    const stagger = {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { staggerChildren: 0.2 } }
    };

  return (
    // BASE: Deep Forest Green
    <div className="bg-[#0F261F] min-h-screen text-[#E2E8F0] font-sans relative selection:bg-[#F5DEB3] selection:text-[#0F261F] overflow-x-hidden">
      <NewHeader />
      
      {/* Texture Overlay */}
      <div className="fixed inset-0 opacity-[0.04] pointer-events-none z-0 mix-blend-overlay" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
      </div>

      {/* --- 1. HERO SECTION --- */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden min-h-[90vh] flex items-center">
        {/* Abstract Background Element */}
        <div className="absolute top-0 right-[-10%] w-[800px] h-[800px] bg-gradient-to-b from-[#1A3C32] to-transparent rounded-full blur-[120px] pointer-events-none opacity-50"></div>
        
        <div className="max-w-7xl mx-auto relative z-10 w-full">
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={stagger}
              className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center"
            >
                
                {/* LEFT: Text Content */}
                <div>
                    <motion.div variants={fadeIn} className="flex items-center gap-4 mb-8">
                        <span className="h-[1px] w-12 bg-[#F5DEB3]/50"></span>
                        <span className="text-xs font-bold tracking-[0.3em] text-[#F5DEB3] uppercase">
                            Est. 2023
                        </span>
                    </motion.div>
                    
                    <motion.h1 variants={fadeIn} className="text-5xl md:text-7xl lg:text-8xl font-serif text-white leading-[0.95] mb-8">
                        We curate the <br />
                        <span className="italic text-[#F5DEB3]  font-light opacity-90">unnoticed.</span>
                    </motion.h1>
                    
                    <motion.p variants={fadeIn} className="text-lg md:text-xl text-green-100/70 font-light leading-relaxed max-w-lg">
                        UrbanNook exists to bridge the gap between "just functional" and "beautifully designed." We turn everyday objects into architectural statements.
                    </motion.p>
                </div>

                {/* RIGHT: Visual Element (Parallax Effect) */}
                <div className="relative h-[500px] md:h-[600px] w-full rounded-t-full rounded-b-[1000px] overflow-hidden border border-[#F5DEB3]/10">
                    <motion.div style={{ y }} className="w-full h-[120%] relative -top-[10%]">
                        <img 
                            src="https://images.unsplash.com/photo-1616486338812-3dadae4b4f9d?q=80&w=1200&auto=format&fit=crop" 
                            alt="Studio Atmosphere" 
                            className="w-full h-full object-cover opacity-80 grayscale hover:grayscale-0 transition-all duration-[1.5s]"
                        />
                    </motion.div>
                    
                    {/* Overlay Text */}
                    <div className="absolute bottom-12 left-0 right-0 text-center z-10">
                        <div className="inline-block bg-[#0F261F]/80 backdrop-blur-md border border-[#F5DEB3]/20 px-8 py-4 rounded-full">
                            <p className="text-[#F5DEB3] font-serif text-xl italic">The Studio</p>
                        </div>
                    </div>
                </div>

            </motion.div>
        </div>
      </section>

      {/* --- 2. INFINITE SCROLL MARQUEE (New Enhancement) --- */}
      <section className="py-12 border-y border-[#F5DEB3]/10 bg-[#0a1f18] overflow-hidden relative">
        <div className="flex whitespace-nowrap animate-marquee">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center mx-8">
                    <span className="text-6xl md:text-8xl font-serif text-transparent stroke-text opacity-30 mx-8">
                        THOUGHTFUL DESIGN
                    </span>
                    <span className="text-[#F5DEB3] text-4xl">•</span>
                    <span className="text-6xl md:text-8xl font-serif text-[#F5DEB3] mx-8">
                        TIMELESS QUALITY
                    </span>
                    <span className="text-[#F5DEB3] text-4xl">•</span>
                </div>
            ))}
        </div>
        <style jsx>{`
            .stroke-text { -webkit-text-stroke: 1px #F5DEB3; }
            @keyframes marquee {
                0% { transform: translateX(0); }
                100% { transform: translateX(-50%); }
            }
            .animate-marquee { animation: marquee 20s linear infinite; }
        `}</style>
      </section>

      {/* --- 3. THE MANIFESTO (Asymmetrical Layout) --- */}
      <section ref={targetRef} className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
            
            {/* LEFT: Stats & Images Grid */}
            <div className="lg:col-span-5 grid grid-cols-2 gap-6 relative">
                 {/* Decorative Circle */}
                 <div className="absolute -top-10 -left-10 w-32 h-32 border border-[#F5DEB3]/20 rounded-full animate-spin-slow"></div>

                <div className="space-y-6 pt-12">
                    <div className="bg-[#153229] p-8 rounded-[2rem] border border-[#F5DEB3]/10 hover:border-[#F5DEB3]/30 transition-colors">
                        <p className="text-4xl font-serif text-[#F5DEB3]">10K+</p>
                        <p className="text-[10px] uppercase tracking-widest text-green-100/50 mt-2">Happy Homes</p>
                    </div>
                    <img 
                        src="https://images.unsplash.com/photo-1599692996160-c3d32c510b5d?w=500&q=80" 
                        alt="Texture" 
                        className="w-full aspect-[4/5] object-cover rounded-[2rem] opacity-70 hover:opacity-100 transition-opacity duration-700 grayscale" 
                    />
                </div>
                <div className="space-y-6">
                    <img 
                        src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500&q=80" 
                        alt="Office" 
                        className="w-full aspect-[4/5] object-cover rounded-[2rem] opacity-70 hover:opacity-100 transition-opacity duration-700 grayscale" 
                    />
                    <div className="bg-[#F5DEB3] p-8 rounded-[2rem] text-[#0F261F]">
                        <p className="text-4xl font-serif">500+</p>
                        <p className="text-[10px] uppercase tracking-widest opacity-70 mt-2">Curated Items</p>
                    </div>
                </div>
            </div>

            {/* RIGHT: Text Content */}
            <div className="lg:col-span-7 lg:pl-12 lg:sticky lg:top-32">
                <h2 className="text-4xl md:text-6xl font-serif text-[#F5DEB3] mb-10 leading-[1.1]">
                    Beyond the <br/>
                    <span className="italic text-white ">Ordinary.</span>
                </h2>
                
                <div className="space-y-8 text-lg text-green-100/70 font-light leading-relaxed">
                    <p className="border-l-2 border-[#F5DEB3]/20 pl-6">
                        UrbanNook was born from a frustration with the mundane. Why should a desk organizer be boring? Why can't a lamp be a sculpture?
                    </p>
                    <p>
                        Founded in 2023 by design enthusiasts, we started as a small experiment in New Delhi. We didn't just want to sell products; we wanted to sell a feeling—that specific joy of interacting with something well-made.
                    </p>
                    <p>
                        Today, we are a team of curators, creators, and obsessives, scouring the globe (and our own backyard) to find items that spark that joy.
                    </p>
                </div>

                <div className="mt-16 flex items-center gap-6">
                    <div className="w-16 h-16 rounded-full overflow-hidden border border-[#F5DEB3]/30">
                        <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80" className="w-full h-full object-cover" alt="Founder" />
                    </div>
                    <div>
                        <p className="font-serif italic text-2xl text-[#F5DEB3]">Arjun S.</p>
                        <p className="text-xs uppercase tracking-widest text-green-100/40">Founder, UrbanNook</p>
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* --- 4. CORE VALUES (Cards) --- */}
      <section className="py-24 px-6 bg-[#0a1f18] relative z-10">
        <div className="max-w-7xl mx-auto">
            <div className="mb-16 flex flex-col md:flex-row justify-between items-end gap-6 border-b border-[#F5DEB3]/10 pb-8">
                <div>
                    <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#F5DEB3] mb-2">Our DNA</h2>
                    <p className="text-4xl md:text-5xl font-serif text-white">The principles we live by.</p>
                </div>
                <p className="text-green-100/50 max-w-sm text-sm text-right md:text-left">
                    Every decision we make is guided by these four pillars of excellence.
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
                        className="group p-10 rounded-[2rem] bg-[#153229] hover:bg-[#F5DEB3] transition-colors duration-500 cursor-default border border-white/5"
                    >
                        <span className="text-5xl font-serif text-[#F5DEB3]/20 group-hover:text-[#0F261F]/20 transition-colors duration-500">
                            {val.id}
                        </span>
                        <h3 className="text-xl font-bold text-[#F5DEB3] mt-6 mb-4 group-hover:text-[#0F261F] transition-colors duration-500">
                            {val.title}
                        </h3>
                        <p className="text-sm text-green-100/60 leading-relaxed group-hover:text-[#0F261F]/70 transition-colors duration-500">
                            {val.desc}
                        </p>
                    </motion.div>
                ))}
            </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default AboutPage;