import { useState, useEffect } from 'react';
import {
  ThemeMode,
  ThemeState,
  getStoredThemeMode,
  getSystemTheme,
  resolveEffectiveTheme,
  applyTheme,
} from '../utils/themeStore';

export function useTheme() {
  const [themeState, setThemeState] = useState<ThemeState>(() => {
    const mode = getStoredThemeMode();
    const systemTheme = getSystemTheme();
    const effectiveTheme = resolveEffectiveTheme(mode);
    return { mode, effectiveTheme, systemTheme };
  });

  useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<ThemeState>;
      if (customEvent.detail) {
        setThemeState(customEvent.detail);
      }
    };

    window.addEventListener('freshlane-theme-change', handleThemeChange);
    return () => {
      window.removeEventListener('freshlane-theme-change', handleThemeChange);
    };
  }, []);

  const setThemeMode = (mode: ThemeMode) => {
    const updated = applyTheme(mode);
    setThemeState(updated);
  };

  return {
    mode: themeState.mode,
    effectiveTheme: themeState.effectiveTheme,
    systemTheme: themeState.systemTheme,
    setThemeMode,
  };
}
