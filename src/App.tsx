import { getCurrentWindow } from '@tauri-apps/api/window';
import { type ReactElement, useEffect, useState } from 'react';

import { QuickAddDialog } from '@/components/QuickAddDialog';
import { SearchOverlay } from '@/components/SearchOverlay';
import { SettingsWindow } from '@/components/SettingsWindow';
import { useTheme } from '@/hooks/useTheme';

/**
 * Main App component that routes to different views based on window label
 */
function App(): ReactElement {
  const [windowLabel, setWindowLabel] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Initialize theme (system preference detection)
  useTheme();

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

  // Route to different views based on window label
  switch (windowLabel) {
    case 'quick-add':
      return (
        <QuickAddDialog
          onSuccess={() => {
            // Snippet created successfully
          }}
          onError={(error) => {
            console.error('Failed to create snippet:', error);
          }}
        />
      );

    case 'search':
      return <SearchOverlay />;

    case 'settings':
      return <SettingsWindow />;

    default:
      return (
        <div className="min-h-screen p-6 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Snips</h1>
            <p className="text-gray-600 dark:text-gray-400">Unknown window: {windowLabel}</p>
          </div>
        </div>
      );
  }
}

export default App;
