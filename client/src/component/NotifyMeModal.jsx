import { useState } from "react";
import { getApiUrl } from "../config/appUrls";

const NotifyMeModal = ({ productName, productId, onClose }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (name.trim().length < 2) {
      setError("Please enter your name");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/contact/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim().slice(0, 100),
          email,
          mobile,
          subject: "Product Inquiry",
          message: `Please notify me when "${productName}" (Product ID: ${productId}) is back in stock.`,
          productId,
          productName,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Something went wrong");
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-[#1c3026] border border-[#F5DEB3]/20 rounded-3xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="text-center py-4 space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#F5DEB3]/10 flex items-center justify-center mx-auto">
              <i className="fa-solid fa-check text-[#F5DEB3]"></i>
            </div>
            <p className="text-[#F5DEB3] font-serif text-lg">You're on the list</p>
            <p className="text-[#F5DEB3]/60 text-xs">
              We'll reach out the moment "{productName}" is back in stock.
            </p>
            <button
              onClick={onClose}
              className="w-full h-11 bg-[#F5DEB3] text-[#1c3026] rounded-full font-bold uppercase tracking-widest text-xs mt-2"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[#F5DEB3] font-serif text-lg">Notify me</p>
                <p className="text-[#F5DEB3]/60 text-xs mt-1">
                  We'll let you know the moment this is back in stock.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-[#F5DEB3]/50 hover:text-[#F5DEB3] shrink-0"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {error && (
              <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-[#F5DEB3]/60 mb-1.5">
                Your name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="w-full h-11 rounded-xl bg-white/5 border border-[#F5DEB3]/20 px-3 text-sm text-[#F5DEB3] placeholder:text-[#F5DEB3]/30 focus:outline-none focus:border-[#F5DEB3]/50"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-[#F5DEB3]/60 mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-11 rounded-xl bg-white/5 border border-[#F5DEB3]/20 px-3 text-sm text-[#F5DEB3] placeholder:text-[#F5DEB3]/30 focus:outline-none focus:border-[#F5DEB3]/50"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-[#F5DEB3]/60 mb-1.5">
                Mobile number
              </label>
              <input
                type="tel"
                required
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="10-digit number"
                className="w-full h-11 rounded-xl bg-white/5 border border-[#F5DEB3]/20 px-3 text-sm text-[#F5DEB3] placeholder:text-[#F5DEB3]/30 focus:outline-none focus:border-[#F5DEB3]/50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#F5DEB3] text-[#1c3026] rounded-full font-bold uppercase tracking-widest text-xs disabled:opacity-50"
            >
              {loading ? "Submitting..." : "Notify me"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default NotifyMeModal;
