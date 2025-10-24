import { type ReactElement, useState } from 'react';

import { Container } from '@/components/layout/Container';
import { Stack } from '@/components/layout/Stack';

import { AnalyticsTab } from './AnalyticsTab';
import { GeneralTab } from './GeneralTab';
import { ShortcutsTab } from './ShortcutsTab';
import { SnippetsTab } from './SnippetsTab';
import { StorageTab } from './StorageTab';

/**
 * Settings tab types
 */
export type SettingsTab =
  | 'general'
  | 'storage'
  | 'snippets'
  | 'analytics'
  | 'shortcuts'
  | 'advanced';

/**
 * Settings Window - Main settings interface with tabbed navigation
 */
export function SettingsWindow(): ReactElement {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Settings</h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <nav className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4">
          <Stack spacing="sm">
            <TabButton
              label="General"
              isActive={activeTab === 'general'}
              onClick={() => setActiveTab('general')}
            />
            <TabButton
              label="Storage"
              isActive={activeTab === 'storage'}
              onClick={() => setActiveTab('storage')}
            />
            <TabButton
              label="Snippets"
              isActive={activeTab === 'snippets'}
              onClick={() => setActiveTab('snippets')}
            />
            <TabButton
              label="Analytics"
              isActive={activeTab === 'analytics'}
              onClick={() => setActiveTab('analytics')}
            />
            <TabButton
              label="Shortcuts"
              isActive={activeTab === 'shortcuts'}
              onClick={() => setActiveTab('shortcuts')}
            />
            <TabButton
              label="Advanced"
              isActive={activeTab === 'advanced'}
              onClick={() => setActiveTab('advanced')}
            />
          </Stack>
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden">
          {activeTab === 'general' && (
            <Container maxWidth="2xl" className="py-8">
              <GeneralTab />
            </Container>
          )}
          {activeTab === 'storage' && (
            <Container maxWidth="2xl" className="py-8">
              <StorageTab />
            </Container>
          )}
          {activeTab === 'snippets' && (
            <div className="h-full p-6">
              <SnippetsTab />
            </div>
          )}
          {activeTab === 'analytics' && (
            <Container maxWidth="2xl" className="py-8">
              <AnalyticsTab />
            </Container>
          )}
          {activeTab === 'shortcuts' && (
            <Container maxWidth="2xl" className="py-8">
              <ShortcutsTab />
            </Container>
          )}
          {activeTab === 'advanced' && (
            <Container maxWidth="2xl" className="py-8">
              <div>Advanced Settings - Coming Soon</div>
            </Container>
          )}
        </main>
      </div>
    </div>
  );
}

/**
 * Tab navigation button component
 */
interface TabButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function TabButton({ label, isActive, onClick }: TabButtonProps): ReactElement {
  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left px-4 py-3 rounded-lg font-medium transition-colors
        ${
          isActive
            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
        }
      `}
      aria-current={isActive ? 'page' : undefined}
    >
      {label}
    </button>
  );
}
