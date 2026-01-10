import { useState, useEffect } from "react";
import WaitListBanner from "../../public/assets/WaitListBanner.png";
import axios from "axios";

const WaitList = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formKey, setFormKey] = useState(0);

  // ✅ Use env instead of hardcoded localhost
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
        `${serverProBaseUrl}/api/v1/join/waitlist`,
        {
          userName: data?.userName,
          userEmail: data?.userEmail,
        }
      );

      if (res?.data?.success) {
        setMsg(res.data.message);
        setIsSuccess(true);
      } else {
        setMsg("Something went wrong. Please try again.");
      }
    } catch (err) {
      console.error("Waitlist Error:", err);
      setMsg(
        err?.response?.data?.message ||
          `Registry Error - ${err?.message}. Please try again.`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative h-screen lg:h-[calc(100vh-2rem)] lg:max-h-[900px] lg:mx-4 lg:my-4 lg:rounded-[3.5rem] overflow-hidden shadow-2xl flex items-center bg-[#1a2822] fixed inset-0 lg:relative">
      {/* --- BACKGROUND --- */}
      <div className="absolute inset-0 z-0">
        <img
          src={WaitListBanner}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src =
              "https://images.unsplash.com/photo-1513519247388-193ad5130246?q=80&w=2500";
          }}
          alt="Aesthetic Home Interior"
          className="w-full h-full object-cover opacity-60 lg:opacity-70"
        />

        <div className="absolute inset-0 bg-gradient-to-b from-[#2E443C]/20 via-[#2E443C]/80 to-[#1a2822] lg:bg-gradient-to-r lg:from-[#2E443C] lg:via-[#2E443C]/60 lg:to-transparent"></div>
      </div>

      <div className="relative z-10 w-full px-6 md:px-12 lg:px-24">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-start gap-8 lg:gap-12">
          <div className="w-full max-w-xl">
            {/* HEADLINE SECTION */}
            <div
              className={`transition-all duration-500 ${
                isFormOpen
                  ? "max-md:opacity-0 max-md:pointer-events-none"
                  : "opacity-100"
              }`}
            >
              <div className="text-center md:text-left space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-300 animate-pulse"></span>
                  <span className="text-[10px] text-stone-200 uppercase tracking-[0.3em] font-medium">
                    Curated Spaces
                  </span>
                </div>

                <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter leading-none">
                  URBAN<span className="text-stone-400">NOOK</span>
                </h1>
                <p className="text-lg md:text-2xl text-stone-200 font-serif italic">
                  Elevating everyday living with <br />
                  <span className="text-white border-b border-stone-500/50 not-italic font-sans text-base md:text-lg tracking-widest uppercase">
                    Aesthetic Essentials
                  </span>
                </p>

                <button
                  onClick={() => handleToggleForm(true)}
                  className="md:hidden mt-8 w-full py-4 bg-[#2E443C] text-white font-bold rounded-xl uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-transform border border-white/10"
                >
                  Join The Circle
                </button>
              </div>
            </div>

            {/* FORM CONTAINER */}
            <div
              className={`${
                isFormOpen
                  ? "fixed inset-0 flex items-center justify-center p-4 z-[100] md:relative md:inset-auto md:p-0 md:flex md:mt-10"
                  : "hidden md:flex md:mt-10"
              }`}
            >
              <div className="w-full max-w-md bg-[#2E443C] md:bg-stone-900/40 backdrop-blur-2xl border border-white/10 rounded-[2rem] md:rounded-[2.5rem] p-7 md:p-10 space-y-6 md:space-y-8 relative shadow-2xl touch-none">
                {(isFormOpen || isSuccess) && (
                  <button
                    onClick={() => handleToggleForm(false)}
                    className="absolute top-6 right-6 text-stone-400 font-mono text-[10px] tracking-widest border border-white/10 px-3 py-1 rounded-full hover:text-white transition-colors"
                  >
                    {isSuccess ? "RESET" : "CLOSE"}
                  </button>
                )}

                <div className="space-y-1 md:space-y-2 pt-2 md:pt-4">
                  <p className="font-mono text-[9px] md:text-[10px] text-stone-400 uppercase tracking-[0.4em]">
                    Limited Collection 2026
                  </p>
                  <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                    {isSuccess ? "Welcome Home." : "Early Access."}
                  </h2>
                </div>

                {isSuccess ? (
                  <div className="py-4 text-stone-200 font-serif italic leading-relaxed text-base md:text-lg animate-in fade-in slide-in-from-bottom-2">
                    {msg}
                  </div>
                ) : (
                  <form
                    key={formKey}
                    onSubmit={handleSubmit}
                    className="space-y-5 md:space-y-6"
                  >
                    <div className="space-y-4">
                      <div className="border-b border-white/20 focus-within:border-white transition-all">
                        <label className="block text-[8px] md:text-[9px] text-stone-400 uppercase tracking-widest mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          name="userName"
                          required
                          placeholder="YOUR NAME"
                          className="w-full pb-3 md:pb-4 bg-transparent text-white font-mono text-sm placeholder-stone-600 outline-none"
                        />
                      </div>
                      <div className="border-b border-white/20 focus-within:border-white transition-all">
                        <label className="block text-[8px] md:text-[9px] text-stone-400 uppercase tracking-widest mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          name="userEmail"
                          required
                          placeholder="YOUR EMAIL"
                          className="w-full pb-3 md:pb-4 bg-transparent text-white font-mono text-sm placeholder-stone-600 outline-none"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-white text-[#2E443C] py-4 md:py-5 rounded-full font-black uppercase tracking-[0.2em] text-[10px] hover:bg-stone-200 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {loading ? "SAVING SPACE..." : "RESERVE YOUR SPOT"}
                    </button>
                  </form>
                )}

                <div className="flex justify-between items-center font-mono text-[9px] text-stone-400/60 uppercase tracking-widest pt-2">
                  <span>EST. 2026</span>
                  <span>CURATED DESIGN</span>
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
