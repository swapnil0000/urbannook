import React, { useState, useEffect, useRef } from 'react';
import { useGetTestimonialsQuery, useSubmitTestimonialMutation } from '../../store/api/testimonialsApi';

const AireTestimonials = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [mood, setMood] = useState(4); // 0-4 scale
  const [reviewText, setReviewText] = useState("");
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userLocation, setUserLocation] = useState("");
  const [formState, setFormState] = useState('idle');
  const [errorMessage, setErrorMessage] = useState("");
  const [isMuted, setIsMuted] = useState(true);

  // API hooks
  const { data: testimonialsData, isLoading, error } = useGetTestimonialsQuery();
  const [submitTestimonial, { isLoading: isSubmitting }] = useSubmitTestimonialMutation();
  const testimonials = testimonialsData?.data?.testimonials || [];

  const clickSound = useRef(null);
  const successSound = useRef(null);

  const moods = [
    { emoji: "😡", label: "Poor" },
    { emoji: "😕", label: "Fair" },
    { emoji: "🙂", label: "Good" },
    { emoji: "😍", label: "Great" },
    { emoji: "🤩", label: "Amazing" },
  ];

  // 1. Audio Setup
  useEffect(() => {
    clickSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
    successSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3');
    clickSound.current.volume = 0.1;
    successSound.current.volume = 0.2;
  }, []);

  // 2. AUTO-MOVING CAROUSEL LOGIC
  useEffect(() => {
    if (testimonials.length < 2) return;
    
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000); // Changes every 5 seconds

    return () => clearInterval(interval);
  }, [testimonials.length]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormState('submitting');
    
    try {
      await submitTestimonial({
        userName,
        userRole: userRole || undefined,
        userLocation: userLocation || undefined,
        content: reviewText,
        rating: mood,
      }).unwrap();
      
      setFormState('success');
      playSound('success');
      setReviewText("");
      setUserName("");
      setMood(4);
      setTimeout(() => setFormState('idle'), 4000);
    } catch (err) {
      setFormState('error');
      setTimeout(() => setFormState('idle'), 4000);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <section className="w-full  py-4 overflow-hidden">
      <div className="w-[95%] md:w-[96%] lg:w-[99%] mx-auto overflow-hidden rounded-[2.5rem] lg:rounded-[4rem] shadow-2xl isolation-isolate">
        
        <section className="relative w-full py-12 md:py-16 flex items-center justify-center bg-[#1c3026] px-5 sm:px-8 md:px-12 selection:bg-[#F5DEB3] selection:text-[#1c3026]">
          
          {/* Background Atmosphere */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#F5DEB3]/5 rounded-full blur-[120px]"></div>
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
          </div>

          <div className="relative z-10 w-full max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-start">
            
            {/* --- LEFT COLUMN: STORIES (6 Cols) --- */}
            <div className="lg:col-span-7 space-y-8 md:space-y-10 self-center">
              <div className="space-y-4 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F5DEB3]/10 border border-[#F5DEB3]/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F5DEB3] animate-pulse"></span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#F5DEB3]">Community Voices</span>
                </div>
                <h2 className="text-4xl md:text-6xl lg:text-7xl font-serif text-white leading-tight">
                  Stories from <br className="hidden md:block"/>
                  <span className="italic text-[#F5DEB3] font-light">Indian Homes.</span>
                </h2>
              </div>

              {/* TESTIMONIAL DISPLAY (Visible on all screens now) */}
              <div className="relative h-[200px] sm:h-[220px] md:h-[260px] w-full max-w-[550px] mx-auto lg:mx-0">
                {isLoading ? (
                  <div className="bg-white/5 border border-white/10 rounded-[2.5rem] h-full animate-pulse"></div>
                ) : (
                  testimonials?.map((t, idx) => (
                    <div 
                      key={idx}
                      className={`absolute inset-0 transition-all duration-1000 ease-in-out
                        ${idx === activeIndex ? 'opacity-100 translate-x-0 scale-100 z-20' : 'opacity-0 translate-x-12 scale-95 z-10 pointer-events-none'}`}
                    >
                      <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 md:p-6 rounded-[2rem] md:rounded-[2.5rem]  flex flex-col justify-between group">
                          <div className="space-y-1">
                            <div className="flex gap-1">
                              {(() => {
                                const rating = typeof t.rating === 'number' && t.rating >= 1 && t.rating <= 5 ? t.rating : 0;
                                return (
                                  <>
                                    {[...Array(rating)].map((_, i) => (
                                      <i key={`filled-${i}`} className="fa-solid fa-star text-[#F5DEB3] text-[10px]"></i>
                                    ))}
                                    {[...Array(5 - rating)].map((_, i) => (
                                      <i key={`empty-${i}`} className="fa-regular fa-star text-[#F5DEB3] text-[10px]"></i>
                                    ))}
                                  </>
                                );
                              })()}
                            </div>
                            <p className="text-base md:text-xl font-serif text-gray-200 leading-relaxed italic line-clamp-4 md:line-clamp-3">"{t.content}"</p>
                          </div>

                          <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs bg-[#F5DEB3] text-[#1c3026]">
                                  {getInitials(t.userName || t.name)}
                              </div>
                              <h4 className="font-bold text-white text-sm">{t.userName || t.name}</h4>
                            </div>
                            <i className="fa-solid fa-quote-right text-3xl text-white/10 group-hover:text-[#F5DEB3]/20 transition-colors"></i>
                          </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center lg:justify-start gap-4">
                <button onClick={handlePrev} className="w-10 h-10 rounded-full border border-white/10 bg-white/5 text-white hover:bg-[#F5DEB3] hover:text-[#1c3026] transition-all flex items-center justify-center active:scale-90">
                  <i className="fa-solid fa-arrow-left text-xs"></i>
                </button>
                <button onClick={handleNext} className="w-10 h-10 rounded-full bg-[#F5DEB3] text-[#1c3026] flex items-center justify-center transition-all hover:bg-white active:scale-90 shadow-lg">
                  <i className="fa-solid fa-arrow-right text-xs"></i>
                </button>
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">
                  0{activeIndex + 1} / 0{testimonials.length}
                </span>
              </div>
            </div>

            {/* --- RIGHT COLUMN: FORM (5 Cols) --- */}
            <div className="lg:col-span-5 relative w-full max-w-[500px] mx-auto">
              <div className="bg-[#2e443c]/40 backdrop-blur-xl rounded-[2.5rem] p-6 md:p-10 shadow-2xl border border-white/5 relative overflow-hidden">
                {formState === 'success' && (
                  <div className="absolute inset-0 z-50 bg-[#1c3026]/95 backdrop-blur-md flex flex-col items-center justify-center text-center p-8">
                    <div className="w-16 h-16 bg-[#F5DEB3]/20 rounded-full flex items-center justify-center mb-4 text-[#F5DEB3] animate-bounce">
                      <i className="fa-solid fa-check text-2xl"></i>
                    </div>
                    <h3 className="text-2xl font-serif text-white mb-2">Received!</h3>
                    <p className="text-gray-400 text-sm">Thank you for sharing your experience.</p>
                  </div>
                )}

                <div className="mb-6 text-center lg:text-left">
                  <h3 className="text-xl md:text-2xl font-serif text-white tracking-tight">Share your thought</h3>
                  <p className="text-gray-400 text-xs mt-1 font-light">We truly value your feedback.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-[#F5DEB3]/60 uppercase tracking-widest ml-1">Name *</label>
                    <input type="text" required value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Full Name" className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#F5DEB3] outline-none" />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-[#F5DEB3]/60">Experience</label>
                      <span className="text-[10px] font-bold text-[#F5DEB3] uppercase">{moods[mood].label}</span>
                    </div>
                    <div className="flex justify-between bg-black/30 p-1.5 rounded-xl border border-white/5">
                      {moods.map((m, i) => (
                        <button key={i} type="button" onClick={() => { setMood(i); playSound('click'); }} className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${mood === i ? 'bg-[#F5DEB3] scale-105 shadow-lg text-lg' : 'opacity-40 grayscale hover:grayscale-0'}`}>
                          <span>{m.emoji}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-[#F5DEB3]/60 uppercase tracking-widest ml-1">Your Review *</label>
                    <textarea required value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Describe your experience..." className="w-full h-24 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#F5DEB3] outline-none resize-none" />
                  </div>

                  <button type="submit" disabled={isSubmitting || !reviewText || !userName} className="w-full py-4 bg-[#F5DEB3] text-[#1c3026] rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-white transition-all shadow-xl disabled:opacity-50">
                    {isSubmitting ? 'Processing...' : 'Post Review'}
                  </button>
                </form>
              </div>
            </div>

          </div>
        </section>
      </div>
    </section>
  );
};

export default AireTestimonials;