import { type ReactElement, useMemo, useState } from 'react';

import { WindowScaffold } from '@/components/adwaita';
import {
  ContentArea,
  NavigationSidebar,
  SegmentedControl,
  Sidebar,
  Toolbar,
} from '@/components/ui';

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
        return <GeneralTab />;
      case 'storage':
        return <StorageTab />;
      case 'snippets':
        return <SnippetsTab />;
      case 'analytics':
        return <AnalyticsTab />;
      case 'shortcuts':
        return <ShortcutsTab />;
      case 'advanced':
      default:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-[color:hsl(var(--text-primary))]">
                Advanced settings
              </h2>
              <p className="text-sm text-[color:hsl(var(--text-secondary))]">
                Additional controls are on the roadmap. In the meantime you can edit the
                configuration file manually.
              </p>
            </div>
          </div>
        );
    }
  };

  const navigationItems = useMemo(
    () =>
      TAB_DEFINITIONS.map((tab) => ({
        id: tab.id,
        label: tab.label,
        active: tab.id === activeTab,
      })),
    [activeTab]
  );

  return (
    <WindowScaffold
      size="wide"
      fullHeight
      contentClassName="flex h-full flex-col gap-0 text-[color:hsl(var(--text-primary))]"
    >
      <Toolbar className="rounded-t-[12px]">
        <div className="flex flex-col">
          <span className="typography-caption font-semibold uppercase tracking-[0.18em] text-[color:hsl(var(--text-secondary))]">
            Settings
          </span>
          <span className="typography-heading text-[color:hsl(var(--text-primary))]">
            {activeTabDefinition?.label ?? 'General'}
          </span>
        </div>
      </Toolbar>

      <div className="flex flex-1 flex-col gap-4 px-3 pb-3 pt-0 md:flex-row md:gap-6 md:px-6 md:pb-6">
        <div className="hidden md:block">
          <Sidebar width="lg" className="h-full">
            <NavigationSidebar
              items={navigationItems}
              onSelect={(id) => setActiveTab(id as SettingsTab)}
            />
          </Sidebar>
        </div>

        <ContentArea className="flex flex-1 flex-col overflow-hidden" spacing="lg">
          <div className="md:hidden">
            <SegmentedControl
              options={tabOptions}
              value={activeTab}
              onChange={(value) => setActiveTab(value as SettingsTab)}
              ariaLabel="Settings sections"
            />
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            <div className="space-y-6">{renderContent()}</div>
          </div>
        </ContentArea>
      </div>
    </WindowScaffold>
  );
}
