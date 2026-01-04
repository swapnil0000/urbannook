import React, { useState, useEffect, useRef } from 'react';

const testimonials = [
  { id: 1, name: "Sarah Johnson", role: "Parent", location: "Portland, OR", content: "Aire has transformed our air quality. My family breathes easier and sleeps better than ever before.", avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100" },
  { id: 2, name: "Dr. Michael Chen", role: "Immunologist", location: "Seattle, WA", content: "Impressive technology with measurable results. I recommend it to all my patients for home wellness.", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100" },
  { id: 3, name: "Emma Rodriguez", role: "Interior Architect", location: "Austin, TX", content: "The aesthetic fits my modern home perfectly. It is quiet, efficient, and beautifully minimal.", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100" }
];

const AireTestimonials = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [mood, setMood] = useState(4); // 0-4 scale
  const [reviewText, setReviewText] = useState("");
  const [formState, setFormState] = useState('idle'); // idle, submitting, success
  const [isMuted, setIsMuted] = useState(false);

  const clickSound = useRef(null);
  const successSound = useRef(null);

  const moods = [
    { emoji: "😡", label: "Poor", color: "bg-red-400" },
    { emoji: "😕", label: "Fair", color: "bg-orange-400" },
    { emoji: "🙂", label: "Good", color: "bg-yellow-400" },
    { emoji: "😍", label: "Great", color: "bg-emerald-400" },
    { emoji: "😇", label: "Pure", color: "bg-sky-400" },
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

  const currentTestimonial = testimonials[activeIndex];

  return (
    <section className="relative w-full min-h-[850px] lg:h-[900px] flex items-center justify-center overflow-hidden bg-[#F5F7F8] font-sans py-12 px-4">
      
      {/* --- BACKGROUND AMBIENCE --- */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-100/50 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }}></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '10s' }}></div>
        {/* Grid Overlay */}
        <div className="absolute inset-0 opacity-[0.4]" style={{ backgroundImage: 'linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#F5F7F8] via-transparent to-[#F5F7F8]"></div>
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
        
        {/* --- LEFT COLUMN: TYPOGRAPHY & TESTIMONIAL DISPLAY --- */}
        <div className="lg:col-span-7 space-y-12">
          
          {/* Header */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Community Voices</span>
            </div>
            <h2 className="text-5xl md:text-7xl font-serif text-slate-900 leading-[1.1]">
              The sound of <br/>
              <span className="italic text-emerald-600 font-light relative inline-block">
                pure silence.
                <svg className="absolute w-full h-3 -bottom-1 left-0 text-emerald-200 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" /></svg>
              </span>
            </h2>
          </div>

          {/* Testimonial Card Display */}
          <div className="relative h-[320px] md:h-[280px]">
            {testimonials.map((t, idx) => (
               <div 
                key={t.id}
                className={`absolute inset-0 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]
                  ${idx === activeIndex 
                    ? 'opacity-100 translate-y-0 scale-100 rotate-0 z-20' 
                    : 'opacity-0 translate-y-8 scale-95 rotate-1 z-10 pointer-events-none'}`}
               >
                 <div className="bg-white/60 backdrop-blur-md border border-white/60 p-8 md:p-10 rounded-[2.5rem] shadow-xl h-full flex flex-col justify-between group hover:border-emerald-200 transition-colors">
                    <div>
                      <div className="flex gap-1 mb-6">
                        {[1,2,3,4,5].map(star => <i key={star} className="fa-solid fa-star text-emerald-400 text-xs"></i>)}
                      </div>
                      <p className="text-xl md:text-2xl font-serif text-slate-800 leading-relaxed">"{t.content}"</p>
                    </div>

                    <div className="flex items-center justify-between mt-6">
                      <div className="flex items-center gap-4">
                        <img src={t.avatar} alt={t.name} className="w-12 h-12 rounded-full object-cover ring-4 ring-white shadow-sm" />
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{t.name}</h4>
                          <p className="text-xs text-slate-500">{t.role} • {t.location}</p>
                        </div>
                      </div>
                      
                      {/* Brand Stamp */}
                      <i className="fa-solid fa-wind text-3xl text-slate-100 group-hover:text-emerald-100 transition-colors"></i>
                    </div>
                 </div>
               </div>
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            <button onClick={handlePrev} className="w-14 h-14 rounded-full border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm text-slate-600">
              <i className="fa-solid fa-arrow-left"></i>
            </button>
            <button onClick={handleNext} className="w-14 h-14 rounded-full bg-slate-900 text-white flex items-center justify-center transition-all hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-200 hover:scale-105 active:scale-95">
              <i className="fa-solid fa-arrow-right"></i>
            </button>
            <div className="h-px w-24 bg-slate-200 ml-4"></div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              0{activeIndex + 1} / 0{testimonials.length}
            </span>
          </div>

        </div>

        {/* --- RIGHT COLUMN: INTERACTIVE FEEDBACK FORM --- */}
        <div className="lg:col-span-5 relative">
          
          {/* Decorative Card Behind */}
          <div className="absolute inset-0 bg-slate-900 rounded-[3rem] rotate-3 translate-x-4 translate-y-4 opacity-10 blur-sm"></div>

          <div className="relative bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl border border-slate-100 overflow-hidden">
            
            {/* Success Overlay */}
            {formState === 'success' && (
              <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center text-center p-8 animate-in fade-in duration-300">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
                  <i className="fa-solid fa-check text-3xl text-emerald-600"></i>
                </div>
                <h3 className="text-3xl font-serif text-slate-900 mb-2">Received!</h3>
                <p className="text-slate-500 text-sm">Thank you for contributing to the Aire community.</p>
              </div>
            )}

            <div className="mb-8">
              <h3 className="text-2xl font-bold text-slate-900">How's your air?</h3>
              <p className="text-slate-500 text-sm mt-1">Share your experience with the community.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* Visual Mood Selector */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Atmosphere</label>
                <div className="flex justify-between bg-slate-50 p-2 rounded-2xl border border-slate-100">
                  {moods.map((m, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => { setMood(i); playSound('click'); }}
                      className={`relative w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-300 ${
                        mood === i 
                          ? 'bg-white shadow-md scale-110 z-10' 
                          : 'hover:bg-slate-200 opacity-60 grayscale hover:grayscale-0'
                      }`}
                    >
                      <span className="text-2xl">{m.emoji}</span>
                      {mood === i && (
                        <span className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${m.color}`}></span>
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-right text-xs font-medium text-emerald-600 h-4 transition-all">
                  {moods[mood].label} Quality
                </p>
              </div>

              {/* Text Input */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Your Story</label>
                <textarea
                  required
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Since installing Aire, I've noticed..."
                  className="w-full h-32 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                ></textarea>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={formState === 'submitting' || !reviewText}
                className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-emerald-600 transition-all shadow-lg shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
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
            className="absolute -bottom-16 right-4 text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-2 text-xs font-medium"
          >
            {isMuted ? 'Unmute FX' : 'Mute FX'}
            <i className={`fa-solid ${isMuted ? 'fa-volume-xmark' : 'fa-volume-high'}`}></i>
          </button>

        </div>
      </div>
    </section>
  );
};

export default AireTestimonials;