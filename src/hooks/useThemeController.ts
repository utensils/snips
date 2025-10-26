import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { platform } from '@tauri-apps/plugin-os';
import { useEffect, useRef, useState } from 'react';

import { applyOmarchyPalette, clearOmarchyPalette } from '@/lib/theme';
import type { AppSettings } from '@/types/settings';
import type { ThemePalette } from '@/types/theme';

import { useTheme, type Theme } from './useTheme';

type PlatformName = 'linux' | 'macos' | 'windows' | string;

interface ThemeControllerState {
  theme: Theme;
  isDark: boolean;
  platform: PlatformName | null;
  palette: ThemePalette | null;
}

const isDev = import.meta.env.DEV;

function getChromePreference(platformName: PlatformName, settings: AppSettings | null): string {
  const key: keyof AppSettings['window_chrome'] =
    platformName === 'macos' ? 'macos' : platformName === 'windows' ? 'windows' : 'linux';

  const preference =
    settings?.window_chrome?.[key] ?? (platformName === 'macos' ? 'frameless_shadow' : 'native');

  return preference === 'frameless_shadow' ? 'frameless-shadow' : preference;
}

async function loadPalette(): Promise<ThemePalette | null> {
  try {
    const palette = await invoke<ThemePalette | null>('get_theme_palette');
    return palette ?? null;
  } catch (error) {
    if (isDev) {
      console.warn('Failed to load Omarchy theme palette', error);
    }
    return null;
  }
}

export function useThemeController(): ThemeControllerState {
  const { theme, isDark } = useTheme();
  const [platformName, setPlatformName] = useState<PlatformName | null>(null);
  const [palette, setPalette] = useState<ThemePalette | null>(null);
  const chromeRef = useRef<string | null>(null);

  useEffect(() => {
    let paletteUnlisten: UnlistenFn | undefined;
    let settingsUnlisten: UnlistenFn | undefined;
    let cancelled = false;

    const root = document.documentElement;

    const applyChrome = (platformValue: PlatformName, settings: AppSettings | null): void => {
      const chromeValue = getChromePreference(platformValue, settings);
      if (chromeRef.current === chromeValue) {
        return;
      }
      chromeRef.current = chromeValue;
      root.setAttribute('data-chrome', chromeValue);
    };

    const bootstrap = async (): Promise<void> => {
      try {
        const detectedPlatform = await platform();
        if (cancelled) {
          return;
        }

        setPlatformName(detectedPlatform);
        root.setAttribute('data-platform', detectedPlatform);

        let settings: AppSettings | null = null;
        try {
          settings = await invoke<AppSettings>('get_settings');
        } catch (error) {
          if (isDev) {
            console.warn('Failed to load settings for theme controller', error);
          }
        }

        if (cancelled) {
          return;
        }

        applyChrome(detectedPlatform, settings);

        settingsUnlisten = await listen<AppSettings>('settings-changed', (event) => {
          applyChrome(detectedPlatform, event.payload ?? null);
        });

        if (detectedPlatform === 'linux') {
          const applyPalette = (nextPalette: ThemePalette | null): void => {
            setPalette(nextPalette);
            if (!nextPalette) {
              clearOmarchyPalette();
              return;
            }
            const wallpaperSrc = nextPalette.wallpaper
              ? convertFileSrc(nextPalette.wallpaper)
              : null;
            applyOmarchyPalette(nextPalette, wallpaperSrc);
          };

          const initialPalette = await loadPalette();
          if (!cancelled) {
            applyPalette(initialPalette);
          }

          paletteUnlisten = await listen<ThemePalette | null>('appearance-updated', (event) => {
            applyPalette(event.payload ?? null);
          });
        } else {
          clearOmarchyPalette();
        }
      } catch (error) {
        if (isDev) {
          console.error('Theme controller bootstrap failed', error);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
      void paletteUnlisten?.();
      void settingsUnlisten?.();
    };
  }, []);

  useEffect(() => {
    if (!platformName) {
      return;
    }

    const root = document.documentElement;
    if (!root.hasAttribute('data-platform')) {
      root.setAttribute('data-platform', platformName);
    }

    if (!root.hasAttribute('data-chrome')) {
      const chromeValue = getChromePreference(platformName, null);
      chromeRef.current = chromeValue;
      root.setAttribute('data-chrome', chromeValue);
    }
  }, [platformName]);

  return { theme, isDark, platform: platformName, palette };
}
