import { invoke } from '@tauri-apps/api/core';
import { platform } from '@tauri-apps/plugin-os';
import { type ReactElement, useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { getSettings, updateSettings } from '@/lib/api';
import type { AppSettings, Theme, WindowChromePreference } from '@/types/settings';

const WINDOW_CHROME_OPTIONS: Array<{
  value: WindowChromePreference;
  label: string;
  description: string;
}> = [
  {
    value: 'native',
    label: 'Native',
    description: 'Use the operating system window frame and controls.',
  },
  {
    value: 'frameless',
    label: 'Frameless',
    description: 'Hide the title bar; let your compositor manage shadows and borders.',
  },
  {
    value: 'frameless_shadow',
    label: 'Frameless + Shadow',
    description: 'Frameless window with Snips-managed drop shadow (macOS-style).',
  },
];

const HYPRLAND_WINDOW_RULES = `windowrulev2 = float, title:^(Quick Add Snippet)$
windowrulev2 = center, title:^(Quick Add Snippet)$
windowrulev2 = size 650 700, title:^(Quick Add Snippet)$
windowrulev2 = float, title:^(Snips)$
windowrulev2 = center, title:^(Snips)$`;

/**
 * General Settings Tab
 * Provides theme selection and other general application preferences
 */
export function GeneralTab(): ReactElement {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [currentPlatform, setCurrentPlatform] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState(false);

  const resolvePlatformKey = (platformName: string): keyof AppSettings['window_chrome'] => {
    switch (platformName) {
      case 'macos':
        return 'macos';
      case 'windows':
        return 'windows';
      default:
        return 'linux';
    }
  };

  // Load settings and platform on mount
  useEffect(() => {
    loadSettings();
    setCurrentPlatform(platform());
  }, []);

  const loadSettings = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getSettings();
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleThemeChange = async (theme: Theme): Promise<void> => {
    if (!settings) return;

    try {
      setIsSaving(true);
      setError(null);
      setSaveSuccess(false);

      const updatedSettings: AppSettings = {
        ...settings,
        theme,
      };

      await updateSettings(updatedSettings);
      setSettings(updatedSettings);
      setSaveSuccess(true);

      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleWindowChromeChange = async (preference: WindowChromePreference): Promise<void> => {
    if (!settings) return;

    try {
      setIsSaving(true);
      setError(null);
      setSaveSuccess(false);

      const platformKey = resolvePlatformKey(currentPlatform);
      const updatedSettings: AppSettings = {
        ...settings,
        window_chrome: {
          ...settings.window_chrome,
          [platformKey]: preference,
        },
      };

      await updateSettings(updatedSettings);
      setSettings(updatedSettings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update window chrome');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyHyprlandRules = async (): Promise<void> => {
    const scheduleReset = (): void => {
      setTimeout(() => setCopySuccess(false), 2000);
    };

    try {
      await invoke('copy_to_clipboard', { text: HYPRLAND_WINDOW_RULES });
      setCopySuccess(true);
      scheduleReset();
      return;
    } catch (tauriError) {
      if (import.meta.env.DEV) {
        console.warn('Tauri clipboard copy failed, attempting navigator clipboard API', tauriError);
      }
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(HYPRLAND_WINDOW_RULES);
        setCopySuccess(true);
        scheduleReset();
      }
    } catch (clipboardError) {
      console.error('Failed to copy Hyprland rules', clipboardError);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error && !settings) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <Button onClick={loadSettings}>Retry</Button>
        </div>
      </Card>
    );
  }

  if (!settings) {
    return <div />;
  }

  const platformKey = resolvePlatformKey(currentPlatform);
  const currentChrome = settings.window_chrome?.[platformKey] ?? 'native';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="mb-2 text-xl font-semibold text-foreground">General Settings</h2>
        <p className="text-sm text-muted-foreground">Customize your application preferences</p>
      </div>

      {/* Status Messages - Fixed height container prevents layout shift */}
      <div className="min-h-[60px]">
        {error && (
          <Card className="p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 transition-opacity duration-300">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </Card>
        )}
        {saveSuccess && (
          <Card className="p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 transition-opacity duration-300">
            <p className="text-green-600 dark:text-green-400">Settings saved successfully</p>
          </Card>
        )}
      </div>

      {/* Theme Settings */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="mb-1 text-lg font-medium text-foreground">Appearance</h3>
            <p className="text-sm text-muted-foreground">Choose how the application looks</p>
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-foreground">Theme</span>
              <div className="grid grid-cols-3 gap-3">
                <ThemeOption
                  label="Light"
                  value="light"
                  currentTheme={settings.theme}
                  onSelect={handleThemeChange}
                  disabled={isSaving}
                />
                <ThemeOption
                  label="Dark"
                  value="dark"
                  currentTheme={settings.theme}
                  onSelect={handleThemeChange}
                  disabled={isSaving}
                />
                <ThemeOption
                  label="System"
                  value="system"
                  currentTheme={settings.theme}
                  onSelect={handleThemeChange}
                  disabled={isSaving}
                />
              </div>
            </label>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="mb-1 text-lg font-medium text-foreground">Window Chrome</h3>
            <p className="text-sm text-muted-foreground">
              Control window decorations on {currentPlatform || 'your'} system.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {WINDOW_CHROME_OPTIONS.map((option) => {
              const isSelected = currentChrome === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleWindowChromeChange(option.value)}
                  disabled={isSaving}
                  className={`rounded-xl border p-4 text-left transition-colors duration-150 supports-[backdrop-filter]:backdrop-blur-sm ${
                    isSelected
                      ? 'border-accent bg-accent/15 shadow-sm'
                      : 'border-border/60 bg-surface-0/85 hover:border-accent/60'
                  }`}
                >
                  <span className="font-medium text-foreground">{option.label}</span>
                  <p className="mt-1 text-sm text-muted-foreground">{option.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Hyprland guidance for Linux users */}
      {currentPlatform === 'linux' && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="mb-1 text-lg font-medium text-foreground">Hyprland Integration</h3>
                <p className="text-sm text-muted-foreground">
                  Apply window rules to keep Snips floating and centered when using Hyprland.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="https://wiki.hyprland.org/Configuring/Window-Rules/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-accent hover:underline"
                  title="Open Hyprland window rule documentation"
                >
                  Hyprland docs
                </a>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyHyprlandRules}
                  title="Copy Hyprland window rules"
                  className="border border-border/40 px-3"
                >
                  {copySuccess ? 'Copied!' : 'Copy rules'}
                </Button>
              </div>
            </div>

            <pre className="rounded-xl border border-border/60 bg-surface-0/85 p-4 text-xs leading-relaxed text-foreground supports-[backdrop-filter]:backdrop-blur-sm">
              {HYPRLAND_WINDOW_RULES}
            </pre>

            <p className="text-xs text-muted-foreground">
              Snips now uses native window chrome on Linux; adjust these rules if you prefer tiling
              behaviour instead.
            </p>
          </div>
        </Card>
      )}

      {/* Startup Behavior - macOS/Windows only */}
      {currentPlatform !== 'linux' && (
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="mb-1 text-lg font-medium text-foreground">Startup</h3>
              <p className="text-sm text-muted-foreground">
                Configure application startup behavior
              </p>
            </div>

            <div className="space-y-3">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-blue-400 dark:bg-gray-700"
                  defaultChecked={true}
                  disabled
                />
                <span className="text-sm text-foreground">Launch at login</span>
              </label>
              <p className="ml-7 text-xs text-muted-foreground">
                {currentPlatform === 'macos'
                  ? 'Configure this in System Preferences → Users & Groups → Login Items'
                  : 'Configure this in Windows Settings → Apps → Startup'}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

/**
 * Theme selection option component
 */
interface ThemeOptionProps {
  label: string;
  value: Theme;
  currentTheme: Theme;
  onSelect: (theme: Theme) => void;
  disabled?: boolean;
}

function ThemeOption({
  label,
  value,
  currentTheme,
  onSelect,
  disabled = false,
}: ThemeOptionProps): ReactElement {
  const isSelected = currentTheme === value;

  return (
    <button
      onClick={() => onSelect(value)}
      disabled={disabled}
      className={`
        rounded-xl border p-4 text-center transition-colors duration-150 supports-[backdrop-filter]:backdrop-blur-sm
        ${
          isSelected
            ? 'border-accent bg-accent/15 shadow-sm'
            : 'border-border/60 bg-surface-0/85 hover:border-accent/60'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      aria-pressed={isSelected}
    >
      <div className="text-sm font-medium text-foreground">{label}</div>
    </button>
  );
}
