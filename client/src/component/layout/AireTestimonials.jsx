import React, { useState, useEffect, useRef } from 'react';

const testimonials = [
  { id: 1, name: "Sarah Johnson", role: "Parent", content: "Aire has transformed our air quality. My family breathes easier and sleeps better than ever before.", avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100" },
  { id: 2, name: "Dr. Michael Chen", role: "Specialist", content: "Impressive technology with measurable results. I recommend it to all my patients for home wellness.", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100" },
  { id: 3, name: "Emma Rodriguez", role: "Designer", content: "The aesthetic fits my modern home perfectly. It is quiet, efficient, and beautifully minimal.", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100" }
];

const AireTestimonials = () => {
  const [index, setIndex] = useState(0);
  const [mood, setMood] = useState(80);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isTraveling, setIsTraveling] = useState(false);

  const whooshSound = useRef(null);
  const chimeSound = useRef(null);

  useEffect(() => {
    whooshSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
    chimeSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3');
    whooshSound.current.volume = 0.15;
    chimeSound.current.volume = 0.25;
  }, []);

  const playSound = (type) => {
    if (isMuted) return;
    try {
      const sound = type === 'whoosh' ? whooshSound.current : chimeSound.current;
      sound.currentTime = 0;
      sound.play();
    } catch (e) {}
  };

  const nextCard = () => {
    playSound('whoosh');
    setIndex((prev) => (prev + 1) % testimonials.length);
  };

  const getMoodEmoji = () => {
    if (mood < 20) return "😡";
    if (mood < 40) return "😕";
    if (mood < 60) return "🙂";
    if (mood < 85) return "😍";
    return "😇";
  };

  const getMoodColor = () => {
    if (mood < 40) return "rgba(239, 68, 68, 0.08)"; 
    if (mood < 70) return "rgba(59, 130, 246, 0.08)"; 
    return "rgba(16, 185, 129, 0.08)"; 
  };

  const handleSubmit = () => {
    setIsTraveling(true);
    playSound('whoosh');
    setTimeout(() => {
        setIsTraveling(false);
        setIsSubmitted(true);
        playSound('chime');
    }, 1200);
  };

  return (
    <section className="py-4 w-full flex justify-center items-center font-sans overflow-x-hidden">
      <style>{`
        @keyframes signatureTravel {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(400px, -150px) scale(0); opacity: 0; }
        }
        .perspective-1500 { perspective: 1500px; }
      `}</style>

      {/* 790PX SEAMLESS ISLAND */}
      <div 
        className="w-[98%] max-w-[1600px] h-auto lg:h-[790px] rounded-[60px] shadow-2xl overflow-hidden relative flex flex-col lg:flex-row transition-colors duration-1000 border border-white"
        style={{ backgroundColor: 'white' }}
      >
        
        {/* UNIFIED REACTIVE BACKGROUND GLOW */}
        <div 
            className="absolute inset-0 transition-all duration-1000 z-0 pointer-events-none"
            style={{ 
                background: `radial-gradient(circle at center, ${getMoodColor()} 0%, transparent 70%)`,
            }}
        ></div>

        {/* BRAND WATERMARK */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden opacity-[0.03]">
          <span className="text-[18vw] font-serif font-black uppercase tracking-tighter whitespace-nowrap">
            Urban Nook
          </span>
        </div>

        {/* DIGITAL SIGNATURE TRAVEL PARTICLE */}
        {isTraveling && (
          <div className="absolute left-[30%] top-[60%] z-[100] w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center text-3xl shadow-2xl animate-[signatureTravel_1.2s_ease-in-out_forwards]">
            {getMoodEmoji()}
          </div>
        )}

        {/* LEFT PANEL: FORM & PULSE (45%) - NO BORDER */}
        <div className="relative z-10 w-full lg:w-[45%] p-8 lg:p-20 flex flex-col justify-between">
          {!isSubmitted ? (
            <div className="space-y-12">
              <div>
                <div className="inline-block px-4 py-1.5 mb-8 rounded-full bg-slate-900 text-white text-[10px] font-bold uppercase tracking-[0.25em]">
                  Live Hub
                </div>
                <h2 className="text-4xl md:text-6xl font-serif text-slate-900 leading-none tracking-tighter">Breathe the <br/><span className="italic font-light text-emerald-700">Difference.</span></h2>
              </div>

              <div className="space-y-8">
                {/* MOOD DIAL - High Contrast */}
                <div className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-slate-300 shadow-sm">
                   <div className="flex justify-between items-center mb-6">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Atmosphere Dial</span>
                      <span className="text-5xl md:text-6xl animate-bounce">{getMoodEmoji()}</span>
                   </div>
                   <input type="range" min="0" max="100" value={mood} onChange={(e) => setMood(e.target.value)} className="w-full h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-emerald-600" />
                </div>

                {/* TEXT AREA - High Contrast */}
                <div className="relative">
                  <textarea 
                    placeholder="Tell the community about your space..." 
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-3xl p-6 text-sm text-slate-900 placeholder-slate-500 focus:border-emerald-500 transition-all outline-none resize-none h-32 md:h-44 shadow-sm" 
                  />
                  <button 
                    disabled={isTraveling}
                    onClick={handleSubmit} 
                    className="w-full mt-4 bg-slate-900 text-white py-5 rounded-2xl font-bold tracking-widest uppercase hover:bg-emerald-700 transition-all shadow-xl active:scale-95 disabled:opacity-50"
                  >
                    {isTraveling ? 'Broadcasting...' : 'Post Experience'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-20 flex flex-col items-center justify-center text-center animate-in zoom-in duration-500">
                <div className="text-8xl mb-8 animate-bounce">{getMoodEmoji()}</div>
                <h3 className="text-5xl font-serif text-slate-900 mb-4 tracking-tighter">Post <span className="italic text-emerald-700">Live!</span></h3>
                <p className="text-slate-500 max-w-xs mb-10 text-sm leading-relaxed">Your story has been added to our constellation of clean air advocates.</p>
                <button onClick={() => setIsSubmitted(false)} className="px-10 py-4 border-2 border-slate-900 text-slate-900 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-md">Submit Another</button>
            </div>
          )}

          <div className="hidden lg:flex gap-12 pt-8 opacity-40">
             <div className="flex flex-col"><span className="text-3xl font-serif text-slate-900">50K+</span><span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Active Pulses</span></div>
             <div className="flex flex-col"><span className="text-3xl font-serif text-slate-900">4.9/5</span><span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Global Love</span></div>
          </div>
        </div>

        {/* RIGHT PANEL: FLOATING HERO CARD (55%) - NO BORDER */}
        <div className="relative z-10 w-full lg:w-[55%] h-[550px] lg:h-full flex items-center justify-center p-6 lg:p-12">
          
          <div className="relative w-full max-w-[550px] flex items-center justify-center perspective-1500">
            {testimonials.map((t, i) => {
              const isFront = i === index;
              const isBack = i === (index + 1) % testimonials.length;

              if (!isFront && !isBack) return null;

              return (
                <div
                  key={t.id}
                  className={`absolute w-full bg-white rounded-[4rem] p-10 lg:p-16 shadow-[0_40px_100px_rgba(0,0,0,0.1)] transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] border border-white flex flex-col justify-between
                  ${isFront 
                      ? 'z-20 opacity-100 scale-100 translate-x-0 rotate-0 pointer-events-auto' 
                      : 'z-10 opacity-30 scale-90 translate-x-20 lg:translate-x-32 -rotate-3 blur-[2px] pointer-events-none'
                  }`}
                  style={{ minHeight: '480px' }}
                >
                  <div>
                    <i className="fa-solid fa-quote-left text-5xl lg:text-6xl text-emerald-100 mb-8 block"></i>
                    <p className="text-2xl lg:text-4xl font-serif text-slate-800 leading-tight tracking-tight">
                        "{t.content}"
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-10 border-t border-slate-50">
                    <div className="flex items-center gap-4">
                      <img src={t.avatar} className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg" alt={t.name} />
                      <div>
                        <h4 className="font-bold text-slate-900 text-lg leading-none">{t.name}</h4>
                        <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mt-1.5">{t.role}</p>
                      </div>
                    </div>
                    
                    <button 
                      onClick={nextCard}
                      className="w-16 h-16 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-emerald-700 transition-all shadow-xl active:scale-90"
                    >
                      <i className="fa-solid fa-chevron-right text-lg"></i>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* SOUND CONTROL - Bottom Corner */}
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className="absolute bottom-12 right-12 z-50 w-12 h-12 bg-white/80 backdrop-blur-md rounded-full shadow-lg border border-slate-200 flex items-center justify-center transition-all hover:scale-110 active:scale-90"
          >
            <i className={`fa-solid ${isMuted ? 'fa-volume-xmark text-slate-300' : 'fa-volume-high text-emerald-600'} text-sm`}></i>
          </button>
        </div>
      </div>
    </section>
  );
};

export default AireTestimonials;