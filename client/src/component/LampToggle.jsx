import { useState } from "react";

const toList = (s) => (Array.isArray(s) ? s : [s]);

const useFallbackSrc = (sources) => {
  const list = toList(sources);
  const [idx, setIdx] = useState(0);
  return {
    src: list[idx],
    onError: () => setIdx((i) => (i < list.length - 1 ? i + 1 : i)),
  };
};

const LampToggle = ({
  onSrc,
  offSrc,
  alt = "Lamp",
  glowColor = "rgba(255, 90, 30, 0.55)",
  className = "",
}) => {
  const [on, setOn] = useState(false);
  const offImg = useFallbackSrc(offSrc);
  const onImg = useFallbackSrc(onSrc);

  return (
    <div
      className={`relative inline-flex flex-col items-center gap-6 ${className}`}
    >
      <div className="relative isolate">
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 -m-16 rounded-full blur-3xl transition-opacity duration-500 ease-out ${
            on ? "opacity-100" : "opacity-0"
          }`}
          style={{
            background: `radial-gradient(circle, ${glowColor} 0%, transparent 65%)`,
          }}
        />

        <img
          {...offImg}
          alt={alt}
          loading="eager"
          className={`relative z-10 block w-full max-w-md select-none transition-opacity duration-500 ease-in-out ${
            on ? "opacity-0" : "opacity-100"
          }`}
          draggable={false}
        />

        <img
          {...onImg}
          alt=""
          aria-hidden
          className={`absolute inset-0 z-10 w-full max-w-md select-none transition-opacity duration-500 ease-in-out ${
            on ? "opacity-100" : "opacity-0"
          }`}
          draggable={false}
        />
      </div>

      <button
        type="button"
        onClick={() => setOn((o) => !o)}
        aria-pressed={on}
        aria-label={on ? "Turn lamp off" : "Turn lamp on"}
        className={`group relative h-14 w-14 rounded-full border-2 transition-all duration-300 ease-out active:scale-95 ${
          on
            ? "border-orange-500 bg-orange-500/20 shadow-[0_0_30px_rgba(255,90,30,0.7)]"
            : "border-gray-500 bg-gray-800/40 hover:border-gray-300"
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          className={`absolute inset-0 m-auto h-6 w-6 transition-colors ${
            on ? "text-orange-400" : "text-gray-300"
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18.36 6.64A9 9 0 1 1 5.64 6.64" />
          <line x1="12" y1="2" x2="12" y2="12" />
        </svg>
      </button>

      <p
        className={`text-[10px] uppercase tracking-[0.25em] transition-colors ${
          on ? "text-orange-400" : "text-gray-400"
        }`}
      >
        {on ? "Power on" : "Tap to power on"}
      </p>
    </div>
  );
};

export default LampToggle;
