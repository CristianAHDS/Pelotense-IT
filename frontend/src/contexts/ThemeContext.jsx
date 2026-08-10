import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

const THEMES = ['dark', 'light', 'high-contrast'];

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('pelotense-theme');
    return THEMES.includes(saved) ? saved : 'dark';
  });

  useEffect(() => {
    document.documentElement.className = theme;
    localStorage.setItem('pelotense-theme', theme);
  }, [theme]);

  const toggle = () => {
    setTheme((t) => {
      const idx = THEMES.indexOf(t);
      return THEMES[(idx + 1) % THEMES.length];
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
