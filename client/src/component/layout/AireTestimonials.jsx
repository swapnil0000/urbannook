import React, { useState, useEffect, useRef } from 'react';

const testimonials = [
  { 
    id: 1, 
    name: "Aditi Rao", 
    role: "Art Enthusiast", 
    location: "Koramangala, Bangalore", 
    content: "I ordered a custom lithophane lamp for my parents' anniversary. The detail when it lights up is magical! You can't even tell it's 3D printed; the finish is so smooth.", 
    color: "bg-emerald-100 text-emerald-700"
  },
  { 
    id: 2, 
    name: "Rohan Das", 
    role: "Bike Lover", 
    location: "Pune, Maharashtra", 
    content: "Got a custom keychain for my bike keys. The dual-color filament looks insane in sunlight. It's super sturdy and lightweight compared to metal ones. 10/10.", 
    color: "bg-blue-100 text-blue-700"
  },
  { 
    id: 3, 
    name: "Priya Sethi", 
    role: "Gift Shopper", 
    location: "GK-2, Delhi", 
    content: "I was skeptical about the 'marble finish' PLA, but the planter I bought looks exactly like real stone. Perfect sustainable décor for my work desk.", 
    color: "bg-orange-100 text-orange-700"
  }
];

const AireTestimonials = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [mood, setMood] = useState(4); // 0-4 scale
  const [reviewText, setReviewText] = useState("");
  const [formState, setFormState] = useState('idle'); 
  const [isMuted, setIsMuted] = useState(true);

  const clickSound = useRef(null);
  const successSound = useRef(null);

  const moods = [
    { emoji: "😡", label: "Poor", color: "bg-red-400" },
    { emoji: "😕", label: "Fair", color: "bg-orange-400" },
    { emoji: "🙂", label: "Good", color: "bg-yellow-400" },
    { emoji: "😍", label: "Great", color: "bg-emerald-400" },
    { emoji: "🤩", label: "Amazing", color: "bg-sky-400" },
  ];

  useEffect(() => {
    clickSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
    successSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3');
    clickSound.current.volume = 0.1;
    successSound.current.volume = 0.2;
  }, []);

  const playSound = (type) => {
    if (isMuted) return;
    try {
      const sound = type === 'click' ? clickSound.current : successSound.current;
      sound.currentTime = 0;
      sound.play();
    } catch (e) { console.error(e); }
  };

  const handleNext = () => {
    playSound('click');
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
  };

  const handlePrev = () => {
    playSound('click');
    setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormState('submitting');
    playSound('click');
    
    setTimeout(() => {
      setFormState('success');
      playSound('success');
      setReviewText("");
    }, 1500);

    setTimeout(() => {
      setFormState('idle');
    }, 4000);
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('');
  }

  return (
    // Changed min-h to handle content naturally on mobile, fixed height on desktop
    <section className="relative w-full py-12 lg:py-0 lg:min-h-[900px] flex items-center justify-center overflow-hidden bg-[#F5F7F8] font-sans px-4">
      
      {/* --- BACKGROUND AMBIENCE --- */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-100/50 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }}></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '10s' }}></div>
        <div className="absolute inset-0 opacity-[0.4]" style={{ backgroundImage: 'linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#F5F7F8] via-transparent to-[#F5F7F8]"></div>
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
        
        {/* --- LEFT COLUMN: TYPOGRAPHY & TESTIMONIAL DISPLAY --- */}
        <div className="lg:col-span-7 space-y-8 md:space-y-12">
          
          {/* Header */}
          <div className="space-y-4 md:space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Community Voices</span>
            </div>
           <h2 className="text-5xl md:text-7xl font-serif text-slate-900 leading-[1.1]">
              Stories from <br/>
              <span className="italic text-emerald-600 font-light relative inline-block">
                Indian Homes.
                <svg className="absolute w-full h-1 -bottom-1 left-0 text-emerald-200 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" /></svg>
              </span>
            </h2>
          </div>

          {/* Testimonial Card Display - Height Adjusted for Mobile */}
          <div className="relative h-[380px] sm:h-[320px] md:h-[280px]">
            {testimonials.map((t, idx) => (
               <div 
                key={t.id}
                className={`absolute inset-0 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]
                  ${idx === activeIndex 
                    ? 'opacity-100 translate-y-0 scale-100 rotate-0 z-20' 
                    : 'opacity-0 translate-y-8 scale-95 rotate-1 z-10 pointer-events-none'}`}
               >
                 <div className="bg-white/60 backdrop-blur-md border border-white/60 p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-xl h-full flex flex-col justify-between group hover:border-emerald-200 transition-colors">
                    <div>
                      <div className="flex gap-1 mb-4 md:mb-6">
                        {[1,2,3,4,5].map(star => <i key={star} className="fa-solid fa-star text-emerald-400 text-xs"></i>)}
                      </div>
                      <p className="text-lg md:text-xl lg:text-2xl font-serif text-slate-800 leading-relaxed">"{t.content}"</p>
                    </div>

                    {/* Bottom Info Row */}
                    <div className="flex items-center justify-between mt-4 md:mt-6">
                      <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                        {/* INITIALS AVATAR */}
                        <div className={`shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-bold text-xs md:text-sm shadow-sm border-2 border-white ${t.color}`}>
                            {getInitials(t.name)}
                        </div>
                        
                        {/* Text Container with Truncation Fix */}
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-slate-900 text-sm truncate">{t.name}</h4>
                          <p className="text-[10px] md:text-xs text-slate-500 truncate">{t.role} • {t.location}</p>
                        </div>
                      </div>
                      
                      {/* Brand Stamp - Hidden on very small screens if needed, or kept */}
                      <i className="fa-solid fa-cube text-2xl md:text-3xl text-slate-100 group-hover:text-emerald-100 transition-colors shrink-0 ml-2"></i>
                    </div>
                 </div>
               </div>
            ))}
          </div>

          {/* Controls - Adjusted for Mobile */}
          <div className="flex items-center gap-3 md:gap-4">
            <button onClick={handlePrev} className="w-12 h-12 md:w-14 md:h-14 rounded-full border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm text-slate-600">
              <i className="fa-solid fa-arrow-left text-sm md:text-base"></i>
            </button>
            <button onClick={handleNext} className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-slate-900 text-white flex items-center justify-center transition-all hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-200 hover:scale-105 active:scale-95">
              <i className="fa-solid fa-arrow-right text-sm md:text-base"></i>
            </button>
            <div className="h-px w-12 md:w-24 bg-slate-200 ml-2 md:ml-4"></div>
            <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
              0{activeIndex + 1} / 0{testimonials.length}
            </span>
          </div>

        </div>

        {/* --- RIGHT COLUMN: INTERACTIVE FEEDBACK FORM --- */}
        <div className="lg:col-span-5 relative mt-8 lg:mt-0">
          
          {/* Decorative Card Behind */}
          <div className="absolute inset-0 bg-slate-900 rounded-[3rem] rotate-3 translate-x-4 translate-y-4 opacity-10 blur-sm hidden md:block"></div>

          <div className="relative bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 shadow-2xl border border-slate-100 overflow-hidden">
            
            {/* Success Overlay */}
            {formState === 'success' && (
              <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center text-center p-8 animate-in fade-in duration-300">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
                  <i className="fa-solid fa-check text-3xl text-emerald-600"></i>
                </div>
                <h3 className="text-3xl font-serif text-slate-900 mb-2">Received!</h3>
                <p className="text-slate-500 text-sm">Thank you for sharing your experience.</p>
              </div>
            )}

            <div className="mb-6 md:mb-8">
              <h3 className="text-xl md:text-2xl font-bold text-slate-900">Rate your Product</h3>
              <p className="text-slate-500 text-xs md:text-sm mt-1">Tell us about the print quality and design.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
              
              {/* Visual Mood Selector */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Print Quality</label>
                <div className="flex justify-between bg-slate-50 p-2 rounded-2xl border border-slate-100">
                  {moods.map((m, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => { setMood(i); playSound('click'); }}
                      className={`relative w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl transition-all duration-300 ${
                        mood === i 
                          ? 'bg-white shadow-md scale-110 z-10' 
                          : 'hover:bg-slate-200 opacity-60 grayscale hover:grayscale-0'
                      }`}
                    >
                      <span className="text-lg md:text-2xl">{m.emoji}</span>
                      {mood === i && (
                        <span className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${m.color}`}></span>
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-right text-xs font-medium text-emerald-600 h-4 transition-all">
                  {moods[mood].label} Finish
                </p>
              </div>

              {/* Text Input */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Your Review</label>
                <textarea
                  required
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="How is the texture? Did you like the custom details?"
                  className="w-full h-24 md:h-32 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                ></textarea>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={formState === 'submitting' || !reviewText}
                className="w-full py-3 md:py-4 bg-slate-900 text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-emerald-600 transition-all shadow-lg shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
              >
                {formState === 'submitting' ? (
                  <>Processing...</>
                ) : (
                  <>
                    Post Review 
                    <i className="fa-solid fa-paper-plane group-hover:translate-x-1 transition-transform"></i>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Mute Toggle */}
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className=" absolute -bottom-12 md:-bottom-16 right-4 text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-2 text-xs font-medium "
          >
            {/* {isMuted ? 'Unmute FX' : 'Mute FX'} */}
            {/* <i className={`fa-solid ${isMuted ? 'fa-volume-xmark' : 'fa-volume-high'}`}></i> */}
          </button>

        </div>
      </div>
    </section>
  );
};

export default AireTestimonials;