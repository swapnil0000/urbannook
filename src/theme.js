// Clean, modern theme based on the provided UI
export const theme = {
  colors: {
    primary: '#FF6B6B',      // Coral red from the UI
    secondary: '#F8F9FA',    // Light gray background
    accent: '#4ECDC4',       // Mint green accent
    text: {
      primary: '#2D3436',    // Dark gray
      secondary: '#636E72',  // Medium gray
      light: '#B2BEC3'       // Light gray
    },
    background: {
      primary: '#FFFFFF',    // White
      secondary: '#F8F9FA',  // Light gray
      tertiary: '#E9ECEF'    // Lighter gray
    },
    success: '#00B894',
    warning: '#FDCB6E',
    error: '#E17055'
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px'
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px'
  },
  shadows: {
    sm: '0 1px 3px rgba(0,0,0,0.1)',
    md: '0 4px 6px rgba(0,0,0,0.1)',
    lg: '0 10px 15px rgba(0,0,0,0.1)',
    xl: '0 20px 25px rgba(0,0,0,0.1)'
  }
};

// Legacy themes for backward compatibility
export const theme1 = {
  primary: "#106EBE",
  secondary: "#0FFCBE",
  accent: "#0FFCBE",
  background: "#FFFFFF",
  text: "#0A1A2F"
};

export const theme2 = {
  primary: "#00ABE4",
  secondary: "#E9F1FA",
  accent: "#00ABE4",
  accentOrange: "#FF6B35",
  background: "#FFFFFF",
  text: "#0A1A2F"
};

export const theme3 = {
  primary: "#4F0341",
  secondary: "#FFFFFF",
  accent: "#C6A667",
  background: "#FFFFFF",
  text: "#2A0A1B"
};


