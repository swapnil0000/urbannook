import { useEffect, useState } from "react";

/**
 * A small bouncing "scroll down" chevron shown at the bottom of the screen
 * when the page has more content below the fold — disappears the moment the
 * visitor actually scrolls. Scroll handling is rAF-throttled so it can't be
 * the thing that slows the page down.
 */
const ScrollHint = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let ticking = false;

    const update = () => {
      const hasMoreBelow = document.documentElement.scrollHeight > window.innerHeight + 200;
      setVisible(hasMoreBelow && window.scrollY < 40);
      ticking = false;
    };

    const onScrollOrResize = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-40 pointer-events-none transition-opacity duration-300"
      aria-hidden="true"
    >
      <div className="w-10 h-10 rounded-full bg-ink text-white flex items-center justify-center shadow-lg animate-bounce">
        <i className="fa-solid fa-chevron-down text-sm"></i>
      </div>
    </div>
  );
};

export default ScrollHint;
