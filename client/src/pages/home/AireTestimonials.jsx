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
    // Outer Wrapper: Adds the left/right spacing and limits max width
    <div className="w-full px-2 md:px-2 lg:px-2 py-2 max-w-[1500px] mx-auto">
      
      {/* Inner Section: Gets the rounded corners and the dark green background */}
      <section className="relative w-full py-16 lg:py-24 flex items-center justify-center overflow-hidden bg-[#1c3026] rounded-[2.5rem] lg:rounded-[3rem] shadow-2xl font-sans px-4 lg:px-12 selection:bg-[#F5DEB3] selection:text-[#1c3026]">
        
        {/* CSS Override for Chrome Autofill White Background */}
        <style>{`
          input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus, input:-webkit-autofill:active,
          textarea:-webkit-autofill, textarea:-webkit-autofill:hover, textarea:-webkit-autofill:focus, textarea:-webkit-autofill:active {
              -webkit-box-shadow: 0 0 0 50px #15251e inset !important;
              -webkit-text-fill-color: #F5DEB3 !important;
              transition: background-color 5000s ease-in-out 0s;
          }
        `}</style>

        {/* --- BACKGROUND ATMOSPHERE --- */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-[2.5rem] lg:rounded-[3rem]">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#F5DEB3]/5 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }}></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-900/30 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '10s' }}></div>
          {/* Noise Texture */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* --- LEFT COLUMN: TYPOGRAPHY & TESTIMONIAL DISPLAY --- */}
          <div className="lg:col-span-6 space-y-8 md:space-y-12">
            
            {/* Header */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F5DEB3]/10 border border-[#F5DEB3]/20 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F5DEB3] animate-pulse"></span>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#F5DEB3]">Community Voices</span>
              </div>
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-serif text-white leading-[1.1]">
                Stories from <br/>
                <span className="italic text-[#F5DEB3] font-light">Indian Homes.</span>
              </h2>
            </div>

            {/* Testimonial Card Display */}
            <div className="relative h-[260px] sm:h-[240px] md:h-[280px]">
              {isLoading ? (
                // Dark Theme Loading Skeleton
                <div className="absolute inset-0">
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 md:p-10 rounded-[2rem] h-full flex flex-col animate-pulse shadow-2xl">
                    <div className="flex gap-1 mb-6">
                      {[1,2,3,4,5].map(star => <div key={star} className="w-3 h-3 bg-white/10 rounded"></div>)}
                    </div>
                    <div className="space-y-3 flex-1">
                      <div className="h-3 bg-white/10 rounded w-full"></div>
                      <div className="h-3 bg-white/10 rounded w-5/6"></div>
                      <div className="h-3 bg-white/10 rounded w-4/6"></div>
                    </div>
                    <div className="flex items-center gap-4 mt-6">
                      <div className="w-10 h-10 bg-white/10 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-2 bg-white/10 rounded w-24"></div>
                        <div className="h-2 bg-white/10 rounded w-32"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : testimonials.length === 0 ? (
                // Dark Theme Empty State
                <div className="absolute inset-0">
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 md:p-10 rounded-[2rem] shadow-2xl h-full flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mb-4">
                      <i className="fa-solid fa-comment-dots text-2xl text-[#F5DEB3]/50"></i>
                    </div>
                    <h3 className="text-xl font-serif text-white mb-2">No testimonials yet</h3>
                    <p className="text-gray-400 text-sm font-light">Be the first to share your experience!</p>
                  </div>
                </div>
              ) : (
                testimonials?.map((t, idx) => (
                  <div 
                    key={t.id || idx}
                    className={`absolute inset-0 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]
                      ${idx === activeIndex 
                        ? 'opacity-100 translate-y-0 scale-100 rotate-0 z-20' 
                        : 'opacity-0 translate-y-8 scale-95 rotate-1 z-10 pointer-events-none'}`}
                  >
                    {/* Dark Glass Card */}
                    <div className="bg-[#e8e6e1]/5 backdrop-blur-md border border-white/10 p-6 md:p-10 rounded-[2rem] shadow-2xl h-full flex flex-col justify-between group hover:border-[#F5DEB3]/30 transition-colors">
                        <div>
                          <div className="flex gap-1 mb-4 md:mb-6">
                            {[1,2,3,4,5].map(star => <i key={star} className="fa-solid fa-star text-[#F5DEB3] text-[10px] md:text-xs"></i>)}
                          </div>
                          <p className="text-base md:text-xl font-serif text-gray-200 leading-relaxed line-clamp-4">"{t.content}"</p>
                        </div>

                        {/* Bottom Info Row */}
                        <div className="flex items-center justify-between mt-4 md:mt-6">
                          <div className="flex items-center gap-3 overflow-hidden">
                            {/* INITIALS AVATAR */}
                            <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shadow-lg bg-[#F5DEB3] text-[#1c3026]">
                                {getInitials(t.userName || t.name)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-white text-sm truncate">{t.userName || t.name}</h4>
                              <p className="text-[10px] md:text-xs text-gray-400 truncate">
                                {t.userRole || t.role} {t.userLocation || t.location ? `• ${t.userLocation || t.location}` : ''}
                              </p>
                            </div>
                          </div>
                          <i className="fa-solid fa-quote-right text-3xl text-white/5 group-hover:text-[#F5DEB3]/20 transition-colors shrink-0 ml-2"></i>
                        </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Controls - Hidden when less than 2 testimonials */}
            {testimonials.length >= 2 && (
              <div className="flex items-center gap-3 md:gap-4 pt-2">
                <button onClick={handlePrev} className="w-12 h-12 rounded-full border border-white/10 bg-white/5 text-white hover:bg-[#F5DEB3] hover:text-[#1c3026] hover:border-[#F5DEB3] flex items-center justify-center transition-all active:scale-95 shadow-sm">
                  <i className="fa-solid fa-arrow-left text-sm"></i>
                </button>
                <button onClick={handleNext} className="w-12 h-12 rounded-full bg-[#F5DEB3] text-[#1c3026] flex items-center justify-center transition-all hover:bg-white active:scale-95 shadow-lg shadow-[#F5DEB3]/10">
                  <i className="fa-solid fa-arrow-right text-sm"></i>
                </button>
                <div className="h-px w-12 md:w-16 bg-white/10 ml-2"></div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">
                  0{activeIndex + 1} / 0{testimonials.length}
                </span>
              </div>
            )}

          </div>

          {/* --- RIGHT COLUMN: COMPACT INTERACTIVE FORM --- */}
          <div className="lg:col-span-6 relative mt-4 lg:mt-0">
            
            <div className="relative bg-[#2e443c] rounded-[2rem] p-6 md:p-8 shadow-2xl border border-white/5 overflow-hidden">
              
              {/* Dark Theme Success Overlay */}
              {formState === 'success' && (
                <div className="absolute inset-0 z-50 bg-[#1c3026]/95 backdrop-blur-sm flex flex-col items-center justify-center text-center p-8 animate-in fade-in duration-300">
                  <div className="w-16 h-16 bg-[#F5DEB3]/20 rounded-full flex items-center justify-center mb-4 text-[#F5DEB3] animate-bounce">
                    <i className="fa-solid fa-check text-2xl"></i>
                  </div>
                  <h3 className="text-2xl font-serif text-white mb-2">Received!</h3>
                  <p className="text-gray-400 text-sm">Thank you for sharing your experience.</p>
                </div>
              )}

              {/* Dark Theme Error Overlay */}
              {formState === 'error' && (
                <div className="absolute inset-0 z-50 bg-[#2a1a1a]/95 backdrop-blur-sm flex flex-col items-center justify-center text-center p-8 animate-in fade-in duration-300">
                  <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4 text-red-400">
                    <i className="fa-solid fa-exclamation text-2xl"></i>
                  </div>
                  <h3 className="text-2xl font-serif text-white mb-2">Oops!</h3>
                  <p className="text-red-200/70 text-sm">{errorMessage}</p>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl md:text-2xl font-serif text-white">Rate your Product</h3>
                <p className="text-gray-400 text-xs mt-1">Share your thoughts on the print quality and design.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
                
                {/* Grid for Compact Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-[#F5DEB3]/70 ml-1">Name *</label>
                    <input
                      type="text"
                      required
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#F5DEB3] transition-all"
                    />
                  </div>

                  {/* Location */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-[#F5DEB3]/70 ml-1">Location</label>
                    <input
                      type="text"
                      value={userLocation}
                      onChange={(e) => setUserLocation(e.target.value)}
                      placeholder="e.g., Delhi"
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#F5DEB3] transition-all"
                    />
                  </div>
                </div>

                {/* Role */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-[#F5DEB3]/70 ml-1">Role / Persona</label>
                  <input
                    type="text"
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value)}
                    placeholder="e.g., Art Enthusiast, Tech Geek"
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#F5DEB3] transition-all"
                  />
                </div>
                
                {/* Visual Mood Selector */}
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between items-center">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-[#F5DEB3]/70 ml-1">Print Quality</label>
                      <span className="text-[10px] font-medium text-[#F5DEB3] transition-all">{moods[mood].label}</span>
                  </div>
                  <div className="flex justify-between bg-black/20 p-1.5 rounded-xl border border-white/5">
                    {moods.map((m, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => { setMood(i); playSound('click'); }}
                        className={`relative w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-300 ${
                          mood === i 
                            ? 'bg-[#F5DEB3] shadow-lg scale-110 z-10 text-xl' 
                            : 'hover:bg-white/10 opacity-50 grayscale hover:grayscale-0 text-lg'
                        }`}
                      >
                        <span>{m.emoji}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Text Input (Reduced Height) */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-[#F5DEB3]/70 ml-1">Your Review *</label>
                  <textarea
                    required
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="How is the texture? Did you like the details?"
                    className="w-full h-20 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#F5DEB3] transition-all resize-none custom-scrollbar"
                  ></textarea>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !reviewText || !userName}
                  className="w-full py-3.5 mt-2 bg-[#F5DEB3] text-[#1c3026] rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-white transition-all shadow-[0_0_15px_rgba(245,222,179,0.2)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                >
                  {isSubmitting ? (
                    <><div className="w-3 h-3 border-2 border-[#1c3026] border-t-transparent rounded-full animate-spin"></div> Processing...</>
                  ) : (
                    <>
                      Post Review 
                      <i className="fa-solid fa-paper-plane group-hover:translate-x-1 transition-transform"></i>
                    </>
                  )}
                </button>
              </form>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
};

export default AireTestimonials;