import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { type ReactElement, useEffect, useState } from 'react';

import { QuickAddDialog } from '@/components/QuickAddDialog';
import { SearchOverlay } from '@/components/SearchOverlay';
import { SettingsWindow } from '@/components/SettingsWindow';
import { useThemeController } from '@/hooks/useThemeController';
import type { ClipboardProbeResult } from '@/types/clipboard';

/**
 * Main App component that routes to different views based on window label
 */
function App(): ReactElement {
  const [windowLabel, setWindowLabel] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [clipboardWarning, setClipboardWarning] = useState<string | null>(null);

  const { platform: platformName } = useThemeController();

  useEffect(() => {
    if (platformName !== 'linux') {
      return undefined;
    }

    let focusWarningUnlisten: UnlistenFn | undefined;
    let cancelled = false;

    const probeClipboard = async (): Promise<void> => {
      try {
        const probe = await invoke<ClipboardProbeResult>('probe_clipboard_support');
        if (cancelled) {
          return;
        }

        let message: string | null = null;

        if (!probe.primary_supported) {
          message = probe.primary_error
            ? `Primary selection is unavailable (${probe.primary_error}). Snips will fall back to the standard clipboard.`
            : 'Primary selection is unavailable on this compositor. Snips will fall back to the standard clipboard.';
        } else if (!probe.clipboard_supported) {
          message = probe.clipboard_error
            ? `Clipboard access is restricted (${probe.clipboard_error}).`
            : 'Clipboard access is restricted. Snips may not capture text automatically.';
        } else if (probe.sandboxed && !probe.portal_supported) {
          message = probe.portal_error
            ? `GTK portal clipboard fallback is unavailable (${probe.portal_error}). Selected text capture may require manual permission tweaks.`
            : 'GTK portal clipboard fallback is unavailable. Snips may have limited clipboard access inside this sandbox.';
        }

        setClipboardWarning(message);
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn('Clipboard probe failed', err);
        }
      }
    };

    const setupFocusWarning = async (): Promise<void> => {
      focusWarningUnlisten = await listen<string>('focus-warning', (event) => {
        if (import.meta.env.DEV) {
          console.warn(event.payload ?? 'Snips window focus warning received');
        }
      });
    };

    void probeClipboard();
    void setupFocusWarning();

    return () => {
      cancelled = true;
      void focusWarningUnlisten?.();
    };
  }, [platformName]);

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

  const warningForWindow = platformName === 'linux' ? clipboardWarning : null;

  switch (windowLabel) {
    case 'quick-add':
      view = (
        <QuickAddDialog
          clipboardWarning={warningForWindow}
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
