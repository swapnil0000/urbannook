import confetti from "canvas-confetti";

/**
 * Single hardened confetti pipeline for the whole app.
 *
 * Why this exists (instead of calling `confetti()` directly at each call
 * site, which is what we used to do):
 *
 * 1. OFF-MAIN-THREAD RENDERING. The default `confetti()` export runs all
 *    particle physics + canvas painting on the main thread — the same thread
 *    running React renders, the banner's requestAnimationFrame truck loop,
 *    and network callbacks. On low-end phones that contention is a visible
 *    hang: buttons freeze, animations stutter. `confetti.create(canvas,
 *    { useWorker: true })` moves the entire animation into a Web Worker
 *    drawing to an OffscreenCanvas whenever the browser supports it, and
 *    canvas-confetti silently falls back to main-thread rendering where it
 *    doesn't (older Safari) — so this is strictly an upgrade, never a break.
 *
 * 2. ONE CANVAS, CREATED ONCE. The default export lazily creates (and lays
 *    out) its canvas synchronously at first fire — a jank spike at exactly
 *    the moment the celebration should feel smooth. We create one
 *    full-viewport canvas up front on first use and reuse it forever.
 *
 * 3. DEVICE-SCALED PARTICLE BUDGET. 200 particles is fine on a desktop GPU
 *    and miserable on a 4-core phone. The budget scales down on low-end
 *    hardware (heuristic: core count / device memory where exposed).
 *
 * 4. RE-ENTRANCY GUARD. Rapid double-clicks used to stack two full particle
 *    systems on top of each other, doubling the load right when the device
 *    is busiest. Fires within the cooldown window are dropped.
 *
 * 5. ACCESSIBILITY. `disableForReducedMotion` makes every burst a no-op for
 *    users who've asked the OS for reduced motion.
 */

let instance = null;
const getInstance = () => {
  if (instance) return instance;
  const canvas = document.createElement("canvas");
  // Above every app surface (drawers use z-[9999], portals z-[200]) but
  // never intercepts input.
  canvas.style.cssText =
    "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:2147483000;";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  instance = confetti.create(canvas, { resize: true, useWorker: true });
  return instance;
};

// Rough low-end detection. Both signals are optional in the spec, so default
// to mid-range when absent rather than assuming fast.
const isLowEndDevice = () => {
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4; // GB, Chrome/Edge only
  return cores <= 4 || memory <= 2;
};

let lastFiredAt = 0;
const COOLDOWN_MS = 1200;

/**
 * The full multi-burst "cannon" celebration (free-shipping unlock).
 * Safe to call from anywhere — it self-throttles and never blocks.
 */
export const fireCelebrationConfetti = () => {
  const now = Date.now();
  if (now - lastFiredAt < COOLDOWN_MS) return;
  lastFiredAt = now;

  const fire = getInstance();
  const budget = isLowEndDevice() ? 90 : 200;
  const colors = ["#F5DEB3", "#1c3026", "#a89068", "#ffffff", "#4ade80", "#fbbf24"];
  const defaults = {
    origin: { y: 0.7 },
    colors,
    shapes: ["circle", "square", "star"],
    disableForReducedMotion: true,
  };
  const burst = (ratio, opts) =>
    fire({ ...defaults, ...opts, particleCount: Math.floor(budget * ratio) });

  burst(0.25, { spread: 26, startVelocity: 55 });
  burst(0.2, { spread: 60 });
  burst(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
  burst(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  burst(0.1, { spread: 120, startVelocity: 45 });
};

/**
 * Lighter single-burst variant (PDP add-to-cart). Same worker-backed canvas
 * and throttle, smaller footprint.
 */
export const fireAddToCartConfetti = () => {
  const now = Date.now();
  if (now - lastFiredAt < COOLDOWN_MS) return;
  lastFiredAt = now;

  getInstance()({
    particleCount: isLowEndDevice() ? 70 : 150,
    spread: 80,
    origin: { y: 0.6 },
    colors: ["#F5DEB3", "#1c3026", "#a89068", "#ffffff"],
    disableForReducedMotion: true,
  });
};
