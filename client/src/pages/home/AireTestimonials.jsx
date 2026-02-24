import React, { useState, useEffect, useRef } from 'react';
import { useGetTestimonialsQuery, useSubmitTestimonialMutation } from '../../store/api/testimonialsApi';

const AireTestimonials = () => {
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

  // Audio Setup
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormState('submitting');
    
    try {
      await submitTestimonial({
        userName,
        userRole: userRole || undefined,
        userLocation: userLocation || undefined,
        content: reviewText,
       rating: mood + 1,
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

  // Helper to ensure we have enough items to make the infinite scroll look seamless
  const getScrollingItems = () => {
    if (!testimonials || testimonials.length === 0) return [];
    let items = [...testimonials];
    while (items.length < 8) {
      items = [...items, ...testimonials];
    }
    return items;
  };
  const scrollingItems = getScrollingItems();

  return (
    // Outer container restricted to viewport height on desktop
    <section className="relative min-h-[97vh] lg:h-[calc(100vh-2rem)] lg:max-h-[900px] mx-2 my-2 md:mx-4 md:my-4 rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl flex items-center group bg-[#1a2822]">
      
      {/* --- CORE CSS FOR MARQUEE & CUSTOM SCROLLBAR --- */}
      <style>{`
        @keyframes marquee-horizontal {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee-horizontal {
          animation: marquee-horizontal 40s linear infinite;
          width: max-content;
        }
        .animate-marquee-horizontal:hover {
          animation-play-state: paused;
        }
        
        /* Fades the left and right edges of the scrolling container */
        .mask-horizontal {
          -webkit-mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
          mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
        }

        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(245, 222, 179, 0.2); border-radius: 10px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(245, 222, 179, 0.6); }
      `}</style>

      {/* Main Inner Box */}
      <div className="w-full h-full relative overflow-hidden  bg-[#2e443c] flex items-center ">
        
        {/* Background Atmosphere */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#F5DEB3]/5 rounded-full blur-[100px]"></div>
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
        </div>

        {/* 2-Column Grid Layout */}
        <div className="relative z-10 w-full max-w-[1440px] mx-auto px-5 sm:px-8 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-16 items-center">
          
          {/* --- LEFT COLUMN: HEADER + SCROLLING REVIEWS --- */}
          <div className="lg:col-span-7 flex flex-col justify-center w-full min-w-0 overflow-hidden">
            
            {/* Header Text */}
            <div className="space-y-4 text-center lg:text-left mb-8 md:mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F5DEB3]/10 border border-[#F5DEB3]/20">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F5DEB3] animate-pulse"></span>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#F5DEB3]">Community Voices</span>
              </div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif text-white leading-tight">
                Stories from <span className="italic text-[#F5DEB3] font-light">Indian Homes.</span>
              </h2>
              <p className="text-green-50/60 font-light text-sm md:text-base max-w-md mx-auto lg:mx-0">
                 Discover how our meticulously crafted pieces are transforming spaces across the country.
              </p>
            </div>

            {/* Scrolling Marquee Container (Directly below header) */}
            <div className="relative w-full overflow-hidden mask-horizontal pb-4">
               {isLoading ? (
                  <div className="flex items-center justify-center h-[220px]">
                     <div className="w-8 h-8 border-2 border-[#F5DEB3] border-t-transparent rounded-full animate-spin"></div>
                  </div>
               ) : testimonials.length === 0 ? (
                  <div className="flex items-center justify-center h-[220px] bg-black/10 rounded-[2rem] border border-white/5">
                     <p className="text-gray-400 font-serif italic">No stories shared yet. Be the first!</p>
                  </div>
               ) : (
                  <div className="flex animate-marquee-horizontal">
                      
                      {/* Set 1 */}
                      <div className="flex gap-4 pr-4">
                        {scrollingItems.map((t, idx) => (
                          <div key={`set1-${idx}`} className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-3xl flex flex-col w-[280px] md:w-[340px] h-[220px] shrink-0 group hover:border-[#F5DEB3]/30 hover:bg-white/10 transition-all duration-500 shadow-xl relative">
                              
                              <div className="flex gap-1 shrink-0 mb-3">
                                {(() => {
                                  const rating = typeof t.rating === 'number' && t.rating >= 1 && t.rating <= 5 ? t.rating : 0;
                                  return (
                                    <>
                                      {[...Array(rating)].map((_, i) => <i key={`filled-${i}`} className="fa-solid fa-star text-[#F5DEB3] text-[10px]"></i>)}
                                      {[...Array(5 - rating)].map((_, i) => <i key={`empty-${i}`} className="fa-regular fa-star text-white/20 text-[10px]"></i>)}
                                    </>
                                  );
                                })()}
                              </div>

                              <div className="flex-1 min-h-0 relative mb-2">
                                <p className="text-sm md:text-base font-serif text-gray-200 leading-relaxed italic 
                                              line-clamp-3 group-hover:line-clamp-none 
                                              overflow-y-hidden group-hover:overflow-y-auto 
                                              h-full pr-2 custom-scrollbar transition-all duration-300">
                                  "{t.content}"
                                </p>
                              </div>

                              <div className="shrink-0 pt-3 border-t border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-3 overflow-hidden">
                                  <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] shadow-lg bg-[#F5DEB3] text-[#1c3026]">
                                      {getInitials(t.userName || t.name)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <h4 className="font-bold text-white text-xs truncate">{t.userName || t.name}</h4>
                                    {(t.userRole || t.role || t.userLocation || t.location) && (
                                      <p className="text-[9px] text-gray-400 truncate mt-0.5">
                                        {t.userRole || t.role} {(t.userLocation || t.location) ? `• ${t.userLocation || t.location}` : ''}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <i className="fa-solid fa-quote-right text-2xl text-white/5 group-hover:text-[#F5DEB3]/20 transition-colors duration-500 shrink-0 ml-2"></i>
                              </div>
                          </div>
                        ))}
                      </div>

                      {/* Set 2 (Duplicate for Seamless Loop) */}
                      <div className="flex gap-4 pr-4">
                        {scrollingItems.map((t, idx) => (
                          <div key={`set2-${idx}`} className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-3xl flex flex-col w-[280px] md:w-[340px] h-[220px] shrink-0 group hover:border-[#F5DEB3]/30 hover:bg-white/10 transition-all duration-500 shadow-xl relative">
                              <div className="flex gap-1 shrink-0 mb-3">
                                {(() => {
                                  const rating = typeof t.rating === 'number' && t.rating >= 1 && t.rating <= 5 ? t.rating : 0;
                                  return (
                                    <>
                                      {[...Array(rating)].map((_, i) => <i key={`filled-${i}`} className="fa-solid fa-star text-[#F5DEB3] text-[10px]"></i>)}
                                      {[...Array(5 - rating)].map((_, i) => <i key={`empty-${i}`} className="fa-regular fa-star text-white/20 text-[10px]"></i>)}
                                    </>
                                  );
                                })()}
                              </div>
                              <div className="flex-1 min-h-0 relative mb-2">
                                <p className="text-sm md:text-base font-serif text-gray-200 leading-relaxed italic line-clamp-3 group-hover:line-clamp-none overflow-y-hidden group-hover:overflow-y-auto h-full pr-2 custom-scrollbar transition-all duration-300">
                                  "{t.content}"
                                </p>
                              </div>
                              <div className="shrink-0 pt-3 border-t border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-3 overflow-hidden">
                                  <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] shadow-lg bg-[#F5DEB3] text-[#1c3026]">
                                      {getInitials(t.userName || t.name)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <h4 className="font-bold text-white text-xs truncate">{t.userName || t.name}</h4>
                                    {(t.userRole || t.role || t.userLocation || t.location) && (
                                      <p className="text-[9px] text-gray-400 truncate mt-0.5">
                                        {t.userRole || t.role} {(t.userLocation || t.location) ? `• ${t.userLocation || t.location}` : ''}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <i className="fa-solid fa-quote-right text-2xl text-white/5 group-hover:text-[#F5DEB3]/20 transition-colors duration-500 shrink-0 ml-2"></i>
                              </div>
                          </div>
                        ))}
                      </div>

                  </div>
               )}
            </div>

          </div>

          {/* --- RIGHT COLUMN: COMPACT FORM --- */}
          <div className="lg:col-span-5 w-full max-w-[480px] mx-auto lg:ml-auto z-20">
            <div className="bg-[#2e443c]/80 backdrop-blur-xl rounded-[2.5rem] p-6 md:p-8 shadow-2xl border border-white/10 relative overflow-hidden">
              
              {formState === 'success' && (
                <div className="absolute inset-0 z-50 bg-[#2e443c]/95 backdrop-blur-md flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 bg-[#F5DEB3]/20 rounded-full flex items-center justify-center mb-4 text-[#F5DEB3] animate-bounce">
                    <i className="fa-solid fa-check text-2xl"></i>
                  </div>
                  <h3 className="text-2xl font-serif text-white mb-2">Received!</h3>
                  <p className="text-gray-300 text-sm">Thank you for sharing your experience.</p>
                </div>
              )}

              <div className="mb-5 text-center lg:text-left">
                <h3 className="text-xl md:text-2xl font-serif text-white tracking-tight">Share your thought</h3>
                <p className="text-gray-400 text-xs mt-1 font-light">We truly value your feedback.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-[#F5DEB3]/80 uppercase tracking-widest ml-1">Name *</label>
                  <input type="text" required value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Full Name" className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#F5DEB3] outline-none transition-all" />
                </div>
                
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-[#F5DEB3]/80">Experience</label>
                    <span className="text-[10px] font-bold text-[#F5DEB3] uppercase">{moods[mood].label}</span>
                  </div>
                  <div className="flex justify-between bg-black/20 p-1.5 rounded-xl border border-white/5">
                    {moods.map((m, i) => (
                      <button key={i} type="button" onClick={() => { setMood(i); playSound('click'); }} className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${mood === i ? 'bg-[#F5DEB3] scale-105 shadow-lg text-lg' : 'opacity-40 grayscale hover:grayscale-0 hover:bg-white/10'}`}>
                        <span>{m.emoji}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="text-[9px] font-bold text-[#F5DEB3]/80 uppercase tracking-widest ml-1">Your Review *</label>
                  <textarea required value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Describe your experience..." className="w-full h-20 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#F5DEB3] outline-none resize-none custom-scrollbar transition-all" />
                </div>

                <button type="submit" disabled={isSubmitting || !reviewText || !userName} className="w-full py-3.5 mt-2 bg-[#F5DEB3] text-[#1c3026] rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-white transition-all shadow-xl disabled:opacity-50">
                  {isSubmitting ? 'Processing...' : 'Post Review'}
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default AireTestimonials;