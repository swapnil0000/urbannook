import { useState, useEffect } from "react";
import WaitListBanner from "../../public/assets/WaitListBanner.png";
import axios from "axios";
import { abusiveWords } from "../data/constant";

const WaitListMobile = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formState, setFormState] = useState({
    msg: "",
    loading: false,
    isSuccess: false,
  });
  const [formKey, setFormKey] = useState(0);
  const [inputs, setInputs] = useState({ userName: "", userEmail: "" });
  const [inputError, setInputError] = useState({ userName: false, userEmail: false });

  // --- 1. sanitize text
  const sanitize = (text) =>
    text.toLowerCase().replace(/[^a-z\u0900-\u097F ]/g, "");

  // --- 2. check abusive words
  const containsAbusiveWords = (text) => {
    if (!text) return false;
    const cleanedText = sanitize(text);
    return abusiveWords.some((word) => cleanedText.includes(word));
  };

  useEffect(() => {
    document.body.style.overflow =
      isFormOpen && window.innerWidth < 768 ? "hidden" : "unset";
  }, [isFormOpen]);

  const handleToggleForm = (open) => {
    if (!open) {
      setFormState({ msg: "", loading: false, isSuccess: false });
      setFormKey((prev) => prev + 1);
      setInputs({ userName: "", userEmail: "" });
      setInputError({ userName: false, userEmail: false });
    }
    setIsFormOpen(open);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setInputs((prev) => ({ ...prev, [name]: value }));

    // Real-time abusive word validation
    setInputError((prev) => ({
      ...prev,
      [name]: containsAbusiveWords(value),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormState((prev) => ({ ...prev, loading: true }));

    const { userName,userEmail } = inputs;

    try {
      const { data } = await axios.post(
        `https://api.urbannook.in/api/v1/join/waitlist`,
        { userName, userEmail }
      );

      setFormState({
        msg: data.message,
        loading: false,
        isSuccess: data.success,
      });
    } catch (err) {
      setFormState({
        msg: `Registry Error - ${err?.message}. Please try again.`,
        loading: false,
        isSuccess: false,
      });
    }
  };

  return (
    <section className="fixed inset-0 lg:relative lg:h-[calc(100vh-4rem)] lg:max-h-[900px] mx-2 my-2 md:mx-4 md:my-4 rounded-[2.5rem] md:rounded-[3.5rem] overflow-hidden bg-[#1a2822] shadow-2xl flex items-center">
      {/* --- BACKGROUND --- */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img
          src={WaitListBanner}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src =
              "https://images.unsplash.com/photo-1513519247388-193ad5130246?q=80&w=2500";
          }}
          alt="Aesthetic Home Interior"
          className="w-full h-full object-cover opacity-80 lg:opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#2E443C]/20 via-[#2E443C]/60 to-[#1a2822] lg:bg-gradient-to-r lg:from-[#2E443C] lg:via-[#2E443C]/40 lg:to-transparent"></div>
      </div>

      {/* --- CONTENT --- */}
      <div className="relative z-10 w-full h-full lg:h-auto px-6 md:px-12 lg:px-24">
        <div className="max-w-7xl mx-auto h-full lg:h-auto flex flex-col lg:items-start justify-start lg:justify-center">
          <div className="w-full max-w-xl h-full lg:h-auto flex flex-col lg:block">
            {/* HEADLINE */}
            <div
              className={`flex-grow lg:flex-grow-0 flex flex-col lg:block transition-all duration-500 ${
                isFormOpen
                  ? "max-md:opacity-0 max-md:pointer-events-none"
                  : "opacity-100"
              }`}
            >
              <div className="pt-[6dvh] lg:pt-0 text-center lg:text-left space-y-4 flex flex-col items-center">
                <img className="w-20 h-20" src="/assets/blacklogo.webp" alt="logo" />
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm mb-2 lg:mb-4">
                  <span
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ backgroundColor: "#2E443C" }}
                  ></span>
                  <span className="text-[10px] text-stone-200 uppercase tracking-[0.3em] font-medium">
                    Launching Soon
                  </span>
                </div>
                <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter leading-none">
                  URBAN<span className="text-[#F5DEB3]">NOOK</span>
                </h1>
                <p className="text-md md:text-3xl text-stone-200 font-serif italic mt-5">
                  Turn a house into your
                  <span className="text-[#F5DEB3] border-b border-stone-600 ml-2">
                    Urban Nook.
                  </span>
                </p>
              </div>

              <div className="flex-col flex-grow flex items-center justify-center lg:hidden gap-3">
                <div className="text-center space-y-2 mb-4">
                  <p className="font-serif italic text-xl tracking-wide text-[#F5DEB3]">
                    A limited debut collection.
                  </p>
                  <p className="font-mono text-[8px] text-stone-200  uppercase tracking-[0.2em] leading-relaxed max-w-[280px] mx-auto">
                    Enter the circle for early access and member-only pricing.
                  </p>
                </div>
                <button
                  onClick={() => handleToggleForm(true)}
                  className=" min-w-[200px] py-[15px] bg-white text-[#2e443c] font-bold rounded-full uppercase tracking-widest text-[10px] shadow-2xl active:scale-95 transition-all"
                >
                  LET ME IN
                  <i className="fa-solid fa-arrow-right text-black"></i>
                </button>
              </div>

              <div className="h-[15dvh] lg:hidden"></div>
            </div>

            {/* FORM */}
            <div
              className={`${
                isFormOpen
                  ? "fixed inset-0 flex items-center justify-center p-4 z-[100] lg:relative lg:inset-auto lg:p-0 lg:flex lg:mt-10"
                  : "hidden lg:flex lg:mt-10"
              }`}
            >
              <div className="w-full max-w-md bg-[#1a2822]/95 lg:bg-stone-900/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 lg:p-10 space-y-3 relative shadow-2xl">
                {(isFormOpen || formState.isSuccess) && (
                  <button
                    onClick={() => handleToggleForm(false)}
                    className="absolute top-6 right-8 text-[#F5DEB3] font-mono text-[10px] tracking-widest border border-white/10 px-3 py-1 rounded-full hover:text-white transition-colors"
                  >
                    {formState.isSuccess ? "RESET" : "CLOSE"}
                  </button>
                )}

                <div className="pt-4 text-left">
                  <p className="font-mono text-[10px] text-[#F5DEB3] uppercase tracking-[0.05em]">
                    Urban Nook Waitlist
                  </p>
                  <h2 className="text-3xl font-bold text-white tracking-tight">
                    {formState.isSuccess ? "Welcome Home!" : "Your Invitation"}
                  </h2>
                </div>

                {formState.isSuccess ? (
                  <div className="relative py-4 min-h-[120px] animate-in fade-in slide-in-from-bottom-2 duration-700">
                    <div className="text-stone-200 font-mono text-xs leading-relaxed max-w-[220px]">
                      {formState.msg}
                    </div>
                  </div>
                ) : (
                  <form key={formKey} onSubmit={handleSubmit} className="space-y-6 text-left">
                    <div className="space-y-4">
                      <div
                        className={`border-b transition-all focus-within:border-white ${
                          inputError.userName ? "border-red-500" : "border-white/20"
                        }`}
                      >
                        <label className="block text-[9px] text-[#F5DEB3] uppercase tracking-widest mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          name="userName"
                          value={inputs.userName}
                          onChange={handleInputChange}
                          required
                          placeholder="ENTER NAME"
                          className="w-full pb-4 bg-transparent text-white font-mono text-sm placeholder-stone-700 outline-none"
                        />
                      </div>
                      <div
                        className={`border-b transition-all focus-within:border-white ${
                          inputError.userEmail ? "border-red-500" : "border-white/20"
                        }`}
                      >
                        <label className="block text-[9px] text-[#F5DEB3] uppercase tracking-widest mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          name="userEmail"
                          value={inputs.userEmail}
                          onChange={handleInputChange}
                          required
                          placeholder="ENTER EMAIL"
                          className="w-full pb-4 bg-transparent text-white font-mono text-sm placeholder-stone-700 outline-none"
                        />
                      </div>
                    </div>

                    {formState.msg && (
                      <p className="text-red-500 text-xs font-mono">{formState.msg}</p>
                    )}

                    <button
                      type="submit"
                      disabled={formState.loading}
                      className="w-full bg-white text-black py-5 rounded-full font-black uppercase tracking-[0.2em] text-[10px] hover:bg-stone-200 active:scale-95 disabled:opacity-50 transition-all"
                    >
                      {formState.loading ? "PROCESSING..." : "JOIN THE CIRCLE"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WaitListMobile;
