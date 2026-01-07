import React, { useEffect } from 'react';
import Footer from '../component/layout/Footer';

const AboutPage = () => {
    useEffect(() => {
      window.scrollTo(0, 0);
    }, []);

  const teamMembers = [
    {
      id: 1,
      name: "Arjun Sharma",
      role: "Founder & CEO",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=300&auto=format&fit=crop"
    },
    {
      id: 2,
      name: "Priya Patel",
      role: "Head of Design",
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=300&auto=format&fit=crop"
    },
    {
      id: 3,
      name: "Rahul Kumar",
      role: "Operations Lead",
      image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=300&auto=format&fit=crop"
    }
  ];

  const values = [
    {
      id: "01",
      title: "Obsessive Quality",
      desc: "We don't just pick products; we test them for durability and touch.",
    },
    {
      id: "02",
      title: "Radical Sustainability",
      desc: "Eco-friendly isn't a buzzword. It's our baseline standard.",
    },
    {
      id: "03",
      title: "Design Democracy",
      desc: "Great aesthetics shouldn't be a luxury. We make it accessible.",
    },
    {
      id: "04",
      title: "Human Connection",
      desc: "Real support, easy returns, and a team that actually cares.",
    }
  ];

  return (
    <div className="bg-[#0a1a13] min-h-screen text-gray-300 font-sans relative selection:bg-emerald-500 selection:text-white">
      
      {/* --- 1. HERO SECTION (Fixed Layout) --- */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Background Glows */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
            {/* GRID LAYOUT: Left Text | Right Image */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center border-b border-white/10 pb-12">
                
                {/* LEFT: Text Content */}
                <div>
                    <span className="inline-block px-3 py-1 mb-6 text-[10px] font-bold tracking-[0.3em] text-emerald-400 uppercase bg-white/5 border border-white/10 rounded-full">
                        Est. 2023
                    </span>
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif text-white leading-[0.9] mb-8">
                        We curate the <br />
                        <span className="italic font-light text-emerald-500">unnoticed.</span>
                    </h1>
                    <p className="text-lg md:text-xl text-gray-400 font-light leading-relaxed">
                        UrbanNook exists to bridge the gap between "just functional" and "beautifully designed." We turn everyday objects into architectural statements.
                    </p>
                </div>

                {/* RIGHT: Visual Element (Fills the empty space) */}
                <div className="relative h-[400px] md:h-[500px] w-full rounded-[3rem] overflow-hidden border border-white/10 group">
                    <img 
                        src="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1200&auto=format&fit=crop" 
                        alt="Studio Atmosphere" 
                        className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-700 grayscale group-hover:grayscale-0"
                    />
                    {/* Gradient Overlay for Text Readability/Blending */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a1a13] via-transparent to-transparent"></div>
                    <div className="absolute bottom-8 left-8">
                        <p className="text-white font-serif text-2xl">The Studio</p>
                        <p className="text-emerald-500 text-xs uppercase tracking-widest">Gurgaon, India</p>
                    </div>
                </div>

            </div>
        </div>
      </section>

      {/* --- 2. THE MANIFESTO (Split Layout) --- */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* Image Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4 mt-8">
                    <img src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500&q=80" alt="Office" className="w-full aspect-[3/4] object-cover rounded-[2rem] opacity-80" />
                    <div className="bg-emerald-900/20 p-6 rounded-[2rem] border border-white/5">
                        <p className="text-3xl font-serif text-white">10K+</p>
                        <p className="text-[10px] uppercase tracking-widest text-emerald-400 mt-1">Happy Homes</p>
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5">
                        <p className="text-3xl font-serif text-white">500+</p>
                        <p className="text-[10px] uppercase tracking-widest text-emerald-400 mt-1">Curated Items</p>
                    </div>
                    <img src="https://images.unsplash.com/photo-1618220179428-22790b461013?w=500&q=80" alt="Detail" className="w-full aspect-[3/4] object-cover rounded-[2rem] opacity-80" />
                </div>
            </div>

            {/* Text Content */}
            <div className="lg:pl-12">
                <h2 className="text-3xl md:text-5xl font-serif text-white mb-8 leading-tight">
                    Beyond the <br/>
                    <span className="italic text-gray-500">Ordinary.</span>
                </h2>
                <div className="space-y-6 text-gray-400 leading-relaxed font-light">
                    <p>
                        UrbanNook was born from a frustration with the mundane. Why should a desk organizer be boring? Why can't a lamp be a sculpture?
                    </p>
                    <p>
                        Founded in 2023 by design enthusiasts, we started as a small experiment in New Delhi. We didn't just want to sell products; we wanted to sell a feeling—that specific joy of interacting with something well-made.
                    </p>
                    <p>
                        Today, we are a team of curators, creators, and obsessives, scouring the globe (and our own backyard) to find items that spark that joy.
                    </p>
                </div>
                <div className="mt-12">
                    {/* Signature Placeholder - or remove if no asset */}
                    <p className="font-serif italic text-2xl text-white/40">Arjun S.</p>
                </div>
            </div>
        </div>
      </section>

      {/* --- 3. CORE VALUES --- */}
      <section className="py-20 px-6 border-y border-white/5 bg-black/20">
        <div className="max-w-7xl mx-auto">
            <div className="mb-12">
                <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-500 mb-2">Our DNA</h2>
                <p className="text-3xl font-serif text-white">The principles we live by.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {values.map((val) => (
                    <div key={val.id} className="group p-8 rounded-[2rem] bg-white/5 hover:bg-white/10 border border-white/5 transition-all duration-300">
                        <span className="text-4xl font-serif text-white/10 group-hover:text-emerald-500/50 transition-colors">{val.id}</span>
                        <h3 className="text-xl font-bold text-white mt-4 mb-3">{val.title}</h3>
                        <p className="text-sm text-gray-400 leading-relaxed">{val.desc}</p>
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* --- 4. THE TEAM --- */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-serif text-white mb-4">The Curators</h2>
                <p className="text-gray-400">The minds shaping your space.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {teamMembers.map((member) => (
                    <div key={member.id} className="group relative">
                        <div className="aspect-[4/5] overflow-hidden rounded-[2rem] mb-6 grayscale hover:grayscale-0 transition-all duration-700 border border-white/10">
                            <img src={member.image} alt={member.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-serif text-white">{member.name}</h3>
                            <p className="text-xs font-bold uppercase tracking-widest text-emerald-500 mt-1">{member.role}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AboutPage;