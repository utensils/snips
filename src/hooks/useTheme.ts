import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

/**
 * Hook to manage application theme with system preference detection
 *
 * @returns Current theme and function to set theme
 */
export function useTheme(): { theme: Theme; setTheme: (theme: Theme) => void; isDark: boolean } {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Try to load saved theme preference
    const saved = localStorage.getItem('snips-theme') as Theme | null;
    return saved || 'system';
  });

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return theme === 'dark';
  });

  // Update theme and persist to localStorage
  const setTheme = (newTheme: Theme): void => {
    setThemeState(newTheme);
    localStorage.setItem('snips-theme', newTheme);
    return;
  };

  // Apply theme to document
  useEffect(() => {
    const updateTheme = (): void => {
      const root = document.documentElement;
      let shouldBeDark = false;

      if (theme === 'system') {
        shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      } else {
        shouldBeDark = theme === 'dark';
      }

      if (shouldBeDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }

      setIsDark(shouldBeDark);
    };

    updateTheme();

    // Listen for system preference changes
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (): void => {
        updateTheme();
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    return undefined;
  }, [theme]);

  return { theme, setTheme, isDark };
}
