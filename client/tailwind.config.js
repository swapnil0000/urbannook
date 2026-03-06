/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand Colors (Your UrbanNook Colors)
        'brand-primary': '#a89068',      // Gold/Tan
        'brand-secondary': '#2e443c',    // Dark Green
        'brand-tertiary': '#F5DEB3',     // Wheat/Beige
        'brand-dark': '#1a2822',         // Darker Green
        'brand-light': '#f5f7f8',        // Light Gray
        
        // Semantic Colors (Status/Feedback)
        'success': '#15803D',
        'warning': '#D97706',
        'error': '#DC2626',
        'info': '#3B82F6',
        
        // Semantic Text Colors (Use these instead of white/black)
        'text-primary': '#1C1917',       // Main text color
        'text-secondary': '#44403C',     // Secondary text
        'text-tertiary': '#78716C',      // Tertiary text
        'text-muted': '#A8A29E',         // Muted/disabled text
        'text-inverse': '#FFFFFF',       // Text on dark backgrounds
        'text-on-brand': '#FFFFFF',      // Text on brand color backgrounds
        
        // Semantic Background Colors (Use these instead of white/black)
        'bg-primary': '#FFFFFF',         // Main background
        'bg-secondary': '#F5F5F4',       // Secondary background
        'bg-tertiary': '#E7E5E4',        // Tertiary background
        'bg-dark': '#2e443c',            // Dark background (brand)
        'bg-darker': '#1a2822',          // Darker background (brand)
        'bg-light': '#f5f7f8',           // Light background
        'bg-neutral-dark': '#121212',    // Neutral dark (for images, cards)
        'bg-overlay': 'rgba(0,0,0,0.4)', // Dark overlay
        'bg-overlay-light': 'rgba(255,255,255,0.1)', // Light overlay
        
        // Semantic Border Colors (Use these instead of white/black)
        'border-light': '#E7E5E4',
        'border-default': '#D6D3D1',
        'border-dark': '#A8A29E',
        'border-subtle': 'rgba(255,255,255,0.1)', // Subtle borders on dark
        'border-subtle-dark': 'rgba(0,0,0,0.1)',  // Subtle borders on light
        
        // Semantic Surface Colors (for cards, modals, etc)
        'surface-primary': '#FFFFFF',
        'surface-secondary': '#F5F5F4',
        'surface-dark': '#1a2822',
        'surface-elevated': '#FFFFFF',   // Elevated surfaces (modals, dropdowns)
        
        // Keep existing CSS variable colors for backward compatibility
        primary: "var(--color-primary)",
        secondary: "var(--color-secondary)",
        accent: "var(--color-accent)",
        bgPrimary: "var(--color-bg-primary)",
        bgSecondary: "var(--color-bg-secondary)",
        bgTertiary: "var(--color-bg-tertiary)",
        textPrimary: "var(--color-text-primary)",
        textSecondary: "var(--color-text-secondary)",
        textMuted: "var(--color-text-muted)",
        borderPrimary: "var(--color-border-primary)",
        borderSecondary: "var(--color-border-secondary)",
      },
      spacing: {
        '15': '3.75rem',
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
        '34': '8.5rem',
        '38': '9.5rem',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
        '6xl': '3rem',
      },
      fontSize: {
        '2xs': '0.625rem',
      },
      letterSpacing: {
        'ultrawide': '0.2em',
        'megawide': '0.3em',
      },
    },
  },
  plugins: [],
}