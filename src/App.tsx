import { getCurrentWindow } from '@tauri-apps/api/window';
import { type ReactElement, useEffect, useState } from 'react';

import { QuickAddDialog } from '@/components/QuickAddDialog';

/**
 * Main App component that routes to different views based on window label
 */
function App(): ReactElement {
  const [windowLabel, setWindowLabel] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

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
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-sm text-gray-600">Loading...</p>
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
            console.log('Snippet created successfully');
          }}
          onError={(error) => {
            console.error('Failed to create snippet:', error);
          }}
        />
      );

    case 'search':
      return (
        <div className="min-h-screen p-6 bg-gray-50">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Search</h1>
            <p className="text-gray-600">Search overlay coming soon...</p>
          </div>
        </div>
      );

    case 'management':
      return (
        <div className="min-h-screen p-6 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Management</h1>
            <p className="text-gray-600">Management window coming soon...</p>
          </div>
        </div>
      );

    default:
      return (
        <div className="min-h-screen p-6 bg-gray-50">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Snips</h1>
            <p className="text-gray-600">Unknown window: {windowLabel}</p>
          </div>
        </div>
      );
  }
}

export default App;
