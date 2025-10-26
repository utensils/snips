import { type ReactElement, useMemo, useState } from 'react';

import { HeaderBar, Pane, SegmentedButtons } from '@/components/adwaita';

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

const TAB_DEFINITIONS: Array<{ id: SettingsTab; label: string }> = [
  { id: 'general', label: 'General' },
  { id: 'storage', label: 'Storage' },
  { id: 'snippets', label: 'Snippets' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'shortcuts', label: 'Shortcuts' },
  { id: 'advanced', label: 'Advanced' },
];

/**
 * Settings Window - Main settings interface with tabbed navigation
 */
export function SettingsWindow(): ReactElement {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  const tabOptions = useMemo(() => TAB_DEFINITIONS.map(({ id, label }) => ({ id, label })), []);
  const activeTabDefinition = TAB_DEFINITIONS.find((tab) => tab.id === activeTab);

  const renderContent = (): ReactElement => {
    switch (activeTab) {
      case 'general':
        return (
          <Pane padding="lg" className="space-y-6">
            <GeneralTab />
          </Pane>
        );
      case 'storage':
        return (
          <Pane padding="lg" className="space-y-6">
            <StorageTab />
          </Pane>
        );
      case 'snippets':
        return (
          <Pane padding="lg" className="flex h-full flex-col">
            <SnippetsTab />
          </Pane>
        );
      case 'analytics':
        return (
          <Pane padding="lg" className="space-y-6">
            <AnalyticsTab />
          </Pane>
        );
      case 'shortcuts':
        return (
          <Pane padding="lg" className="space-y-6">
            <ShortcutsTab />
          </Pane>
        );
      case 'advanced':
      default:
        return (
          <Pane padding="lg" className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">Advanced settings</h2>
              <p className="text-sm text-muted-foreground">
                Additional controls are on the roadmap. In the meantime you can edit the
                configuration file manually.
              </p>
            </div>
          </Pane>
        );
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col bg-background px-4 py-4 text-foreground md:px-6 md:py-6">
      <HeaderBar title="Settings" subtitle={activeTabDefinition?.label} />

      <div className="mt-4 flex flex-1 gap-4 overflow-hidden">
        <aside className="hidden w-64 shrink-0 md:flex">
          <Pane padding="sm" className="h-full overflow-y-auto">
            <nav className="flex flex-col gap-1">
              {TAB_DEFINITIONS.map((tab) => (
                <TabButton
                  key={tab.id}
                  label={tab.label}
                  isActive={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                />
              ))}
            </nav>
          </Pane>
        </aside>

        <section className="flex flex-1 flex-col gap-4 overflow-hidden">
          <div className="md:hidden">
            <SegmentedButtons
              options={tabOptions}
              value={activeTab}
              onChange={(value) => setActiveTab(value)}
              ariaLabel="Settings sections"
              fullWidth
              size="sm"
            />
          </div>

          <div className="flex-1 overflow-y-auto pb-6">{renderContent()}</div>
        </section>
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
        w-full rounded-2xl px-3 py-2 text-left text-sm font-medium transition-colors
        ${
          isActive
            ? 'bg-background text-foreground shadow-sm border border-border/60'
            : 'text-muted-foreground hover:bg-muted/30'
        }
      `}
      aria-current={isActive ? 'page' : undefined}
    >
      {label}
    </button>
  );
}
