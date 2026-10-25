import { useEffect, useRef } from 'react';
import { useSiteCampaign } from '../../hooks/useSiteCampaign';

// Site tokens only: gold (--gl-star), brand red (--gl-brand), paper (--gl-paper).
const PALETTE = ['243,195,59', '243,195,59', '230,51,41', '239,234,224'];

/**
 * A short (~3s), tasteful canvas firework celebration the first time a
 * visitor lands during the campaign — three bursts high in the viewport, then
 * it removes itself. Plays once per browser session per campaign. Skipped for
 * reduced-motion, on checkout, when the admin turned fireworks off, and on
 * phones unless the admin allowed mobile effects. No library: ~80 lines of
 * canvas, DPR-capped, and it stops its own animation loop when done.
 */
const FestiveFireworks = () => {
  const { can, active, isMobile } = useSiteCampaign();
  const canvasRef = useRef(null);
  const allowed = can('fireworks', { heavy: true });
  const campaignKey = useSiteCampaign().themeKey;

  useEffect(() => {
    if (!active || !allowed) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const key = `un_fireworks_${campaignKey}`;
    try {
      if (sessionStorage.getItem(key)) return undefined;
    } catch { /* private mode: just play */ }

    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const sparks = [];
    const rockets = [];
    const perBurst = isMobile ? 26 : 44;
    const launches = [
      { at: 250, x: 0.25 }, { at: 900, x: 0.72 }, { at: 1500, x: 0.48 },
    ];
    const start = performance.now();
    let raf;
    let nextLaunch = 0;
    let last = start;

    const burst = (x, y) => {
      const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
      for (let i = 0; i < perBurst; i += 1) {
        const a = (Math.PI * 2 * i) / perBurst + Math.random() * 0.2;
        const v = 1.2 + Math.random() * 2.4;
        sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, decay: 0.011 + Math.random() * 0.012, color });
      }
    };

    const frame = (now) => {
      const dt = Math.min(32, now - last) / 16.67;
      last = now;
      const t = now - start;
      while (nextLaunch < launches.length && t >= launches[nextLaunch].at) {
        const l = launches[nextLaunch];
        rockets.push({ x: W * l.x, y: H, ty: H * (0.18 + Math.random() * 0.2), vy: -(H / 52) });
        nextLaunch += 1;
      }
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';

      for (let i = rockets.length - 1; i >= 0; i -= 1) {
        const r = rockets[i];
        r.y += r.vy * dt;
        ctx.fillStyle = 'rgba(255,236,179,0.9)';
        ctx.fillRect(r.x - 1, r.y, 2, 6);
        if (r.y <= r.ty) { burst(r.x, r.y); rockets.splice(i, 1); }
      }
      for (let i = sparks.length - 1; i >= 0; i -= 1) {
        const s = sparks[i];
        s.vx *= 0.985; s.vy = s.vy * 0.985 + 0.028 * dt;
        s.x += s.vx * dt; s.y += s.vy * dt;
        s.life -= s.decay * dt;
        if (s.life <= 0) { sparks.splice(i, 1); continue; }
        ctx.fillStyle = `rgba(${s.color},${Math.max(0, s.life)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 1.5 * s.life + 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      if (nextLaunch >= launches.length && !rockets.length && !sparks.length) {
        ctx.clearRect(0, 0, W, H);
        canvas.style.display = 'none';
        // Marked on completion (not start) so React StrictMode's dev
        // double-mount can't swallow the one play.
        try { sessionStorage.setItem(key, '1'); } catch { /* ignore */ }
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [active, allowed, campaignKey, isMobile]);

  if (!active || !allowed) return null;
  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full z-[45] pointer-events-none" aria-hidden="true" />;
};

export default FestiveFireworks;
