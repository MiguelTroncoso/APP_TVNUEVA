/**
 * ThemeContext — Temas de la app
 * dark (default) | amoled (negro puro, ahorra batería OLED) | light
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = 'tvnueva_theme';

export const THEMES = {
  dark: {
    name: 'Oscuro', icon: '🌙',
    background: '#080808', backgroundDeep: '#1B1464', card: '#1E1E24',
    primary: '#5B3DF5', primaryLight: '#6A5CFF', accent: '#32C5FF', accentWarm: '#F6B63F',
    success: '#26D07C', danger: '#FF4D5A', surface: '#121219', surfaceElevated: '#1A1A23',
    white: '#FFFFFF', textSecondary: '#B8B8C7', black: '#080808', tabBar: '#0f0f14', border: '#2a2a3a', inputBg: '#0f0f14',
  },
  amoled: {
    name: 'AMOLED', icon: '⚫',
    background: '#000000', backgroundDeep: '#000000', card: '#0a0a0a',
    primary: '#5B3DF5', primaryLight: '#6A5CFF', accent: '#32C5FF', accentWarm: '#F6B63F',
    success: '#26D07C', danger: '#FF4D5A', surface: '#050505', surfaceElevated: '#0D0D0D',
    white: '#FFFFFF', textSecondary: '#999999', black: '#000000', tabBar: '#000000', border: '#1a1a1a', inputBg: '#050505',
  },
  light: {
    name: 'Claro', icon: '☀️',
    background: '#f4f4f8', backgroundDeep: '#e8e8f0', card: '#ffffff',
    primary: '#5B3DF5', primaryLight: '#6A5CFF', accent: '#0088cc', accentWarm: '#D88900',
    success: '#108A4F', danger: '#D83245', surface: '#FFFFFF', surfaceElevated: '#F8F8FC',
    white: '#1a1a2e', textSecondary: '#555566', black: '#f4f4f8', tabBar: '#ffffff', border: '#e0e0e8', inputBg: '#f8f8fc',
  },
};

const ThemeContext = createContext({ theme: THEMES.dark, themeName: 'dark', setTheme: () => {} });

export const ThemeProvider = ({ children }) => {
  const [themeName, setThemeName] = useState('dark');

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then(saved => {
      if (saved && THEMES[saved]) setThemeName(saved);
    }).catch(() => {});
  }, []);

  const setTheme = async (name) => {
    setThemeName(name);
    await AsyncStorage.setItem(THEME_KEY, name).catch(() => {});
  };

  return (
    <ThemeContext.Provider value={{ theme: THEMES[themeName], themeName, setTheme, THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

// Re-export colors for backward compatibility (usa el tema oscuro por defecto)
export const colors = THEMES.dark;
