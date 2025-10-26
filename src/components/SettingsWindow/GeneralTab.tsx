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
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          General Settings
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Customize your application preferences
        </p>
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
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
              Appearance
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Choose how the application looks
            </p>
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Theme
              </span>
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
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
              Window Chrome
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
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
                  className={`border rounded-lg p-4 text-left transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                  }`}
                >
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {option.label}
                  </span>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {option.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Hyprland guidance for Linux users */}
      {currentPlatform === 'linux' && (
        <Card className="p-6">
          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
                Hyprland Integration
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Apply window rules to keep Snips floating and centered when using Hyprland.
              </p>
            </div>

            <pre className="bg-gray-100 dark:bg-gray-900/90 text-gray-800 dark:text-gray-100 rounded-lg p-4 text-xs leading-relaxed">
              {`windowrulev2 = float, title:^(Quick Add Snippet)$
windowrulev2 = center, title:^(Quick Add Snippet)$
windowrulev2 = size 650 700, title:^(Quick Add Snippet)$
windowrulev2 = float, title:^(Snips)$
windowrulev2 = center, title:^(Snips)$`}
            </pre>

            <p className="text-xs text-gray-500 dark:text-gray-400">
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
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">Startup</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
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
                <span className="text-sm text-gray-700 dark:text-gray-300">Launch at login</span>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 ml-7">
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
        p-4 rounded-lg border-2 transition-all text-center
        ${
          isSelected
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      aria-pressed={isSelected}
    >
      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</div>
    </button>
  );
}
