import { listen } from '@tauri-apps/api/event';
import { useEffect, useState } from 'react';

import { getSettings } from '@/lib/api';
import type { AppSettings } from '@/types/settings';

export type Theme = 'light' | 'dark' | 'system';

/**
 * Hook to manage application theme with system preference detection
 * Theme is stored in the database and synchronized across all windows
 *
 * @returns Current theme and isDark state
 */
export function useTheme(): { theme: Theme; isDark: boolean } {
  const [theme, setThemeState] = useState<Theme>('system');
  const [isDark, setIsDark] = useState<boolean>(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Load theme from settings on mount
  useEffect(() => {
    const loadTheme = async (): Promise<void> => {
      try {
        const settings = await getSettings();
        setThemeState(settings.theme);
      } catch (error) {
        console.error('Failed to load theme from settings:', error);
        // Fall back to system theme on error
        setThemeState('system');
      }
    };

    loadTheme();
  }, []);

  // Listen for settings changes from other windows or manual updates
  useEffect(() => {
    const unlisten = listen<AppSettings>('settings-changed', (event) => {
      setThemeState(event.payload.theme);
    });

    return () => {
      unlisten.then((unlistenFn) => unlistenFn());
    };
  }, []);

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

  return { theme, isDark };
}
