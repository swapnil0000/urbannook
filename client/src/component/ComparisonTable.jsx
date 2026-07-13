import { useEffect, useRef, useState, memo, Fragment } from "react";

/**
 * Product comparison section — "UrbanNook vs Others".
 * Ported from the Claude Design spec (glass card, inset gold column,
 * scroll-triggered stagger reveal, hover glow-pulse, shimmer sweep),
 * rebuilt with a flexbox layout so the highlighted column is one
 * continuous panel (header + all rows) instead of a CSS-grid row-span.
 * Content is bespoke marketing copy for the caliper lamp; keyed by a
 * lowercase keyword matched against the product name.
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
      { label: "Easy replacement. No questions asked", note: "*", other: "cross" },
      { label: "6-months warranty", note: "**", other: "cross" },
      { label: "Heat-resistant PETG build", other: "cross" },
      { label: "Wide light area + Heat vents", other: "cross" },
    ],
    // Footnotes keyed to the asterisks above. Scope/exclusions are stated
    // explicitly so the warranty and replacement claims in the table are not
    // read as unconditional.
    footnotes: [
      {
        marker: "*",
        text: "Replacement coverage applies to electronic components only. Damage to 3D-printed structural parts is not eligible for replacement. In the event of damage sustained in transit, photographic or video evidence of the packaging and product, captured on receipt, is required to process a replacement claim.",
      },
      {
        marker: "**",
        text: "Warranty covers electronic components only — LED strip and power adapter. Coverage excludes physical or external damage, misuse, and unauthorised modification.",
      },
    ],
  },
};

const GLOW_INTENSITY = 0.6; // 0–1, mirrors the design's "glowIntensity" prop
const SHIMMER_DURATION = 11; // seconds — slow float
// Uniform tint across the whole column — no top-to-bottom falloff, so the
// gold reads as one continuous surface behind header + every row.
const GOLD_FILL = 0.16 + 0.08 * GLOW_INTENSITY;

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M3 8.5L6.2 11.7L13 4.5"
      stroke="#2e2013"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const DashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M3 8H13" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const CrossIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path
      d="M3.5 3.5L12.5 12.5M12.5 3.5L3.5 12.5"
      stroke="rgba(255,255,255,0.35)"
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
        background: "#2e443c",
        padding: "96px 24px",
        fontFamily: "'Manrope', sans-serif",
        overflow: "hidden",
        isolation: "isolate",
      }}
      className="mt-16 -mx-4 lg:-mx-12"
    >
      {/* Floating ambient blobs */}
      {/* Top-left bubble — commented out per request, keep for later reference
      <div
        style={{
          position: "absolute",
          top: "-120px",
          left: "-100px",
          width: 420,
          height: 420,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(245,222,179,0.30) 0%, rgba(245,222,179,0) 70%)",
          filter: "blur(10px)",
          animation: "ppc-blobfloat 12s ease-in-out infinite",
          zIndex: 0,
        }}
      />
      */}
      <div
        style={{
          position: "absolute",
          bottom: "-160px",
          right: "-120px",
          width: 520,
          height: 520,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(20,40,32,0.9) 0%, rgba(20,40,32,0) 70%)",
          filter: "blur(20px)",
          animation: "ppc-blobfloat 15s ease-in-out infinite reverse",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "50%",
          width: 360,
          height: 360,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(168,144,104,0.22) 0%, rgba(168,144,104,0) 70%)",
          filter: "blur(8px)",
          zIndex: 0,
        }}
      />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 640, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div
            style={{
              fontSize: 12,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#F5DEB3",
              opacity: 0.85,
              marginBottom: 14,
            }}
          >
            {data.eyebrow}
          </div>
          <h2
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontWeight: 600,
              lineHeight: 1.15,
              color: "rgba(255,255,255,0.92)",
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
          {/* Gold box — plain rectangle, own uniform rounded corners, no overlap, no border. */}
          <div
            style={{
              gridColumn: "2",
              gridRow: `1 / -1`,
              position: "relative",
              overflow: "hidden",
              borderRadius: 10,
              background: `rgba(245,222,179,${GOLD_FILL})`,
              boxShadow: "0 20px 40px -12px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.18)",
              zIndex: 2,
            }}
          >
            {/* Glossy diagonal overlay */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(115deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 30%, rgba(255,255,255,0) 70%, rgba(255,255,255,0.06) 100%)",
                pointerEvents: "none",
              }}
            />
            {/* Top hairline */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                background:
                  "linear-gradient(90deg, rgba(245,222,179,0) 0%, rgba(245,222,179,0.7) 50%, rgba(245,222,179,0) 100%)",
              }}
            />
            {/* Shimmer sweep — soft, blurred, slow-floating light band across the panel */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "60%",
                height: "100%",
                background:
                  "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.14) 50%, rgba(255,255,255,0) 100%)",
                filter: "blur(24px)",
                animation: `ppc-shimmer ${SHIMMER_DURATION}s ease-in-out infinite`,
                animationDelay: "0.5s",
                pointerEvents: "none",
              }}
            />
          </div>

          {/*
            Column 1 box — spans its own track PLUS the gold column
            ("1 / 3") instead of a fixed pixel margin, so it always reaches
            all the way to column 3's edge and the two side boxes meet
            (fully overlap) under the gold column regardless of screen
            width. Gold sits at zIndex:2 on top, so only its own rounded
            corners are visible in that region — this is just the fill
            showing through gold's corner notch, same as before, just no
            longer a fragile fixed-px guess.
          */}
          <div
            style={{
              gridColumn: "1 / 3",
              gridRow: `1 / -1`,
              background: "rgba(255,255,255,0.055)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid transparent",
              borderTopLeftRadius: 20,
              borderBottomLeftRadius: 20,
              zIndex: 1,
            }}
          />

          {/* Column 3 box — mirrored: spans "2 / 4", meeting column 1's box under the gold column. */}
          <div
            style={{
              gridColumn: "2 / 4",
              gridRow: `1 / -1`,
              background: "rgba(255,255,255,0.055)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              zIndex: 1,
              border: "1px solid transparent",
              borderTopRightRadius: 20,
              borderBottomRightRadius: 20,
            }}
          />

            {/* ── Header row (grid row 1) ── */}
            <div style={{ gridColumn: "1", gridRow: "1", padding: "28px 24px 20px", position: "relative", zIndex: 2 }} />

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
                  background: "linear-gradient(135deg,#2e443c,#1b2b24)",
                  color: "#F5DEB3",
                  fontWeight: 700,
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  padding: "6px 14px",
                  borderRadius: 999,
                  boxShadow: "0 6px 14px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)",
                  whiteSpace: "nowrap",
                }}
              >
                {data.badgeText}
              </div> */}
              <img
                src="/assets/logo_only.webp"
                alt="UrbanNook"
                style={{ width: 90, height: 90, objectFit: "contain", display: "block" }}
              />
            </div>

            <div
              style={{
                gridColumn: "3",
                gridRow: "1",
                padding: "26px 24px 20px",
                textAlign: "center",
                position: "relative",
                zIndex: 2,
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 16, letterSpacing: "0.02em", color: "rgba(255,255,255,0.45)" }}>
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
              const zebraTint = i % 2 === 1 ? "rgba(255,255,255,0.025)" : "transparent";
              const rowBg = isHovered ? "rgba(255,255,255,0.05)" : zebraTint;
              const borderTopLight = i === 0 ? "none" : "1px solid rgba(255,255,255,0.08)";
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
                        color: isHovered ? "#F5DEB3" : "rgba(255,255,255,0.88)",
                        transition: "color 280ms ease",
                        letterSpacing: "0.01em",
                      }}
                    >
                      {row.label}
                      {row.note && (
                        <sup
                          style={{
                            marginLeft: 2,
                            color: "#F5DEB3",
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
                        background: "linear-gradient(150deg, #F5DEB3, #a89068)",
                        transform: isHovered ? "scale(1.18)" : visible ? "scale(1)" : "scale(0.4)",
                        opacity: visible ? 1 : 0,
                        transition: `transform 420ms cubic-bezier(0.34,1.56,0.64,1) ${delayMs}ms, opacity 420ms ease ${delayMs}ms, box-shadow 320ms ease`,
                        boxShadow: isHovered
                          ? `0 0 ${glowBlur}px ${glowSpread}px rgba(245,222,179,${glowAlpha})`
                          : "0 4px 10px rgba(0,0,0,0.15)",
                        animation: isHovered ? "ppc-glowpulse 1.4s ease-in-out infinite" : "none",
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
            fontSize: 13,
            color: "rgba(255,255,255,0.45)",
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
              borderTop: "1px solid rgba(255,255,255,0.08)",
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
                  color: "rgba(255,255,255,0.38)",
                }}
              >
                <span style={{ color: "rgba(245,222,179,0.55)", fontWeight: 700, flexShrink: 0 }}>
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
