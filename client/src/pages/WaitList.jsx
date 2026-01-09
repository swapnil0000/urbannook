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
      const res = await axios.post(`${serverProBaseUrl}/join/waitlist`, {
        userName:data?.userName,
        userEmail: data?.userEmail,
      });

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
    <section className="relative h-[97vh] lg:h-[calc(100vh-2rem)] lg:max-h-[900px] mx-2 my-2 md:mx-4 md:my-4 rounded-[2rem] md:rounded-[3.5rem] overflow-hidden shadow-2xl flex items-center bg-black">
      {/* --- BACKGROUND --- */}
      <div className="absolute inset-0 z-0">
        <img
          src={WaitListBanner}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src =
              "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=2500";
          }}
          alt="Urban Interior"
          className="w-full h-full object-cover opacity-80"
        />
        {/* Adjusted gradient for better text legibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent"></div>
      </div>

      <div className="relative z-10 w-full px-6 md:px-12 lg:px-24">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-start gap-12">
          <div className="w-full max-w-xl">
            {/* HEADLINE SECTION */}
            <div
              className={`transition-all duration-500 ${
                isFormOpen ? "max-md:opacity-0" : "opacity-100"
              }`}
            >
              <div className="text-center md:text-left space-y-4">
                {/* Coming Soon Tag */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                  <span className="text-[10px] text-white uppercase tracking-[0.3em] font-medium">
                    Coming Soon
                  </span>
                </div>

                <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter leading-none">
                  URBANNOOK
                </h1>
                <p className="text-2xl md:text-3xl text-stone-200 font-serif italic">
                  Turn a house into your{" "}
                  <span className="text-stone-400 border-b border-stone-600">
                    Urban Nook.
                  </span>
                </p>

                <button
                  onClick={() => handleToggleForm(true)}
                  className="md:hidden mt-10 w-full py-5 bg-white text-black font-bold rounded-xl uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-transform"
                >
                  Join Waitlist
                </button>
              </div>
            </div>

            {/* FORM CONTAINER - Sharp on Mobile */}
            <div
              className={`
              ${
                isFormOpen
                  ? "fixed inset-0 flex items-center justify-center p-4 z-[100] md:relative md:inset-auto md:p-0 md:flex md:mt-12"
                  : "hidden md:flex md:mt-12"
              }
            `}
            >
              {/* Added a solid-ish background for mobile to fix the blur bug */}
              <div className="w-full max-w-md bg-stone-900/90 md:bg-stone-900/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 md:p-10 space-y-8 relative shadow-2xl">
                {(isFormOpen || isSuccess) && (
                  <button
                    onClick={() => handleToggleForm(false)}
                    className="absolute top-6 right-8 text-stone-500 font-mono text-[10px] tracking-widest border border-stone-800 px-3 py-1 rounded-full hover:text-white transition-colors"
                  >
                    {isSuccess ? "RESET" : "CLOSE"}
                  </button>
                )}

                <div className="space-y-2 pt-4">
                  <p className="font-mono text-[10px] text-stone-500 uppercase tracking-[0.4em]">
                    Registry 2026
                  </p>
                  <h2 className="text-3xl font-bold text-white tracking-tight">
                    {isSuccess ? "Confirmed." : "Access Granted."}
                  </h2>
                </div>

                {isSuccess ? (
                  <div className="py-4 text-stone-200 font-serif italic leading-relaxed text-lg animate-in fade-in slide-in-from-bottom-2">
                    {msg}
                  </div>
                ) : (
                  <form
                    key={formKey}
                    onSubmit={handleSubmit}
                    className="space-y-6"
                  >
                    <div className="space-y-4">
                      <div className="border-b border-stone-700 focus-within:border-white transition-all">
                        <label className="block text-[9px] text-stone-500 uppercase tracking-widest mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          name="userName"
                          required
                          placeholder="ENTER NAME"
                          className="w-full pb-4 bg-transparent text-white font-mono text-sm placeholder-stone-500 outline-none"
                        />
                      </div>
                      <div className="border-b border-stone-700 focus-within:border-white transition-all">
                        <label className="block text-[9px] text-stone-500 uppercase tracking-widest mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          name="userEmail"
                          required
                          placeholder="ENTER EMAIL"
                          className="w-full pb-4 bg-transparent text-white font-mono text-sm placeholder-stone-500 outline-none"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-white text-black py-5 rounded-full font-black uppercase tracking-[0.2em] text-[10px] hover:bg-stone-200 transition-all active:scale-95 disabled:opacity-50"
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

          <div className="hidden lg:block lg:flex-1"></div>
        </div>
      </div>
    </section>
  );
};

export default WaitList;
