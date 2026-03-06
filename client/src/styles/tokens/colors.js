/**
 * Design Tokens - Colors
 * Centralized color system for consistent theming
 */

export const colors = {
  // Brand Colors
  brand: {
    primary: '#a89068',      // Gold/Tan
    secondary: '#2e443c',    // Dark Green
    tertiary: '#F5DEB3',     // Wheat/Beige
    dark: '#1a2822',         // Darker Green
    light: '#f5f7f8',        // Light Gray
  },

  // Semantic Colors
  semantic: {
    success: '#15803D',
    warning: '#D97706',
    error: '#DC2626',
    info: '#3B82F6',
  },

  // Neutral Colors
  neutral: {
    50: '#FAFAF9',
    100: '#F5F5F4',
    200: '#E7E5E4',
    300: '#D6D3D1',
    400: '#A8A29E',
    500: '#78716C',
    600: '#57534E',
    700: '#44403C',
    800: '#292524',
    900: '#1C1917',
  },

  // Text Colors
  text: {
    primary: '#1C1917',
    secondary: '#44403C',
    tertiary: '#78716C',
    muted: '#A8A29E',
    inverse: '#FFFFFF',
  },

  // Background Colors
  background: {
    primary: '#FFFFFF',
    secondary: '#F5F5F4',
    tertiary: '#E7E5E4',
    dark: '#2e443c',
    darker: '#1a2822',
  },

  // Border Colors
  border: {
    light: '#E7E5E4',
    default: '#D6D3D1',
    dark: '#A8A29E',
  },

  // Overlay Colors
  overlay: {
    light: 'rgba(0, 0, 0, 0.1)',
    medium: 'rgba(0, 0, 0, 0.3)',
    dark: 'rgba(0, 0, 0, 0.6)',
  },
};

export default colors;
