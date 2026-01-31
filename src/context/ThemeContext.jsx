// src/context/ThemeContext.jsx
import React, { createContext, useState, useMemo, useContext, useEffect } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { grey } from '@mui/material/colors';

const ThemeContext = createContext();
export const useTheme = () => useContext(ThemeContext);

// --- ΑΛΛΑΓΗ: Εξάγουμε τις παλέτες για να είναι προσβάσιμες από άλλα αρχεία ---
export const lightPalette = {
  primary: '#6366f1', // Indigo 500
  secondary: '#ec4899', // Pink 500
  background: '#f8fafc', // Slate 50
  paper: '#ffffff',
  textPrimary: '#1e293b', // Slate 800
  textSecondary: '#64748b', // Slate 500
  drawerBg: '#1e1b4b', // Indigo 950
  drawerText: '#e0e7ff', // Indigo 100
  drawerHoverBg: '#312e81', // Indigo 900
  drawerHoverText: '#ffffff',
  chartPaperBg: '#ffffff',
  chartPlotBg: '#ffffff',
  chartFontColor: '#1e293b',
  chartGridColor: '#e2e8f0', // Slate 200
  success: '#10b981', // Emerald 500
  warning: '#f59e0b', // Amber 500
  error: '#ef4444', // Red 500
  info: '#3b82f6', // Blue 500
};

export const darkPalette = {
  primary: '#818cf8', // Indigo 400
  secondary: '#f472b6', // Pink 400
  background: '#0f172a', // Slate 900
  paper: '#1e293b', // Slate 800
  textPrimary: '#f8fafc', // Slate 50
  textSecondary: '#94a3b8', // Slate 400
  drawerBg: '#0f172a', // Slate 900
  drawerText: '#cbd5e1', // Slate 300
  drawerHoverBg: '#1e293b', // Slate 800
  drawerHoverText: '#818cf8',
  chartPaperBg: '#1e293b',
  chartPlotBg: '#1e293b',
  chartFontColor: '#f8fafc',
  chartGridColor: '#334155', // Slate 700
  success: '#34d399', // Emerald 400
  warning: '#fbbf24', // Amber 400
  error: '#f87171', // Red 400
  info: '#60a5fa', // Blue 400
};

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState('light');

  // This useEffect is still needed for any SCSS styles that use CSS variables
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
      },
      success: { main: mode === 'light' ? lightPalette.success : darkPalette.success },
      warning: { main: mode === 'light' ? lightPalette.warning : darkPalette.warning },
      error: { main: mode === 'light' ? lightPalette.error : darkPalette.error },
      info: { main: mode === 'light' ? lightPalette.info : darkPalette.info },
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
