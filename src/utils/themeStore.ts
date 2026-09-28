export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeState {
  mode: ThemeMode;
  effectiveTheme: 'light' | 'dark';
  systemTheme: 'light' | 'dark';
}

const STORAGE_KEY = 'freshlane_theme_mode';

/**
 * Gets the device/OS color scheme preference
 */
export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

/**
 * Reads the user's saved mode preference ('light' | 'dark' | 'system')
 */
export function getStoredThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode;
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
  } catch {}
  return 'system';
}

/**
 * Determines the effective active theme based on selected mode and system preference
 */
export function resolveEffectiveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'light') return 'light';
  if (mode === 'dark') return 'dark';
  return getSystemTheme();
}

/**
 * Applies theme to document root (class, data-theme, and style)
 */
export function applyTheme(mode: ThemeMode): { mode: ThemeMode; effectiveTheme: 'light' | 'dark'; systemTheme: 'light' | 'dark' } {
  if (typeof window === 'undefined') {
    return { mode, effectiveTheme: 'light', systemTheme: 'light' };
  }

  const systemTheme = getSystemTheme();
  const effectiveTheme = resolveEffectiveTheme(mode);

  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {}

  const root = document.documentElement;
  if (effectiveTheme === 'dark') {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
    root.style.colorScheme = 'light';
  }

  const payload: ThemeState = { mode, effectiveTheme, systemTheme };

  try {
    window.dispatchEvent(new CustomEvent('freshlane-theme-change', { detail: payload }));
  } catch {}

  return payload;
}

/**
 * Initialize theme listeners on application start
 */
export function initTheme(): () => void {
  if (typeof window === 'undefined') return () => {};

  const currentMode = getStoredThemeMode();
  applyTheme(currentMode);

  let mediaQuery: MediaQueryList | null = null;
  try {
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  } catch {}

  const handleSystemChange = () => {
    const savedMode = getStoredThemeMode();
    if (savedMode === 'system') {
      applyTheme('system');
    }
  };

  if (mediaQuery) {
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemChange);
    } else {
      (mediaQuery as any).addListener(handleSystemChange);
    }
  }

  return () => {
    if (mediaQuery) {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleSystemChange);
      } else {
        (mediaQuery as any).removeListener(handleSystemChange);
      }
    }
  };
}
