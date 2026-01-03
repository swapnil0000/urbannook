import React, { useRef, useEffect, useState } from "react";

// Background: A high-quality, moody architectural dark texture
const desktopBgImage = "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=2600&auto=format&fit=crop";

const features = [
  {
    id: 1,
    title: "Sustainability",
    description: "Sourced from 100% recycled materials. We prioritize the planet without compromising on luxury.",
    bg: "#F3F4F6", // Very Light Grey (Almost White)
    color: "#111827", // Almost Black Text
    width: '100%', 
    zIndex: 1,
    icon: "fa-solid fa-tree"
  },
  {
    id: 2,
    title: "Silence",
    description: "Advanced sound-dampening means you'll never hear it working, but you will feel the difference.",
    bg: "#D1D5DB", // Cool Grey
    color: "#111827", // Almost Black Text
    width: '80%', 
    zIndex: 2,
    icon: "fa-solid fa-volume-xmark"
  },
  {
    id: 3,
    title: "Intelligence",
    description: "Seamless ecosystem integration. Control lighting and ambience from a single intuitive interface.",
    bg: "#9CA3AF", // Medium Grey
    color: "#FFFFFF", // White Text
    width: '60%', 
    zIndex: 3,
    icon: "fa-solid fa-wifi"
  },
  {
    id: 4,
    title: "Timelessness",
    description: "Sculpted with clean lines and premium finishes. Designed to look modern today and classic tomorrow.",
    bg: "#1F2937", // Dark Charcoal
    color: "#FFFFFF", // White Text
    width: '40%', 
    zIndex: 4,
    icon: "fa-solid fa-gem"
  },
];

export default function WhyChooseUs() {
  const containerRef = useRef(null);
  const cardRefs = useRef([]);
  // State to track scroll progress for fading out the background text
  const [scrollProgress, setScrollProgress] = useState(0);

  const addToCardRefs = (el) => {
    if (el && !cardRefs.current.includes(el)) {
      cardRefs.current.push(el);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;

      const isMobile = window.innerWidth < 768;
      
      if (isMobile) {
        cardRefs.current.forEach((card) => {
          if (card) card.style.transform = 'translateY(0vh)';
        });
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      const totalDist = rect.height - windowHeight;
      let progress = -rect.top / totalDist;
      progress = Math.max(0, Math.min(1, progress));

      // Update state for the fade-out effect
      setScrollProgress(progress);

      const calculateCardY = (start, end) => {
        const p = (progress - start) / (end - start);
        const clamped = Math.max(0, Math.min(1, p));
        return (1 - clamped) * 100;
      };

      // Staggered timing:
      // 0.00 -> 0.25 (Card 1)
      // 0.25 -> 0.50 (Card 2)
      // 0.50 -> 0.75 (Card 3)
      // 0.75 -> 1.00 (Card 4)
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
    window.addEventListener('resize', handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  return (
    <>
      {/* DESKTOP VERSION */}
      <section 
        ref={containerRef} 
        className="hidden md:block relative" // Light gray page background
        style={{ height: '300vh' }}
      >
        <div 
          className="sticky top-[5vh] mx-auto w-[98%] max-w-[1600px] h-[90vh] rounded-[40px] overflow-hidden shadow-2xl border border-white/20"
          style={{ 
            backgroundImage: `url(${desktopBgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundColor: '#1a1a1a' // Fallback color
          }}
        >
          {/* Dark Overlay for text readability */}
          <div className="absolute inset-0 bg-black/60 z-0"></div>

          {/* BACKGROUND CONTENT - FADES OUT ON SCROLL */}
          <div 
            className="relative z-10 w-full pt-32 px-4 flex flex-col items-center text-center transition-opacity duration-300 ease-out"
            style={{ 
              // This is the magic fix: It fades out immediately as you scroll (multiplied by 5 for speed)
              opacity: Math.max(0, 1 - scrollProgress * 5),
              // Also slide it up slightly so it doesn't get hit by cards
              transform: `translateY(-${scrollProgress * 100}px)`
            }}
          >
            <div className="inline-block px-4 py-1 rounded-full border border-white/30 bg-white/5 backdrop-blur-md mb-6">
              <span className="text-xs font-semibold tracking-[0.2em] text-gray-200 uppercase">Engineering</span>
            </div>
            
            <h2 className="text-5xl lg:text-6xl font-serif text-white mb-6 tracking-tight leading-tight">
              Defined by <span className="italic font-light text-gray-400">Details</span>
            </h2>
            
            <p className="text-base lg:text-lg text-gray-300 max-w-lg font-light leading-relaxed">
              Scroll to explore the four pillars of our design philosophy.
            </p>
          </div>

          {/* THE CARDS */}
          <div className="absolute bottom-0 left-0 w-full h-full pointer-events-none">
            {features.map((feature, index) => (
              <div
                key={feature.id}
                ref={addToCardRefs}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0, 
                  width: feature.width, 
                  height: '50vh', // Slightly reduced height so it doesn't crowd top too much
                  backgroundColor: feature.bg,
                  color: feature.color,
                  zIndex: feature.zIndex,
                  borderRadius: '30px 0 0 0',
                  boxShadow: '-10px -10px 40px rgba(0,0,0,0.15)',
                  transform: 'translateY(100%)', 
                  willChange: 'transform',
                  pointerEvents: 'auto',
                  overflow: 'hidden'
                }}
              >
                {/* DECORATIVE BACKGROUND NUMBER - Smaller and subtler */}
                <div 
                  className="absolute bottom-[-10px] right-[-10px] font-serif font-bold opacity-[0.05] select-none pointer-events-none"
                  style={{ fontSize: '250px', lineHeight: 1 }}
                >
                  {index + 1}
                </div>

                {/* CARD CONTENT - Padding and Layout */}
                <div className="relative z-10 h-full p-10 lg:p-14 flex flex-col">
                  
                  {/* Top: Header */}
                  <div className="flex items-start justify-between mb-8 border-b border-current border-opacity-10 pb-6">
                    <div className="flex items-center gap-4">
                      <i className={`${feature.icon} text-xl opacity-70`}></i>
                      {/* Fixed: Smaller Font Size (3xl instead of 5xl) */}
                      <h3 className="text-3xl font-serif tracking-tight font-medium">{feature.title}</h3>
                    </div>
                    {/* Badge: Smaller and cleaner */}
                    <span className="font-mono text-xs opacity-50 tracking-widest border border-current px-2 py-1 rounded-full">
                       0{index + 1}
                    </span>
                  </div>

                  {/* Middle: Description */}
                  <div className="max-w-xl">
                    {/* Fixed: Smaller Body Text (lg instead of 3xl) */}
                    <p className="text-lg font-light leading-relaxed opacity-90">
                      {feature.description}
                    </p>
                  </div>

                  {/* Bottom: CTA (Pushed to bottom) */}
                  <div className="mt-auto pt-8">
                    <div className="flex items-center gap-3 group cursor-pointer w-fit opacity-80 hover:opacity-100 transition-opacity">
                      <span className="text-xs uppercase tracking-[0.2em] font-bold">Read More</span>
                      <span className="h-[1px] w-8 bg-current group-hover:w-12 transition-all"></span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MOBILE VERSION - Matching style */}
      <section className="md:hidden py-8 px-4">
        <div className="rounded-[30px] overflow-hidden bg-[#1F2937] text-white shadow-xl">
          <div className="relative h-64">
             <img src={desktopBgImage} className="w-full h-full object-cover opacity-60" alt="bg"/>
             <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#1F2937]"></div>
             <div className="absolute bottom-6 left-6 right-6 text-center">
               <h2 className="text-3xl font-serif mb-2">Defined by <span className="italic text-gray-400">Details</span></h2>
             </div>
          </div>
          
          <div className="px-4 pb-8 space-y-3 bg-[#1F2937]">
            {features.map((feature, index) => (
              <div
                key={feature.id}
                className="p-6 rounded-2xl"
                style={{
                  backgroundColor: feature.bg,
                  color: feature.color,
                }}
              >
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-3">
                    <i className={`${feature.icon} text-lg opacity-70`}></i>
                    <h3 className="text-xl font-bold">{feature.title}</h3>
                  </div>
                  <span className="text-xs font-mono opacity-50">0{index + 1}</span>
                </div>
                <p className="text-sm opacity-90 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}