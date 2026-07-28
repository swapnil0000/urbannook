import { useState, useRef, useEffect, useMemo } from "react";

/**
 * SetupShowcase — a continuously scrolling strip of large real-life customer
 * setup photos for the PDP, each with the reviewer's quote on a black gradient
 * banner (gold text) along the bottom.
 *
 * Performance model (why this can't hang the page):
 *  - The scroll is a single CSS `transform: translateX` keyframe animation on
 *    one flex track, running on the compositor thread. There is NO JS per frame
 *    (no requestAnimationFrame, no scrollLeft mutation), so the main thread
 *    stays free regardless of how many slides are shown.
 *  - The track holds the list duplicated EXACTLY 2×; animating to -50% lands on
 *    a pixel-identical position → seamless infinite loop.
 *  - Slides are not mounted until the section scrolls into view
 *    (IntersectionObserver) → no image requests fire on initial page load.
 *    `loading="lazy"` + `decoding="async"` back it up once mounted.
 *  - `will-change: transform` is set ONLY on the animating track.
 *
 * Interaction:
 *  - Hovering the strip pauses the scroll.
 *  - The hovered slide smoothly lifts/zooms above its neighbours. Leaving
 *    resumes the slow drift.
 *
 * Data:
 *  - `items` is an array of `{ url, quote, author }`. For now the PDP passes a
 *    hardcoded list. TODO(wiring): source these from review images flagged for
 *    the showcase (e.g. a `showInSetup` boolean on the review image, toggled
 *    from admin) mapped to `{ url, quote: review.desc, author: review.name }`.
 */
const SetupShowcase = ({
  items = [],
  eyebrow = "In Real Setups",
  heading = "Seen in",
  headingAccent = "your spaces.",
}) => {
  const sectionRef = useRef(null);
  const [inView, setInView] = useState(false);

  // Mount the slides only once the section approaches the viewport.
  useEffect(() => {
    if (inView) return;
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView]);

  // Exactly 2× so translateX(-50%) is a seamless seam.
  const loop = useMemo(
    () => (items.length ? [...items, ...items] : []),
    [items],
  );

  // Longer list → longer duration keeps the drift speed roughly constant.
  const duration = Math.max(28, items.length * 7);

  if (!items.length) return null;

  return (
    <section ref={sectionRef} className="mt-16">
      {/* Header — matches the PDP's dark-green / gold review section */}
      <div className="mb-8 px-4 lg:px-12">
        <span className="text-[#F5DEB3] font-bold tracking-[0.2em] uppercase text-[10px]">
          {eyebrow}
        </span>
        <h2 className="text-3xl lg:text-4xl font-serif text-white mt-2">
          {heading}{" "}
          <span className="italic text-[#F5DEB3]">{headingAccent}</span>
        </h2>
      </div>

      {/* Marquee. min-height reserves space so there's no layout shift before
          the slides mount. */}
      <div className="ss-marquee group">
        {inView && (
          <div
            className="ss-track"
            style={{ animationDuration: `${duration}s` }}
          >
            {loop.map((item, i) => (
              <figure className="ss-item" key={i}>
                <div className="ss-card">
                  <img
                    src={item.url}
                    alt={item.author ? `${item.author}'s setup` : ""}
                    loading="lazy"
                    decoding="async"
                    draggable="false"
                  />
                  {(item.quote || item.author) && (
                    <figcaption className="ss-cap">
                      {item.quote && <p className="ss-quote">“{item.quote}”</p>}
                      {item.author && (
                        <span className="ss-author">— {item.author}</span>
                      )}
                    </figcaption>
                  )}
                </div>
              </figure>
            ))}
          </div>
        )}

        {/* Soft fade at both edges */}
        <span className="ss-fade ss-fade-l" aria-hidden="true" />
        <span className="ss-fade ss-fade-r" aria-hidden="true" />
      </div>

      <style>{`
        .ss-marquee {
          position: relative;
          overflow: hidden;
          padding: 34px 0;
          box-sizing: border-box;
          min-height: 428px; /* card height (360) + vertical padding */
        }
        .ss-track {
          display: flex;
          gap: 0;
          width: max-content;
          will-change: transform;
          animation-name: ssScroll;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        .ss-marquee:hover .ss-track { animation-play-state: paused; }

        .ss-item { flex: 0 0 auto; margin: 0; }

        /* One large slide dominates the viewport (~one clearly visible on
           mobile, with a peek of the next). */
        .ss-card {
          position: relative;
          width: min(88vw, 500px);
          height: 360px;
          overflow: hidden;
          transform: scale(1);
          transition: transform .5s cubic-bezier(.2,.8,.2,1),
                      box-shadow .5s ease;
        }
        .ss-card img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        /* Black banner rising from the bottom with the gold/yellow review text */
        .ss-cap {
          position: absolute;
          left: 0; right: 0; bottom: 0;
          padding: 46px 20px 18px;
          background: linear-gradient(to top,
            rgba(0,0,0,.94) 0%,
            rgba(0,0,0,.82) 45%,
            rgba(0,0,0,0) 100%);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .ss-quote {
          margin: 0;
          color: #F5DEB3;
          font: 500 14.5px/1.5 'Georgia', serif;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .ss-author {
          color: #C8A96E;
          font: 700 10.5px/1 'Manrope', system-ui, sans-serif;
          letter-spacing: .12em;
          text-transform: uppercase;
        }

        /* Hovered slide lifts above neighbours with a smooth zoom + shadow */
        .ss-item:hover { position: relative; z-index: 5; }
        .ss-item:hover .ss-card {
          transform: scale(1.05);
          box-shadow: 0 24px 55px rgba(0,0,0,.55);
        }

        /* Edge fades */
        .ss-fade {
          position: absolute;
          top: 0; bottom: 0;
          width: 80px;
          pointer-events: none;
          z-index: 6;
        }
        .ss-fade-l { left: 0;  background: linear-gradient(90deg, #1c3026 0%, rgba(28,48,38,0) 100%); }
        .ss-fade-r { right: 0; background: linear-gradient(270deg, #1c3026 0%, rgba(28,48,38,0) 100%); }

        @keyframes ssScroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }

        @media (prefers-reduced-motion: reduce) {
          .ss-track { animation: none; }
        }
      `}</style>
    </section>
  );
};

export default SetupShowcase;
