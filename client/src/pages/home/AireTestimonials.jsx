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

  const clickSound = useRef(null);
  const successSound = useRef(null);

  // API hooks
  const { data: testimonialsData, isLoading, error } = useGetTestimonialsQuery();
  const [submitTestimonial, { isLoading: isSubmitting }] = useSubmitTestimonialMutation();
  const testimonials = testimonialsData?.data?.testimonials || [];

  const moods = [
    { emoji: "😡", label: "Poor" },
    { emoji: "😕", label: "Fair" },
    { emoji: "🙂", label: "Good" },
    { emoji: "😍", label: "Great" },
    { emoji: "🤩", label: "Amazing" },
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormState('submitting');
    playSound('click');
    
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
      
      // Clear all form fields
      setReviewText("");
      setUserName("");
      setUserRole("");
      setUserLocation("");
      setMood(4);
      
      setTimeout(() => setFormState('idle'), 4000);
    } catch (err) {
      setFormState('error');
      
      if (err.status === 429) {
        const retryMinutes = Math.ceil(err.data?.data?.retryAfter / 60);
        setErrorMessage(`Too many submissions. Please try again in ${retryMinutes} minutes.`);
      } else if (err.status === 400) {
        const errors = err.data?.data?.errors || ['Validation failed'];
        setErrorMessage(errors.join(', '));
      } else {
        setErrorMessage('Something went wrong. Please try again.');
      }
      
      setTimeout(() => setFormState('idle'), 4000);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

 return (
  <section className="w-full bg-[#F5F7F8] py-4 overflow-hidden">
    {/* Wrapper Strategy:
        - Mobile (375px+): w-[94%] consistent gutters.
        - Desktop: max-width 1650px for 15.6" screens.
    */}
    <div className="w-[94%] md:w-[96%] lg:w-[98%] max-w-[1650px] mx-auto overflow-hidden rounded-[2.5rem] lg:rounded-[4rem] shadow-2xl isolation-isolate">
      
      <section className="relative w-full py-12 md:py-20 lg:py-24 flex items-center justify-center bg-[#1c3026] px-5 sm:px-8 md:px-12 lg:px-16 selection:bg-[#F5DEB3] selection:text-[#1c3026]">
        
        {/* CSS Override for Chrome Autofill */}
        <style>{`
          input:-webkit-autofill, textarea:-webkit-autofill {
              -webkit-box-shadow: 0 0 0 50px #15251e inset !important;
              -webkit-text-fill-color: #F5DEB3 !important;
              transition: background-color 5000s ease-in-out 0s;
          }
        `}</style>

        {/* --- BACKGROUND ATMOSPHERE --- */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#F5DEB3]/5 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }}></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-900/30 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '10s' }}></div>
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
        </div>

        {/* Adjusting Layout for stability across all screens */}
        <div className="relative z-10 w-full max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 lg:gap-20 items-center">
          
          {/* --- LEFT COLUMN: STORIES --- */}
          <div className="space-y-6 md:space-y-10 lg:space-y-12">
            <div className="space-y-3 md:space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F5DEB3]/10 border border-[#F5DEB3]/20">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F5DEB3] animate-pulse"></span>
                <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-[#F5DEB3]">Community Voices</span>
              </div>
              <h2 className="text-4xl sm:text-5xl md:text-7xl font-serif text-white leading-[1.1] tracking-tight">
                Stories from <br/>
                <span className="italic text-[#F5DEB3] font-light">Indian Homes.</span>
              </h2>
            </div>

            {/* Testimonial Card Display - Fluid width for narrow screens */}
            <div className="relative h-[280px] sm:h-[260px] md:h-[300px] w-full max-w-[480px] mx-auto lg:mx-0">
              {isLoading ? (
                <div className="bg-white/5 border border-white/10 rounded-[2rem] md:rounded-[2.5rem] h-full animate-pulse shadow-xl"></div>
              ) : (
                testimonials?.map((t, idx) => (
                  <div 
                    key={idx}
                    className={`absolute inset-0 transition-all duration-700 ease-out
                      ${idx === activeIndex ? 'opacity-100 translate-y-0 scale-100 z-20' : 'opacity-0 translate-y-8 scale-95 z-10 pointer-events-none'}`}
                  >
                    <div className="bg-[#e8e6e1]/5 backdrop-blur-md border border-white/10 p-6 sm:p-8 md:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl h-full flex flex-col justify-between group hover:border-[#F5DEB3]/30 transition-all">
                        <div className="space-y-4">
                          <div className="flex gap-1">
                            {[...Array(5)].map((_, i) => <i key={i} className="fa-solid fa-star text-[#F5DEB3] text-[10px]"></i>)}
                          </div>
                          <p className="text-base sm:text-lg md:text-xl font-serif text-gray-200 leading-relaxed italic line-clamp-4 md:line-clamp-5">"{t.content}"</p>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 md:gap-4">
                            <div className="shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-bold text-xs md:text-sm bg-[#F5DEB3] text-[#1c3026] shadow-lg">
                                {getInitials(t.userName || t.name)}
                            </div>
                            <h4 className="font-bold text-white text-sm md:text-base truncate max-w-[120px] sm:max-w-[180px]">{t.userName || t.name}</h4>
                          </div>
                          <i className="fa-solid fa-quote-right text-3xl md:text-4xl text-white/5 group-hover:text-[#F5DEB3]/20 transition-colors"></i>
                        </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Controls - Better touch targets for mobile */}
            {testimonials.length >= 2 && (
              <div className="flex items-center justify-center lg:justify-start gap-4 pt-2">
                <button onClick={handlePrev} className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-white/10 bg-white/5 text-white hover:bg-[#F5DEB3] hover:text-[#1c3026] transition-all flex items-center justify-center active:scale-90">
                  <i className="fa-solid fa-arrow-left text-xs md:text-sm"></i>
                </button>
                <button onClick={handleNext} className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#F5DEB3] text-[#1c3026] flex items-center justify-center transition-all hover:bg-white active:scale-90 shadow-lg">
                  <i className="fa-solid fa-arrow-right text-xs md:text-sm"></i>
                </button>
                <div className="h-px w-8 md:w-16 bg-white/10 ml-2"></div>
                <span className="text-[10px] md:text-[11px] font-black text-gray-500 uppercase tracking-widest">
                  0{activeIndex + 1} / 0{testimonials.length}
                </span>
              </div>
            )}
          </div>

          {/* --- RIGHT COLUMN: INTERACTIVE FORM --- */}
          <div className="relative w-full max-w-[550px] mx-auto lg:ml-auto">
            <div className="bg-[#2e443c]/40 backdrop-blur-xl rounded-[2.5rem] md:rounded-[3rem] p-6 sm:p-8 md:p-12 shadow-2xl border border-white/5 overflow-hidden">
              {formState === 'success' && (
                <div className="absolute inset-0 z-50 bg-[#1c3026]/95 backdrop-blur-md flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 bg-[#F5DEB3]/20 rounded-full flex items-center justify-center mb-4 text-[#F5DEB3] animate-bounce">
                    <i className="fa-solid fa-check text-2xl"></i>
                  </div>
                  <h3 className="text-2xl font-serif text-white mb-2 tracking-tight">Received!</h3>
                  <p className="text-gray-400 text-sm">Thank you for sharing your experience.</p>
                </div>
              )}

              <div className="mb-6 md:mb-8">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-serif text-white tracking-tight">Rate your Product</h3>
                <p className="text-gray-400 text-xs sm:text-sm mt-1 sm:mt-2 font-light">Tell us about the print quality and design.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-[#F5DEB3]/60 uppercase tracking-widest ml-1">Name *</label>
                    <input type="text" required value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Full Name" className="w-full bg-black/30 border border-white/10 rounded-xl md:rounded-2xl px-4 md:px-5 py-3 md:py-4 text-sm text-white placeholder-gray-600 focus:border-[#F5DEB3] outline-none transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-[#F5DEB3]/60 uppercase tracking-widest ml-1">City</label>
                    <input type="text" value={userLocation} onChange={(e) => setUserLocation(e.target.value)} placeholder="e.g. Mumbai" className="w-full bg-black/30 border border-white/10 rounded-xl md:rounded-2xl px-4 md:px-5 py-3 md:py-4 text-sm text-white placeholder-gray-600 focus:border-[#F5DEB3] outline-none transition-all" />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-[#F5DEB3]/60">Print Quality</label>
                    <span className="text-[10px] font-bold text-[#F5DEB3] uppercase">{moods[mood].label}</span>
                  </div>
                  <div className="flex justify-between bg-black/30 p-1.5 md:p-2 rounded-xl border border-white/5 shadow-inner">
                    {moods.map((m, i) => (
                      <button key={i} type="button" onClick={() => { setMood(i); playSound('click'); }} className={`w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-lg md:rounded-xl transition-all duration-300 ${mood === i ? 'bg-[#F5DEB3] scale-110 shadow-lg text-xl' : 'hover:bg-white/10 opacity-40 grayscale hover:grayscale-0 text-lg'}`}>
                        <span>{m.emoji}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-[#F5DEB3]/60 uppercase tracking-widest ml-1">Your Review *</label>
                  <textarea required value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Describe your experience..." className="w-full h-24 md:h-28 bg-black/30 border border-white/10 rounded-xl md:rounded-2xl px-4 md:px-5 py-3 md:py-4 text-sm text-white placeholder-gray-600 focus:border-[#F5DEB3] outline-none transition-all resize-none custom-scrollbar" />
                </div>

                <button type="submit" disabled={isSubmitting || !reviewText || !userName} className="w-full py-4 md:py-5 bg-[#F5DEB3] text-[#1c3026] rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-3 active:scale-[0.98]">
                  {isSubmitting ? 'Processing...' : 'Post Review'}
                  <i className="fa-solid fa-paper-plane text-[9px]"></i>
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