import { useEffect, useRef, useState } from 'react';
import { useInView } from '../motion';

/** Number that eases 0→value the first time it scrolls into view. */
const CountUp = ({ to = 0, suffix = '', duration = 1.4, decimals = 0, group = false }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setVal(to); return; }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setVal(to * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);
  const shown = group ? Math.round(val).toLocaleString('en-IN') : val.toFixed(decimals);
  return <span ref={ref}>{shown}{suffix}</span>;
};

export default CountUp;
