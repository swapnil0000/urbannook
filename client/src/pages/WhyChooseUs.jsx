import React, { useRef, useEffect, useState } from "react";

// Background image
const desktopBgImage = "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=2600&auto=format&fit=crop";

const features = [
  {
    id: 1,
    title: "Design-Led Aesthetics",
    description: "Minimal, modern designs made to elevate everyday spaces and lifes.",
    bg: "#F3F4F6", 
    color: "#111827", 
    desktopWidth: '100%', 
    mobileWidth: '100%', 
    zIndex: 1,
    icon: "fa-solid fa-tree"
  },
  {
    id: 2,
    title: "Proudly Homegrown",
    description: "Conceptualized, 3D printed, and wired in our own workshop in India. We control every layer.",
    bg: "#D1D5DB", 
    color: "#111827", 
    desktopWidth: '80%', 
    mobileWidth: '100%', 
    zIndex: 2,
    icon: "fa-solid fa-volume-xmark"
  },
  {
    id: 3,
    title: "Fast Pan-India Delivery",
    description: "Reliable shipping across India, delivered to your doorstep.",
    bg: "#9CA3AF", 
    color: "#FFFFFF", 
    desktopWidth: '60%', 
    mobileWidth: '100%', 
    zIndex: 3,
    icon: "fa-solid fa-wifi"
  },
  {
    id: 4,
    title: "Customization Ready",
    description: " Personalize colors, finishes, or details to match your space and style.",
    bg: "#1F2937", 
    color: "#FFFFFF", 
    desktopWidth: '40%', 
    mobileWidth: '100%', 
    zIndex: 4,
    icon: "fa-solid fa-gem"
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
        className="sticky top-0 md:top-[5vh] mx-auto w-full md:w-[98%] max-w-[1600px] h-[100vh] md:h-[90vh] md:rounded-[40px] overflow-hidden shadow-2xl border-0 md:border border-white/20 bg-gray-900"
        style={{ 
          backgroundImage: `url(${desktopBgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/60 z-0"></div>

        {/* BACKGROUND CONTENT (TEXT)
           - Removed style={{ opacity: ..., transform: ... }} to keep it static and visible.
           - It sits at the top (pt-20/pt-32) and cards will slide in below it.
        */}
        <div className="absolute top-0 left-0 w-full z-0 pt-20 md:pt-32 px-6 flex flex-col items-center text-center">
      
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif text-white mb-6 tracking-tight leading-tight">
            Built Here, <span className="italic font-light text-gray-400">Styled Everywhere</span>
          </h2>
          
          {/* <p className="text-sm md:text-base lg:text-lg text-gray-300 max-w-lg font-light leading-relaxed">
            Scroll to explore the four pillars of our design philosophy.
          </p> */}
        </div>

        {/* THE CARDS CONTAINER */}
        <div className="absolute bottom-0 left-0 w-full h-full pointer-events-none z-10">
          {features.map((feature, index) => (
            <div
              key={feature.id}
              ref={addToCardRefs}
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0, 
                width: isMobile ? feature.mobileWidth : feature.desktopWidth, 
                // Height adjusted for mobile
                height: isMobile ? '45vh' : '50vh', 
                backgroundColor: feature.bg,
                color: feature.color,
                // Ensure card z-index is higher than background text (which is 0)
                zIndex: 10 + feature.zIndex,
                borderRadius: isMobile ? '24px 24px 0 0' : '30px 0 0 0', 
                boxShadow: '-10px -10px 40px rgba(0,0,0,0.15)',
                transform: 'translateY(100%)', 
                willChange: 'transform',
                pointerEvents: 'auto',
                overflow: 'hidden'
              }}
            >
              {/* DECORATIVE NUMBER */}
              <div 
                className="absolute bottom-[-10px] right-[-10px] font-serif font-bold opacity-[0.05] select-none pointer-events-none"
                style={{ fontSize: isMobile ? '120px' : '250px', lineHeight: 1 }}
              >
                {index + 1}
              </div>

              {/* CONTENT */}
              <div className="relative z-10 h-full p-6 md:p-10 lg:p-14 flex flex-col">
                
                <div className="flex items-start justify-between mb-4 md:mb-8 border-b border-current border-opacity-10 pb-4 md:pb-6">
                  <div className="flex items-center gap-3 md:gap-4">
                    <i className={`${feature.icon} text-lg md:text-xl opacity-70`}></i>
                    <h3 className="text-xl md:text-3xl font-serif tracking-tight font-medium">{feature.title}</h3>
                  </div>
                  {/* <span className="font-mono text-[10px] md:text-xs opacity-50 tracking-widest border border-current px-2 py-1 rounded-full">
                     0{index + 1}
                  </span> */}
                </div>

                <div className="max-w-xl">
                  <p className="text-sm md:text-lg font-light leading-relaxed opacity-90">
                    {feature.description}
                  </p>
                </div>

                {/* <div className="mt-auto pt-4 md:pt-8">
                  <div className="flex items-center gap-3 group cursor-pointer w-fit opacity-80 hover:opacity-100 transition-opacity">
                    <span className="text-[10px] md:text-xs uppercase tracking-[0.2em] font-bold">Read More</span>
                    <span className="h-[1px] w-8 bg-current group-hover:w-12 transition-all"></span>
                  </div>
                </div> */}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}