import { useEffect, useRef, useState, memo, Fragment } from "react";

/**
 * Product comparison section — "UrbanNook vs Others".
 * Ported from the Claude Design spec (glass card, inset gold column,
 * scroll-triggered stagger reveal, hover glow-pulse, shimmer sweep),
 * rebuilt with a flexbox layout so the highlighted column is one
 * continuous panel (header + all rows) instead of a CSS-grid row-span.
 * Content is bespoke marketing copy for the caliper lamp; keyed by a
 * lowercase keyword matched against the product name.
 *
 * Colour theme: the site's 4-shade palette — red / black / cream / white.
 * Red, black (ink) and cream (paper) come from index.css's existing tokens
 * via `rgb(var(--gl-x) / alpha)`; white is literal `#fff`/`rgba(255,255,255,x)`,
 * the same as the plain white used for cards elsewhere on the site. No colour
 * outside this set is used anywhere in this file.
 */
const COMPARISONS = {
  caliper: {
    eyebrow: "Why It's Different",
    title: "Built to a Higher Standard",
    badgeText: "Best Pick",
    caption:
      "Compared against typical desk-lighting alternatives in its category.",
    rows: [
      { label: "Wall mounted + Desk placed", other: "cross" },
      // Asterisk markers commented out per request — restore the `note` keys
      // (and the `footnotes` block below) together to bring the footnotes back.
      { label: "Adjustable Brightness Control", other: "cross" },
      {
        label: "Hassle-Free Replacement Guarantee",
        /* note: "*", */ other: "cross",
      },
      {
        label: "6-months electronics warranty",
        /* note: "**", */ other: "cross",
      },
      // { label: "Heat-resistant PETG build", other: "cross" },
      { label: "Wide light area + Heat vents", other: "cross" },
    ],
    // Footnotes keyed to the asterisks above. Commented out per request —
    // restore alongside the `note` markers on the rows above.
    // footnotes: [
    //   {
    //     marker: "*",
    //     text: "Shipping damage is replaced hassle-free.",
    //   },
    //   {
    //     marker: "**",
    //     text: "Warranty covers electronic components only — LED strip and power adapter. Coverage excludes physical or external damage, misuse, and unauthorised modification.",
    //   },
    // ],
  },
};

const GLOW_INTENSITY = 0.6; // 0–1, mirrors the design's "glowIntensity" prop

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M3 8.5L6.2 11.7L13 4.5"
      stroke="rgb(var(--gl-brand))"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const DashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path
      d="M3 8H13"
      stroke="rgb(var(--gl-ink) / 0.4)"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const CrossIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path
      d="M3.5 3.5L12.5 12.5M12.5 3.5L3.5 12.5"
      stroke="rgb(var(--gl-ink) / 0.35)"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const ComparisonTable = ({ productName }) => {
  const key = Object.keys(COMPARISONS).find((k) =>
    (productName || "").toLowerCase().includes(k),
  );
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [hoveredRow, setHoveredRow] = useState(null);

  useEffect(() => {
    if (!key || !sectionRef.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.2 },
    );
    io.observe(sectionRef.current);
    return () => io.disconnect();
  }, [key]);

  if (!key) return null;
  const data = COMPARISONS[key];

  return (
    <section
      ref={sectionRef}
      style={{
        position: "relative",
        background: "rgb(var(--gl-paper))",
        padding: "36px 24px",
        fontFamily: "'Manrope', sans-serif",
        overflow: "hidden",
        isolation: "isolate",
      }}
      className="mt-1 -mx-4 lg:-mx-12"
    >
      {/* Ambient blur blobs removed — they were designed for the original
          dark background and read as dirty smudges on the cream one. */}

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 640,
          margin: "0 auto",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div
            style={{
              fontSize: 12,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgb(var(--gl-brand))",
              opacity: 0.85,
              marginBottom: 1,
            }}
          >
            {data.eyebrow}
          </div>
          <h2
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontWeight: 600,
              lineHeight: 1.15,
              color: "rgb(var(--gl-ink) / 0.92)",
              margin: 0,
            }}
            className="text-[28px] lg:text-[40px]"
          >
            {data.title}
          </h2>
        </div>

        {/*
          Three independent boxes with a visible gap between them — no
          shared outer card, no overlap/covering trickery. Real CSS Grid
          still used underneath so row heights stay in sync across columns
          (a multi-line label in col 1 keeps col 2/3 rows aligned), with an
          explicit grid-template-rows + explicit gridRow on every cell so
          nothing depends on the auto-placement algorithm.
        */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.3fr 1fr 1fr",
            gridTemplateRows: `repeat(${data.rows.length + 1}, auto)`,
          }}
        >
          {/* Accent box — plain rectangle, squared corners (site-wide — every
              card/panel elsewhere uses rounded-none), no overlap, no border. */}
          <div
            style={{
              gridColumn: "2",
              gridRow: `1 / -1`,
              position: "relative",
              overflow: "hidden",
              borderRadius: 0,
              // Full solid red fill, with a restrained glass-highlight layer
              // ON TOP of it (not instead of it) — a soft white diagonal
              // sheen and a slow shimmer sweep, both low-opacity so the panel
              // still reads as solidly red against the white columns either
              // side of it, not washed out or translucent.
              background: "rgb(var(--gl-brand))",
              zIndex: 2,
            }}
          >
            {/* Glass highlight — diagonal sheen, fixed (no animation) */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(115deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 35%, rgba(255,255,255,0) 65%, rgba(255,255,255,0.08) 100%)",
                pointerEvents: "none",
              }}
            />
            {/* Slow-floating shimmer band — the one animated element, kept
                subtle (8% peak opacity) so it reads as glass, not a flashing
                light. */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "60%",
                height: "100%",
                background:
                  "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0) 100%)",
                filter: "blur(20px)",
                animation: "ppc-shimmer 11s ease-in-out infinite",
                animationDelay: "0.5s",
                pointerEvents: "none",
              }}
            />
          </div>

          {/*
            Column 1 box — spans its own track PLUS the accent column
            ("1 / 3") instead of a fixed pixel margin, so it always reaches
            all the way to column 3's edge and the two side boxes meet
            (fully overlap) under the accent column regardless of screen
            width. Accent sits at zIndex:2 on top, so only its own rounded
            corners are visible in that region — this is just the fill
            showing through the accent's corner notch, same as before, just
            no longer a fragile fixed-px guess.
          */}
          <div
            style={{
              gridColumn: "1 / 3",
              gridRow: `1 / -1`,
              background: "#fff",
              border: "1px solid transparent",
              zIndex: 1,
            }}
          />

          {/* Column 3 box — mirrored: spans "2 / 4", meeting column 1's box under the accent column. */}
          <div
            style={{
              gridColumn: "2 / 4",
              gridRow: `1 / -1`,
              background: "#fff",
              zIndex: 1,
              border: "1px solid transparent",
            }}
          />

          {/* ── Header row (grid row 1) ── */}
          <div
            style={{
              gridColumn: "1",
              gridRow: "1",
              padding: "24px 24px 2px",
              position: "relative",
              zIndex: 2,
            }}
          />

          <div
            style={{
              gridColumn: "2",
              gridRow: "1",
              // padding: "20px 20px 20px",
              textAlign: "center",
              position: "relative",
              zIndex: 2,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            {/* <div
                style={{
                  background: "linear-gradient(135deg, rgb(var(--gl-ink)), rgb(0 0 0))",
                  color: "rgb(var(--gl-brand))",
                  fontWeight: 700,
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  padding: "6px 14px",
                  borderRadius: 999,
                  boxShadow: "0 6px 14px rgb(var(--gl-ink) / 0.25), inset 0 1px 0 rgb(var(--gl-ink) / 0.08)",
                  whiteSpace: "nowrap",
                }}
              >
                {data.badgeText}
              </div> */}
            <img
              src="/assets/logo_only.webp"
              alt="UrbanNook"
              style={{
                width: 90,
                height: 90,
                objectFit: "contain",
                display: "block",
              }}
            />
          </div>

          <div
            style={{
              gridColumn: "3",
              gridRow: "1",
              padding: "24px 24px 2px",
              textAlign: "center",
              position: "relative",
              zIndex: 2,
            }}
          >
            <div
              style={{
                fontWeight: 600,
                fontSize: 16,
                letterSpacing: "0.02em",
                color: "rgb(var(--gl-ink) / 0.45)",
              }}
            >
              Others
            </div>
          </div>

          {/* ── Data rows (grid rows 2..N+1) ── */}
          {data.rows.map((row, i) => {
            const isHovered = hoveredRow === i;
            const delayMs = i * 70;
            const gridRow = i + 2;
            const enter = {
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0px)" : "translateY(18px)",
            };
            // Flat white rows, separated only by the border line — the
            // zebra tint at 2.5% opacity read as a dirty grey smear rather
            // than a deliberate stripe.
            const rowBg = isHovered
              ? "rgb(var(--gl-ink) / 0.05)"
              : "transparent";
            const borderTopLight =
              i === 0 ? "none" : "1px solid rgb(var(--gl-ink) / 0.08)";
            const rowHandlers = {
              onMouseEnter: () => setHoveredRow(i),
              onMouseLeave: () => setHoveredRow(null),
            };
            const glowAlpha = 0.35 * GLOW_INTENSITY + 0.15;
            const glowBlur = 18 * GLOW_INTENSITY + 6;
            const glowSpread = 4 * GLOW_INTENSITY + 2;

            return (
              <Fragment key={i}>
                <div
                  {...rowHandlers}
                  style={{
                    gridColumn: "1",
                    gridRow,
                    position: "relative",
                    zIndex: 2,
                    display: "flex",
                    alignItems: "center",
                    padding: "18px 24px",
                    borderTop: borderTopLight,
                    background: rowBg,
                    cursor: "default",
                    transitionProperty: "background, opacity, transform",
                    transitionDuration: "320ms, 520ms, 520ms",
                    transitionTimingFunction:
                      "ease, cubic-bezier(0.22,1,0.36,1), cubic-bezier(0.22,1,0.36,1)",
                    transitionDelay: `0ms, ${delayMs}ms, ${delayMs}ms`,
                    ...enter,
                  }}
                >
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 500,
                      color: isHovered
                        ? "rgb(var(--gl-brand))"
                        : "rgb(var(--gl-ink) / 0.88)",
                      transition: "color 280ms ease",
                      letterSpacing: "0.01em",
                    }}
                  >
                    {row.label}
                    {row.note && (
                      <sup
                        style={{
                          marginLeft: 2,
                          color: "rgb(var(--gl-brand))",
                          fontWeight: 700,
                          fontSize: 11,
                        }}
                      >
                        {row.note}
                      </sup>
                    )}
                  </span>
                </div>

                <div
                  {...rowHandlers}
                  style={{
                    gridColumn: "2",
                    gridRow,
                    position: "relative",
                    zIndex: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "18px 12px",
                    cursor: "default",
                    ...enter,
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      // White circle again — the accent column is back to a
                      // solid red fill, so a red circle would vanish into it.
                      // The shadow this time is a small, low-opacity, ink-
                      // tinted one (a normal card-shadow, not the old 10px
                      // black blur) since white-on-red already has its own
                      // contrast — the shadow is just for depth, not doing
                      // the work of making the circle visible at all.
                      background: "#fff",
                      transform: isHovered
                        ? "scale(1.18)"
                        : visible
                          ? "scale(1)"
                          : "scale(0.4)",
                      opacity: visible ? 1 : 0,
                      transition: `transform 420ms cubic-bezier(0.34,1.56,0.64,1) ${delayMs}ms, opacity 420ms ease ${delayMs}ms, box-shadow 320ms ease`,
                      boxShadow: isHovered
                        ? `0 0 ${glowBlur}px ${glowSpread}px rgb(var(--gl-ink) / ${glowAlpha})`
                        : "0 2px 5px rgb(var(--gl-ink) / 0.18)",
                      animation: isHovered
                        ? "ppc-glowpulse 1.4s ease-in-out infinite"
                        : "none",
                    }}
                  >
                    <CheckIcon />
                  </div>
                </div>

                <div
                  {...rowHandlers}
                  style={{
                    gridColumn: "3",
                    gridRow,
                    position: "relative",
                    zIndex: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "18px 24px",
                    borderTop: borderTopLight,
                    background: rowBg,
                    cursor: "default",
                    transitionProperty: "background, opacity, transform",
                    transitionDuration: "320ms, 520ms, 520ms",
                    transitionTimingFunction:
                      "ease, cubic-bezier(0.22,1,0.36,1), cubic-bezier(0.22,1,0.36,1)",
                    transitionDelay: `0ms, ${delayMs}ms, ${delayMs}ms`,
                    ...enter,
                  }}
                >
                  {row.other === "dash" ? <DashIcon /> : <CrossIcon />}
                </div>
              </Fragment>
            );
          })}
        </div>

        <p
          style={{
            textAlign: "center",
            margin: "28px 0 0",
            fontSize: 10,
            color: "rgb(var(--gl-ink) / 0.45)",
          }}
        >
          {data.caption}
        </p>

        {/* Footnotes — the asterisked qualifications on the warranty and
            replacement rows. Deliberately set quieter and smaller than the
            caption: legally necessary, but not competing with the table. */}
        {data.footnotes?.length > 0 && (
          <div
            style={{
              maxWidth: 760,
              margin: "18px auto 0",
              paddingTop: 16,
              borderTop: "1px solid rgb(var(--gl-ink) / 0.08)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {data.footnotes.map((fn) => (
              <p
                key={fn.marker}
                style={{
                  display: "flex",
                  gap: 8,
                  margin: 0,
                  fontSize: 11.5,
                  lineHeight: 1.55,
                  color: "rgb(var(--gl-ink) / 0.38)",
                }}
              >
                <span
                  style={{
                    color: "rgb(var(--gl-brand) / 0.55)",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {fn.marker}
                </span>
                <span>{fn.text}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default memo(ComparisonTable);
