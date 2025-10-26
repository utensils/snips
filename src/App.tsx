import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { platform } from '@tauri-apps/plugin-os';
import { type ReactElement, useEffect, useState } from 'react';

import { QuickAddDialog } from '@/components/QuickAddDialog';
import { SearchOverlay } from '@/components/SearchOverlay';
import { SettingsWindow } from '@/components/SettingsWindow';
import { useTheme } from '@/hooks/useTheme';
import { applyOmarchyPalette } from '@/lib/theme';
import type { ThemePalette } from '@/types/theme';

/**
 * Main App component that routes to different views based on window label
 */
function App(): ReactElement {
  const [windowLabel, setWindowLabel] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Initialize theme (system preference detection)
  useTheme();

  useEffect(() => {
    let unlisten: UnlistenFn | undefined;

    const applyPalette = (palette: ThemePalette | null): void => {
      if (!palette) return;
      const wallpaper = palette.wallpaper ? convertFileSrc(palette.wallpaper) : null;
      applyOmarchyPalette(palette, wallpaper);
    };

    const applyPlatform = async (): Promise<void> => {
      try {
        const platformName = await platform();
        const root = document.documentElement;
        root.setAttribute('data-platform', platformName);
        const chrome = platformName === 'macos' ? 'frameless' : 'native';
        root.setAttribute('data-chrome', chrome);

        if (platformName === 'linux') {
          try {
            const palette = await invoke<ThemePalette>('get_theme_palette');
            applyPalette(palette);
          } catch (err) {
            if (import.meta.env.DEV) {
              console.error('Failed to load Omarchy theme palette', err);
            }
          }

          unlisten = await listen<ThemePalette>('appearance-updated', (event) => {
            applyPalette(event.payload ?? null);
          });
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error('Failed to determine platform', err);
        }
      }
    };

    applyPlatform();

    return () => {
      void unlisten?.();
    };
  }, []);

  useEffect(() => {
    const getWindowLabel = async (): Promise<void> => {
      try {
        const window = getCurrentWindow();
        const label = window.label;
        setWindowLabel(label);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to get window label:', err);
        setIsLoading(false);
      }
    };

    getWindowLabel();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  let view: ReactElement;

  switch (windowLabel) {
    case 'quick-add':
      view = (
        <QuickAddDialog
          onSuccess={() => {
            // Snippet created successfully
          }}
          onError={(error) => {
            if (import.meta.env.DEV) {
              console.error('Failed to create snippet:', error);
            }
          }}
        />
      );
      break;

    case 'search':
      view = <SearchOverlay />;
      break;

    case 'settings':
      view = <SettingsWindow />;
      break;

    default:
      view = (
        <div className="min-h-screen p-6 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Snips</h1>
            <p className="text-gray-600 dark:text-gray-400">Unknown window: {windowLabel}</p>
          </div>
        </div>
      );
      break;
  }

  return (
    <div className="window-shell">
      <div className="window-drag-region" />
      <div className="window-content">{view}</div>
    </div>
  );
}

export default App;
