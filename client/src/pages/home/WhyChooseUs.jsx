import React, { useRef, useEffect, useState } from "react";

// Background image
const desktopBgImage = "/assets/chooseus.webp"

const features = [
  {
    id: 1,
    tag: "AESTHETICS",
    title: "Design-Led Aesthetics",
    description: "Minimal, modern designs made to elevate everyday spaces and lives.",
    bg: "#FAFAF9", 
    color: "#1C1917", 
    accent: "#D97706",
    desktopWidth: '100%',
    mobileWidth: '100%',
    zIndex: 1,
    icon: "fa-solid fa-pen-ruler"
  },
  {
    id: 2,
    tag: "CRAFTSMANSHIP",
    title: "Proudly Homegrown",
    description: "Conceptualized, 3D printed, and wired in our own workshop in India.",
    bg: "#E6DCC5", 
    color: "#1C1917", 
    accent: "#15803D", 
    desktopWidth: '80%',
    mobileWidth: '100%',
    zIndex: 2,
    icon: "fa-solid fa-layer-group"
  },
  {
    id: 3,
    tag: "LOGISTICS",
    title: "Fast Pan-India Delivery",
    description: "Reliable shipping across India, delivered to your doorstep.",
    bg: "#4A675B", 
    color: "#FFFFFF", 
    accent: "#F5DEB3", 
    desktopWidth: '60%',
    mobileWidth: '100%',
    zIndex: 3,
    icon: "fa-solid fa-truck-fast"
  },
  {
    id: 4,
    tag: "PERSONALIZATION",
    title: "Customization Ready",
    description: "Personalize colors, finishes, or details to match your space.",
    bg: "#1a2822", 
    color: "#FFFFFF", 
    accent: "#F5DEB3", 
    desktopWidth: '35%',
    mobileWidth: '100%',
    zIndex: 4,
    icon: "fa-solid fa-palette"
  },
];

export default function WhyChooseUs() {
  const containerRef = useRef(null);
  const cardRefs = useRef([]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const addToCardRefs = (el) => {
    if (el && !cardRefs.current.includes(el)) {
      cardRefs.current.push(el);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      const totalDist = rect.height - windowHeight;
      let progress = -rect.top / totalDist;
      progress = Math.max(0, Math.min(1, progress));

      const calculateCardY = (start, end) => {
        const p = (progress - start) / (end - start);
        const clamped = Math.max(0, Math.min(1, p));
        return (1 - clamped) * 100;
      };

      const y1 = calculateCardY(0, 0.25);
      const y2 = calculateCardY(0.25, 0.50);
      const y3 = calculateCardY(0.50, 0.75);
      const y4 = calculateCardY(0.75, 1.0);

      if (cardRefs.current[0]) cardRefs.current[0].style.transform = `translateY(${y1}%)`;
      if (cardRefs.current[1]) cardRefs.current[1].style.transform = `translateY(${y2}%)`;
      if (cardRefs.current[2]) cardRefs.current[2].style.transform = `translateY(${y3}%)`;
      if (cardRefs.current[3]) cardRefs.current[3].style.transform = `translateY(${y4}%)`;
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <section
  ref={containerRef}
  className="relative w-full"
  style={{ height: '300vh' }}
>
  <div
    className="sticky top-0 md:top-[5vh] mx-auto w-[97%] h-[100vh] md:h-[98vh] rounded-[30px] md:rounded-[40px] overflow-hidden shadow-2xl border-0 md:border border-white/10"
    style={{
      backgroundImage: `url(${desktopBgImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }}
  >
    {/* Gradient Overlay */}
    <div className="absolute inset-0 bg-gradient-to-b from-stone-900/60 to-[#1a2822]/90 z-0"></div>

    {/* --- TOP CONTENT CONTAINER --- */}
    <div className="absolute top-0 left-0 w-full z-20 px-6 flex flex-col 
      items-start text-left pt-20
      md:pt-28 md:items-center md:text-center pointer-events-none"
    >
      {/* 1. Header Section */}
      <div className="flex items-center gap-3 mb-4 md:mb-6">
         <span className="w-8 h-[1px] bg-[#F5DEB3]"></span>
         <span className="text-[#F5DEB3] text-[10px] md:text-xs font-bold uppercase tracking-[0.3em]">
           The Urban Nook Difference
         </span>
         <span className="w-8 h-[1px] bg-[#F5DEB3] hidden md:block"></span>
      </div>

      <h2 className="text-4xl md:text-6xl lg:text-7xl font-serif text-white mb-4 tracking-tight leading-[1.1]">
        Built Locally, <br className="md:hidden" />
        <span className="relative inline-block group">
          <span className="italic font-light text-[#F5DEB3] relative z-10">Designed Globally</span>
          <div className="absolute -bottom-1 left-0 w-full h-[2px] bg-[#F5DEB3]/50 rounded-full"></div>
        </span>
      </h2>

      <p className="text-stone-300 text-sm md:text-lg font-light max-w-md leading-relaxed md:mx-auto mb-8">
         Experience the perfect blend of modern technology and artisanal craftsmanship.
      </p>

      {/* 2. Stats / Trust Badges */}
      <div className="w-full max-w-lg md:mx-auto grid grid-cols-2 gap-6 border-t border-white/10 pt-6">
          <div className="flex flex-col items-start md:items-center">
              <span className="text-2xl md:text-3xl font-serif text-white mb-1">50+</span>
              <span className="text-[10px] text-[#F5DEB3] uppercase tracking-widest font-bold">Unique Styles</span>
          </div>
          <div className="flex flex-col items-start md:items-center">
              <span className="text-2xl md:text-3xl font-serif text-white mb-1">100%</span>
              <span className="text-[10px] text-[#F5DEB3] uppercase tracking-widest font-bold">Made in India</span>
          </div>
      </div>

      {/* 3. Scroll Indicator */}
      <div className="mt-12 md:mt-16 flex flex-col items-center gap-2 animate-bounce opacity-50">
         <span className="text-[9px] text-white uppercase tracking-widest">Scroll</span>
         <i className="fa-solid fa-chevron-down text-white text-xs"></i>
      </div>
    </div>

    {/* --- CARDS CONTAINER --- */}
    <div className="absolute bottom-0 left-0 w-full h-full pointer-events-none z-30">
      {features.map((feature, index) => (
        <div
          key={feature.id}
          ref={addToCardRefs}
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: isMobile ? feature.mobileWidth : feature.desktopWidth,
            height: isMobile ? '35vh' : '45vh',
            backgroundColor: feature.bg,
            color: feature.color,
            zIndex: 10 + feature.zIndex,
            /* FIX: Mobile par rounding hamesha 32px rahegi */
            borderRadius: isMobile ? '32px 32px 0 0' : '40px 0 0 0',
            boxShadow: '-10px -10px 50px rgba(0,0,0,0.2)',
            transform: 'translateY(100%)',
            willChange: 'transform',
            pointerEvents: 'auto',
            overflow: 'hidden'
          }}
        >
          {/* Watermark Number */}
          <div
            className="absolute top-[-20px] left-[-10px] font-serif font-bold opacity-[0.04] select-none pointer-events-none leading-none"
            style={{ fontSize: '200px' }}
          >
            0{index + 1}
          </div>

          {/* Content */}
          <div className="relative z-10 h-full p-6 md:p-12 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2">
                 <div className="w-10 h-10 rounded-full flex items-center justify-center border border-current border-opacity-10">
                    <i className={`${feature.icon} text-lg`} ></i>
                 </div>
                 <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest opacity-60 border border-current border-opacity-20 px-3 py-1 rounded-full">
                   {feature.tag}
                 </span>
              </div>
              <h3 className="text-xl md:text-2xl font-serif font-medium leading-tight">
                {feature.title}
              </h3>
            </div>

            <div className="flex items-end justify-between gap-4 pt-4 border-t border-black border-opacity-5">
               <p className="text-xs md:text-sm font-light leading-relaxed opacity-80 max-w-[70%]">
                  {feature.description}
               </p>
               {/* <div className="flex w-10 h-10 rounded-full border border-current border-opacity-20 items-center justify-center opacity-70">
                  <i className="fa-solid fa-arrow-right -rotate-45 text-xs"></i>
               </div> */}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
</section>
  );
}