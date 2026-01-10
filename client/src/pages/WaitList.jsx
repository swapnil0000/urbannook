import { useState, useEffect } from "react";
import WaitListBanner from "../../public/assets/WaitListBanner.png";
import axios from "axios";

const WaitList = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const serverProBaseUrl = import.meta.env?.VITE_EC2_PROD_BASE_URL;
  useEffect(() => {
    if (isFormOpen && window.innerWidth < 768) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isFormOpen]);

  const handleToggleForm = (open) => {
    if (!open) {
      setMsg("");
      setIsSuccess(false);
      setLoading(false);
      setFormKey((prev) => prev + 1);
    }
    setIsFormOpen(open);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);

    try {
      const res = await axios.post(
        `${serverProBaseUrl}/join/waitlist`,
        {
          userName: data?.userName,
          userEmail: data?.userEmail,
        }
      );

      if (res.data.success) {
        setMsg(res.data.message);
        setIsSuccess(true);
      }
    } catch (err) {
      setMsg(`Registry Error - ${err?.message}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };
return (
  <section className="fixed inset-0 lg:relative lg:h-[calc(100vh-4rem)] lg:max-h-[900px] mx-2 my-2 md:mx-4 md:my-4 rounded-[2.5rem] md:rounded-[3.5rem] overflow-hidden bg-[#1a2822] shadow-2xl flex items-center">
    
    {/* --- BACKGROUND LAYER --- */}
    <div className="absolute inset-0 z-0 pointer-events-none">
      <img
        src={WaitListBanner}
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = "https://images.unsplash.com/photo-1513519247388-193ad5130246?q=80&w=2500";
        }}
        alt="Aesthetic Home Interior"
        className="w-full h-full object-cover opacity-80 lg:opacity-70"
      />
      {/* Original Sage Green Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#2E443C]/20 via-[#2E443C]/60 to-[#1a2822] lg:bg-gradient-to-r lg:from-[#2E443C] lg:via-[#2E443C]/40 lg:to-transparent"></div>
    </div>

    {/* --- CONTENT LAYER --- */}
    <div className="relative z-10 w-full h-full lg:h-auto px-6 md:px-12 lg:px-24">
      {/* Desktop (>=1024px) items-start stacks content on the left side */}
      <div className="max-w-7xl mx-auto h-full lg:h-auto flex flex-col lg:items-start justify-start lg:justify-center">
        
        <div className="w-full max-w-xl h-full lg:h-auto flex flex-col lg:block">
          
          {/* 1. HEADLINE SECTION */}
          <div className={`flex-grow lg:flex-grow-0 flex flex-col lg:block transition-all duration-500 ${isFormOpen ? "max-md:opacity-0 max-md:pointer-events-none" : "opacity-100"}`}>
            
            {/* TEXT: Top-aligned for < 1024px | Left-aligned for Desktop */}
            <div className="pt-[10dvh] lg:pt-0 text-center lg:text-left space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm mb-2 lg:mb-4">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{
                  backgroundColor:"#2E443C"
                }}></span>
                <span className="text-[10px] text-stone-200 uppercase tracking-[0.3em] font-medium">
                  Curated Spaces
                </span>
              </div>

              <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter leading-none">
                URBAN<span className="text-stone-400">NOOK</span>
              </h1>
              <p className="text-xl md:text-3xl text-stone-200 font-serif italic">
                Turn a house into your{" "}
                <span className="text-stone-400 border-b border-stone-600">
                  Urban Nook.
                </span>
              </p>
            </div>

            {/* JOIN BUTTON: Exact Vertical & Horizontal Center for < 1024px */}
            <div className="flex-grow flex items-center justify-center lg:hidden">
              <button
                onClick={() => handleToggleForm(true)}
                className="w-1/2 min-w-[200px] py-[15px] bg-white text-[#2e443c] font-bold rounded-full uppercase tracking-widest text-[10px] shadow-2xl active:scale-95 transition-all"
              >
                Join The Circle
              </button>
            </div>

            {/* Spacer to lock the button in center mathematically (Mobile only) */}
            <div className="h-[15dvh] lg:hidden"></div>
          </div>

          {/* 2. FORM CONTAINER: Stacked below headline for Desktop (>=1024px) */}
          <div
            className={`
              ${isFormOpen
                ? "fixed inset-0 flex items-center justify-center p-4 z-[100] lg:relative lg:inset-auto lg:p-0 lg:flex lg:mt-10"
                : "hidden lg:flex lg:mt-10"}
            `}
          >
            <div className="w-full max-w-md bg-[#1a2822]/95 lg:bg-stone-900/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 lg:p-10 space-y-8 relative shadow-2xl">
              {(isFormOpen || isSuccess) && (
                <button
                  onClick={() => handleToggleForm(false)}
                  className="absolute top-6 right-8 text-stone-400 font-mono text-[10px] tracking-widest border border-white/10 px-3 py-1 rounded-full hover:text-white transition-colors"
                >
                  {isSuccess ? "RESET" : "CLOSE"}
                </button>
              )}

              <div className="space-y-2 pt-4 text-left">
                <p className="font-mono text-[10px] text-stone-500 uppercase tracking-[0.4em]">Registry 2026</p>
                <h2 className="text-3xl font-bold text-white tracking-tight">
                  {isSuccess ? "Confirmed." : "Access Granted."}
                </h2>
              </div>

              {isSuccess ? (
                <div className="py-4 text-stone-200 font-serif italic leading-relaxed text-lg">
                  {msg}
                </div>
              ) : (
                <form key={formKey} onSubmit={handleSubmit} className="space-y-6 text-left">
                  <div className="space-y-4">
                    <div className="border-b border-white/20 focus-within:border-white transition-all">
                      <label className="block text-[9px] text-stone-500 uppercase tracking-widest mb-1">Full Name</label>
                      <input
                        type="text"
                        name="userName"
                        required
                        placeholder="ENTER NAME"
                        className="w-full pb-4 bg-transparent text-white font-mono text-sm placeholder-stone-700 outline-none"
                      />
                    </div>
                    <div className="border-b border-white/20 focus-within:border-white transition-all">
                      <label className="block text-[9px] text-stone-500 uppercase tracking-widest mb-1">Email Address</label>
                      <input
                        type="email"
                        name="userEmail"
                        required
                        placeholder="ENTER EMAIL"
                        className="w-full pb-4 bg-transparent text-white font-mono text-sm placeholder-stone-700 outline-none"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-white text-black py-5 rounded-full font-black uppercase tracking-[0.2em] text-[10px] hover:bg-stone-200 active:scale-95 disabled:opacity-50 transition-all"
                  >
                    {loading ? "PROCESSING..." : "JOIN THE CIRCLE"}
                  </button>
                </form>
              )}

              <div className="flex justify-between items-center font-mono text-[9px] text-stone-600 uppercase tracking-widest pt-4">
                <span>LTD SLOTS 2026</span>
                <span>SECURED NODE</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);
};

export default WaitList;
