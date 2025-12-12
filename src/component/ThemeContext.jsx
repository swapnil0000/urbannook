import React, { createContext, useContext } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const theme = {
  colors: {
    primary: '#FF6B6B',
    secondary: '#F8F9FA', 
    accent: '#4ECDC4',
    text: {
      primary: '#2D3436',
      secondary: '#636E72',
      light: '#B2BEC3'
    },
    background: {
      primary: '#FFFFFF',
      secondary: '#F8F9FA',
      tertiary: '#E9ECEF'
    }
  }
};

export const ThemeProvider = ({ children }) => {
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};