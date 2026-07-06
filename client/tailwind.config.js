/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary Colors
        primary: "var(--color-primary)",
        secondary: "var(--color-secondary)",
        accent: "var(--color-accent)",
        
        // Background Colors
        bgPrimary: "var(--color-bg-primary)",
        bgSecondary: "var(--color-bg-secondary)",
        bgTertiary: "var(--color-bg-tertiary)",
        
        // Text Colors
        textPrimary: "var(--color-text-primary)",
        textSecondary: "var(--color-text-secondary)",
        textMuted: "var(--color-text-muted)",
        
        // Border Colors
        borderPrimary: "var(--color-border-primary)",
        borderSecondary: "var(--color-border-secondary)",
        
        // Status Colors
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        error: "var(--color-error)",
        info: "var(--color-info)",

        // ===== Editorial "2040" palette (Urban Nook redesign) =====
        un: {
          ink: "#141414",       // near-black ink
          ink2: "#1F1E1C",
          cream: "#FFFFFF",      // pure white background (per request — no off-white)
          cream2: "#F2F2F2",     // neutral light grey (skeletons only)
          red: "#E63329",        // accent
          red2: "#C9281F",
          grey: "#8C8779",
          greyd: "#5B554D",
          line: "#E6E6E6",       // neutral hairline border
          lined: "#33312D",
        },

        // ===== GullyLabs-style palette (chosen direction) =====
        brand:   "#003BD0",   // primary — buttons, links, accents
        brandHi: "#0F52DC",
        sale:    "#D62828",   // discounts / sale ONLY
        star:    "#F3C33B",   // ratings
        save:    "#108474",   // savings (teal)
        ink:     "#202223",   // near-black text
        paper:   "#FFFFFF",
        muted:   "#7B7B7B",
        faint:   "#9A9A9A",
        hair:    "#EBEBEB",   // hairline borders
      },
      fontFamily: {
        anton: ["Anton", "ui-sans-serif", "sans-serif"],
        archivo: ["Archivo", "ui-sans-serif", "sans-serif"],
        inter: ["Inter", "ui-sans-serif", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
        jakarta: ['"Plus Jakarta Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
}