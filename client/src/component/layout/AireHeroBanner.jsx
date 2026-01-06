import React from 'react';

const AireHeroBanner = () => {
  return (
    <section className="relative min-h-[97vh] lg:h-[calc(100vh-2rem)] lg:max-h-[900px] mx-2 my-2 md:mx-4 md:my-4 rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl flex items-center group">
      
      {/* --- BACKGROUND IMAGE LAYER --- */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/assets/hero.png" 
          onError={(e) => {
            e.target.onerror = null; 
            // Fallback to a bright, airy interior shot
            e.target.src="https://images.unsplash.com/photo-1631679706909-1844bbd07221?q=80&w=2500&auto=format&fit=crop";
          }}
          alt="Hero Background" 
          className="w-full h-full object-cover transition-transform duration-[20s] ease-in-out group-hover:scale-105"
        />
        
        {/* --- WHITE GRADIENT OVERLAY (The "Scrim") --- 
            Fades from Solid White (Left) -> Transparent (Right)
        */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent sm:via-black/20"></div>
        <div className="absolute inset-0 bg-black/20"></div> {/* General subtle darken */}
      </div>

      {/* --- CONTENT LAYER --- */}
      <div className="relative z-10 w-full px-6 md:px-12 lg:px-20 py-12">
        <div className="w-full max-w-7xl mx-auto">
          
          {/* LEFT SIDE CONTENT CONTAINER */}
          <div className="max-w-2xl space-y-8 flex flex-col items-center sm:items-start text-center sm:text-left">
            
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-sm w-fit">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-bold tracking-widest uppercase text-white">New Collection </span>
            </div>

            {/* Heading */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl xl:text-7xl font-serif text-white leading-[1.05] drop-shadow-lg mb-5">
              Make Every <br />
              Corner <span className="italic font-light text-stone-300">Count.</span>
            </h1>
            
           <p className="fade-in-up animate-delay-200 text-lg md:text-xl text-stone-500 font-light max-w-lg mt-4">
  Turn a house into your <span className="font-serif italic text-stone-800 text-2xl ml-1">Urban Nook.</span>
</p>
            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto pt-4">
              <button className="w-full sm:w-auto bg-white text-stone-900 px-8 py-4 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-stone-200 hover:scale-105 hover:shadow-lg transition-all duration-300">
                Shop Collection
              </button>
              
              <button className="w-full sm:w-auto px-8 py-4 rounded-full font-bold text-white border border-white/30 hover:bg-white/10 transition-all flex items-center justify-center gap-3 text-xs uppercase tracking-widest backdrop-blur-sm">
                <span className="w-6 h-6 rounded-full border border-white flex items-center justify-center">
                  <i className="fa-solid fa-play text-[8px] ml-0.5"></i>
                </span>
                Watch Film
              </button>
            </div>

            {/* Stats / Trust */}
            <div className="pt-8 flex items-center justify-center sm:justify-start gap-12 w-full border-t border-white/10 mt-4">
                <div className="text-center sm:text-left">
                    <p className="text-3xl font-serif italic text-white">50k+</p>
                    <p className="text-[10px] text-stone-300 uppercase tracking-widest font-bold mt-1">Happy Users</p>
                </div>
                <div className="w-px h-10 bg-white/20"></div>
                <div className="text-center sm:text-left">
                    <p className="text-3xl font-serif italic text-white">100%</p>
                    <p className="text-[10px] text-stone-300 uppercase tracking-widest font-bold mt-1">Sustainable</p>
                </div>
            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
};

export default AireHeroBanner;



// import React from 'react';

// const AireHeroBanner = () => {
//   return (
//     <section className="relative min-h-[97vh] lg:h-[calc(100vh-2rem)] lg:max-h-[900px] mx-2 my-2 md:mx-4 md:my-4 rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl flex items-center group bg-white">
      
//       {/* --- CUSTOM ANIMATION STYLES --- */}
//       <style>{`
//         @keyframes fadeInUp {
//           from { opacity: 0; transform: translateY(20px); }
//           to { opacity: 1; transform: translateY(0); }
//         }
//         .animate-delay-100 { animation-delay: 100ms; }
//         .animate-delay-200 { animation-delay: 200ms; }
//         .animate-delay-300 { animation-delay: 300ms; }
//         .animate-delay-500 { animation-delay: 500ms; }
        
//         .fade-in-up {
//           animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
//           opacity: 0; /* Start hidden */
//         }
//       `}</style>

//       {/* --- BACKGROUND IMAGE LAYER --- */}
//       <div className="absolute inset-0 z-0">
//         <picture>
//           {/* Desktop Image (min-width: 768px) */}
//           <source 
//             media="(min-width: 768px)" 
//             srcSet="/assets/webhero.png" 
//           />
//           {/* Mobile Image (default) */}
//           <img 
//             src="/assets/mobilehero.jpeg" 
//             onError={(e) => {
//               e.target.onerror = null; 
//               // Fallback to a bright, airy interior shot
//               e.target.src="https://images.unsplash.com/photo-1631679706909-1844bbd07221?q=80&w=2500&auto=format&fit=crop";
//             }}
//             alt="Hero Background" 
//             className="w-full h-full object-cover transition-transform duration-[20s] ease-in-out group-hover:scale-105"
//           />
//         </picture>
        
//         {/* --- OPTIONAL: DARKENING OVERLAY FOR MOBILE TEXT READABILITY --- 
//             Mobile backgrounds often need a bit more contrast if text is white, 
//             or a white wash if text is black. Adjust opacity as needed.
//         */}
//         <div className="absolute inset-0 bg-white/30 md:bg-transparent"></div>
        
//         {/* --- WHITE GRADIENT OVERLAY (The "Scrim") --- 
//             Fades from Solid White (Left) -> Transparent (Right)
//             Adjusted for mobile to be bottom-up or full wash if needed
//         */}
//         <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-white/40 to-transparent md:bg-gradient-to-r md:from-white/90 md:via-white/20 md:to-transparent"></div>
//       </div>

//       {/* --- CONTENT LAYER --- */}
//       <div className="relative z-10 w-full px-6 md:px-12 lg:px-20 py-12 md:py-0 mt-auto md:mt-0 mb-12 md:mb-0">
//         <div className="w-full max-w-7xl mx-auto">
          
//           {/* LEFT SIDE CONTENT CONTAINER */}
//           <div className="max-w-2xl space-y-6 md:space-y-8 flex flex-col items-center md:items-start text-center md:text-left">
            
//             {/* Badge */}
//             <div className="fade-in-up inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-md border border-stone-200 shadow-sm w-fit">
//               <span className="relative flex h-2 w-2">
//                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
//                 <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
//               </span>
//               <span className="text-[10px] font-bold tracking-widest uppercase text-stone-600">New Collection 2024</span>
//             </div>

//             {/* Heading */}
//             <h1 className="fade-in-up animate-delay-100 text-4xl sm:text-5xl md:text-6xl xl:text-7xl font-serif text-stone-900 leading-[1.1] md:leading-[1.05]">
//               Make Every <br />
//               Corner <span className="italic relative inline-block">
//                 Count.
//                 {/* Subtle underline SVG */}
//                 <svg className="absolute w-full h-2 md:h-3 bottom-0 left-0 text-emerald-200/60 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" /></svg>
//               </span>
//             </h1>
            
//             <p className="fade-in-up animate-delay-200 text-base md:text-lg text-stone-600 md:text-stone-500 leading-relaxed font-medium max-w-lg">
//               Turn a house into your Urban Nook. Discover furniture that blends sustainable design with everyday comfort.
//             </p>

//             {/* CTAs */}
//             <div className="fade-in-up animate-delay-300 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto pt-2 md:pt-4">
//               <button className="w-full sm:w-auto bg-stone-900 text-white px-8 py-4 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-stone-800 hover:scale-105 hover:shadow-xl transition-all duration-300">
//                 Shop Collection
//               </button>
              
//               <button className="w-full sm:w-auto px-8 py-4 rounded-full font-bold text-stone-800 border border-stone-300/80 bg-white/40 backdrop-blur-sm hover:bg-white hover:border-stone-400 transition-all flex items-center justify-center gap-3 text-xs uppercase tracking-widest group/btn">
//                 <span className="w-6 h-6 rounded-full border border-stone-800 flex items-center justify-center group-hover/btn:bg-stone-900 group-hover/btn:border-stone-900 transition-colors">
//                   <i className="fa-solid fa-play text-[8px] ml-0.5 group-hover/btn:text-white text-stone-900"></i>
//                 </span>
//                 Watch Film
//               </button>
//             </div>

//             {/* Stats / Trust */}
//             <div className="fade-in-up animate-delay-500 pt-6 md:pt-8 flex items-center justify-center md:justify-start gap-8 md:gap-12 w-full border-t border-stone-300/30 mt-4 md:mt-8">
//                 <div className="text-center md:text-left">
//                     <p className="text-2xl md:text-3xl font-serif italic text-stone-900">25k+</p>
//                     <p className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mt-1">Happy Users</p>
//                 </div>
//                 <div className="w-px h-8 md:h-10 bg-stone-300/50"></div>
//                 <div className="text-center md:text-left">
//                     <p className="text-2xl md:text-3xl font-serif italic text-stone-900">100%</p>
//                     <p className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mt-1">Sustainable</p>
//                 </div>
//             </div>
//           </div>
          
//         </div>
//       </div>
//     </section>
//   );
// };

// export default AireHeroBanner;


// import React from 'react';

// const AireHeroBanner = () => {
//   return (
//     <section className="relative min-h-[97vh] lg:h-[calc(100vh-2rem)] lg:max-h-[900px] mx-2 my-2 md:mx-4 md:my-4 rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl flex items-center group bg-white">
      
//       {/* --- CUSTOM ANIMATION STYLES --- */}
//       <style>{`
//         @keyframes fadeInUp {
//           from { opacity: 0; transform: translateY(20px); }
//           to { opacity: 1; transform: translateY(0); }
//         }
//         .animate-delay-100 { animation-delay: 100ms; }
//         .animate-delay-200 { animation-delay: 200ms; }
//         .animate-delay-300 { animation-delay: 300ms; }
//         .animate-delay-500 { animation-delay: 500ms; }
        
//         .fade-in-up {
//           animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
//           opacity: 0; /* Start hidden */
//         }
//       `}</style>

//       {/* --- BACKGROUND VIDEO LAYER --- */}
//       <div className="absolute inset-0 z-0">
//         <video 
//           autoPlay 
//           loop 
//           muted 
//           playsInline
//           className="w-full h-full object-cover transition-transform duration-[20s] ease-in-out group-hover:scale-105"
//         >
//           {/* REPLACE THIS PATH WITH YOUR ACTUAL VIDEO FILE */}
//           <source src="/assets/hero.mp4" type="video/mp4" />
//           Your browser does not support the video tag.
//         </video>
        
//         {/* --- WHITE GRADIENT OVERLAY (The "Scrim") --- 
//             This is key: It creates a solid white background behind the text (left)
//             and fades to transparent (right) to show the video.
//         */}
//         <div className="absolute inset-0  sm:via-white/40"></div>
//       </div>

//       {/* --- CONTENT LAYER --- */}
//       <div className="relative z-10 w-full px-6 md:px-12 lg:px-20 py-12">
//         <div className="w-full max-w-7xl mx-auto">
          
//           {/* LEFT SIDE CONTENT CONTAINER */}
//           <div className="max-w-2xl space-y-8 flex flex-col items-center sm:items-start text-center sm:text-left">
            
//             {/* Badge */}
//             <div className="fade-in-up inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-stone-200 shadow-sm w-fit">
//               <span className="relative flex h-2 w-2">
//                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
//                 <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
//               </span>
//               <span className="text-[10px] font-bold tracking-widest uppercase text-stone-600">New Collection 2024</span>
//             </div>

//             {/* Heading */}
//             <h1 className="fade-in-up animate-delay-100 text-5xl sm:text-6xl md:text-7xl xl:text-8xl font-serif text-white leading-[1.05]">
//               A Better <br />
//               Quality of <span className="italic font-light text-white relative inline-block">
//                 Life.
//                 {/* Subtle underline SVG */}
//                 <svg className="absolute w-full h-3 bottom-0 left-0 text-emerald-100/60 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" /></svg>
//               </span>
//             </h1>
            
//             <p className="fade-in-up animate-delay-200 text-base md:text-lg text-stone-600 leading-relaxed font-medium max-w-lg">
//               We combine sustainable materials with cutting-edge technology to create home essentials that are as kind to the planet as they are beautiful.
//             </p>

//             {/* CTAs */}
//             <div className="fade-in-up animate-delay-300 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto pt-4">
//               <button className="w-full sm:w-auto bg-stone-900 text-white px-8 py-4 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-stone-800 hover:scale-105 hover:shadow-xl transition-all duration-300">
//                 Shop Collection
//               </button>
              
//               <button className="w-full sm:w-auto px-8 py-4 rounded-full font-bold text-stone-700 border border-stone-300 hover:bg-white hover:border-stone-400 transition-all flex items-center justify-center gap-3 text-xs uppercase tracking-widest bg-white/50 backdrop-blur-sm group/btn">
//                 <span className="w-6 h-6 rounded-full border border-stone-300 flex items-center justify-center group-hover/btn:bg-stone-900 group-hover/btn:border-stone-900 transition-colors">
//                   <i className="fa-solid fa-play text-[8px] ml-0.5 group-hover/btn:text-white text-stone-900"></i>
//                 </span>
//                 Watch Film
//               </button>
//             </div>

//             {/* Stats / Trust */}
//             <div className="fade-in-up animate-delay-500 pt-8 flex items-center justify-center sm:justify-start gap-12 w-full border-t border-stone-200 mt-4">
//                 <div className="text-center sm:text-left">
//                     <p className="text-3xl font-serif italic text-stone-900">25k+</p>
//                     <p className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mt-1">Happy Users</p>
//                 </div>
//                 <div className="w-px h-10 bg-stone-300"></div>
//                 <div className="text-center sm:text-left">
//                     <p className="text-3xl font-serif italic text-stone-900">100%</p>
//                     <p className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mt-1">Sustainable</p>
//                 </div>
//             </div>
//           </div>
          
//         </div>
//       </div>
//     </section>
//   );
// };

// export default AireHeroBanner;