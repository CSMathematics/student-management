// src/context/ThemeContext.jsx
import React, { createContext, useState, useMemo, useContext, useEffect } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { grey } from '@mui/material/colors';

// Create a context for the theme
const ThemeContext = createContext();

// Custom hook to use the theme context
export const useTheme = () => useContext(ThemeContext);

// Define your color palettes
const lightPalette = {
  primary: '#1e88e5',
  secondary: '#74008bff',
  background: '#f4f6f8',
  paper: '#ffffff',
  textPrimary: '#000000',
  textSecondary: grey[700],
  drawerBg: '#20303f',
  drawerText: '#eef6fb',
  drawerHoverBg: '#eef6fb',
  drawerHoverText: '#1e88e5',
};

const darkPalette = {
  primary: '#64b5f6',
  secondary: '#a008dbff',
  background: '#121212',
  paper: '#1e1e1e',
  textPrimary: '#ffffff',
  textSecondary: grey[500],
  drawerBg: '#1e1e1e',
  drawerText: '#eef6fb',
  drawerHoverBg: '#333333',
  drawerHoverText: '#64b5f6',
};

// ThemeProvider component that wraps the app
export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState('light');

  useEffect(() => {
    const palette = mode === 'light' ? lightPalette : darkPalette;
    for (const key in palette) {
      document.documentElement.style.setProperty(`--color-${key}`, palette[key]);
    }
  }, [mode]);


  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const muiTheme = useMemo(() => createTheme({
    palette: {
      mode,
      primary: { main: mode === 'light' ? lightPalette.primary : darkPalette.primary },
      secondary: { main: mode === 'light' ? lightPalette.secondary : darkPalette.secondary },
      background: { 
          default: mode === 'light' ? lightPalette.background : darkPalette.background,
          paper: mode === 'light' ? lightPalette.paper : darkPalette.paper,
      },
      text: {
          primary: mode === 'light' ? lightPalette.textPrimary : darkPalette.textPrimary,
          secondary: mode === 'light' ? lightPalette.textSecondary : darkPalette.textSecondary,
      }
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    },
  }), [mode]);

  const value = {
      mode,
      toggleTheme
  }

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
