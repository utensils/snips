import { invoke } from '@tauri-apps/api/core';
import { platform } from '@tauri-apps/plugin-os';
import { type ReactElement, type ReactNode, useEffect, useState } from 'react';

import {
  PreferenceCard,
  SegmentedControl,
  ThemePreview,
  type SegmentedOption,
} from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
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

const THEME_OPTIONS: SegmentedOption[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'System' },
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
  const [currentWindowManager, setCurrentWindowManager] = useState<string>('');
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

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
    void loadWindowManager();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent): void => {
      setSystemPrefersDark(event.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);
  const loadSettings = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getSettings();
      setSettings({
        ...data,
        quick_window_preferences: {
          float_on_tiling: data.quick_window_preferences?.float_on_tiling ?? true,
          per_wm_overrides: data.quick_window_preferences?.per_wm_overrides ?? {},
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const loadWindowManager = async (): Promise<void> => {
    try {
      const wmLabel = await invoke<string>('current_window_manager_label');
      setCurrentWindowManager(wmLabel);
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('Failed to detect current window manager', err);
      }
      setCurrentWindowManager('other');
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

  const handleQuickWindowFloatingChange = async (enabled: boolean): Promise<void> => {
    if (!settings) return;

    try {
      setIsSaving(true);
      setError(null);
      setSaveSuccess(false);

      const perWmOverrides = {
        ...(settings.quick_window_preferences?.per_wm_overrides ?? {}),
      };

      if (currentWindowManager) {
        perWmOverrides[currentWindowManager] = enabled;
      }

      const updatedSettings: AppSettings = {
        ...settings,
        quick_window_preferences: {
          ...settings.quick_window_preferences,
          float_on_tiling: enabled,
          per_wm_overrides: perWmOverrides,
        },
      };

      await updateSettings(updatedSettings);
      setSettings(updatedSettings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update quick window behaviour preference'
      );
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
      <PreferenceCard
        title="Unable to load settings"
        description="Something went wrong while loading your preferences."
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-red-500 dark:text-red-300">{error}</p>
          <Button variant="primary" onClick={loadSettings} disabled={isLoading}>
            Retry
          </Button>
        </div>
      </PreferenceCard>
    );
  }

  if (!settings) {
    return <div />;
  }

  const platformKey = resolvePlatformKey(currentPlatform);
  const currentChrome = settings.window_chrome?.[platformKey] ?? 'native';
  const quickWindowPreferences = settings.quick_window_preferences;
  const currentWindowManagerOverride = currentWindowManager
    ? quickWindowPreferences?.per_wm_overrides?.[currentWindowManager]
    : undefined;
  const effectiveQuickWindowFloating =
    currentWindowManagerOverride ?? quickWindowPreferences?.float_on_tiling ?? true;
  const effectiveTheme: Theme =
    settings.theme === 'system' ? (systemPrefersDark ? 'dark' : 'light') : settings.theme;

  const themeStatusText =
    settings.theme === 'system'
      ? `Following system preference (${systemPrefersDark ? 'Dark' : 'Light'})`
      : settings.theme === 'dark'
        ? 'Dark theme active'
        : 'Light theme active';

  const getPreviewBadge = (variant: 'light' | 'dark'): string | undefined => {
    if (variant !== effectiveTheme) {
      return undefined;
    }
    return settings.theme === 'system' ? 'System' : 'Active';
  };

  return (
    <div className="space-y-6 text-[color:hsl(var(--text-primary))]">
      <header className="space-y-1">
        <h2 className="typography-title text-[color:hsl(var(--text-primary))]">General Settings</h2>
        <p className="typography-body text-[color:hsl(var(--text-secondary))]">
          Customize your application preferences
        </p>
      </header>

      <div className="min-h-[48px] space-y-2">
        {error ? <StatusBanner variant="error">{error}</StatusBanner> : null}
        {saveSuccess ? (
          <StatusBanner variant="success">Settings saved successfully</StatusBanner>
        ) : null}
      </div>

      <PreferenceCard title="Appearance" description="Choose how the application looks">
        <div className="space-y-2">
          <span className="typography-caption text-[color:hsl(var(--text-secondary))]">Theme</span>
          <SegmentedControl
            options={THEME_OPTIONS.map((option) => ({
              ...option,
              disabled: isSaving,
            }))}
            value={settings.theme}
            onChange={(value) => handleThemeChange(value as Theme)}
            ariaLabel="Theme preference"
          />
          <div className="grid gap-3 md:grid-cols-2">
            <ThemePreview
              variant="light"
              isActive={effectiveTheme === 'light'}
              badge={getPreviewBadge('light')}
            />
            <ThemePreview
              variant="dark"
              isActive={effectiveTheme === 'dark'}
              badge={getPreviewBadge('dark')}
            />
          </div>
          <p className="typography-caption text-[color:hsl(var(--text-secondary))]">
            {themeStatusText}
          </p>
        </div>
      </PreferenceCard>

      <PreferenceCard
        title="Window Chrome"
        description={`Control window decorations on ${currentPlatform || 'your'} system.`}
      >
        <SegmentedControl
          options={WINDOW_CHROME_OPTIONS.map((option) => ({
            id: option.value,
            label: option.label,
            description: option.description,
            disabled: isSaving,
          }))}
          value={currentChrome}
          onChange={(value) => handleWindowChromeChange(value as WindowChromePreference)}
          ariaLabel="Window chrome preference"
        />

        {currentPlatform === 'linux' && (
          <div className="rounded-[9px] border border-[hsl(var(--outline-soft))] bg-[hsl(var(--surface-subtle))] p-4">
            <label
              htmlFor="keep-quick-windows-floating"
              className="flex cursor-pointer items-start gap-3"
            >
              <Checkbox
                id="keep-quick-windows-floating"
                checked={effectiveQuickWindowFloating}
                onChange={(event) => handleQuickWindowFloatingChange(event.target.checked)}
                disabled={isSaving}
                aria-describedby="keep-quick-windows-floating-description"
              />
              <div className="space-y-1">
                <p className="typography-body font-medium text-[color:hsl(var(--text-primary))]">
                  Keep quick windows floating
                </p>
                <p
                  id="keep-quick-windows-floating-description"
                  className="typography-caption text-[color:hsl(var(--text-secondary))]"
                >
                  Search and Quick Add stay above tiling window managers (Hyprland, Sway, River).
                  {currentWindowManager && currentWindowManager !== 'other' && (
                    <span> This preference currently applies to {currentWindowManager}.</span>
                  )}{' '}
                  Disable if you prefer them to tile with the rest of your workspace.
                </p>
              </div>
            </label>
          </div>
        )}
      </PreferenceCard>

      {currentPlatform !== 'linux' && (
        <PreferenceCard title="Startup" description="Configure application startup behavior">
          <div className="space-y-2">
            <label className="flex items-center gap-3">
              <Checkbox checked readOnly disabled className="pointer-events-none opacity-60" />
              <span className="typography-body text-[color:hsl(var(--text-secondary))]">
                Launch at login (configured via system settings)
              </span>
            </label>
            <p className="typography-caption text-[color:hsl(var(--text-secondary))]">
              {currentPlatform === 'macos'
                ? 'Open System Settings → General → Login Items to manage Snips.'
                : 'Open Windows Settings → Apps → Startup to manage Snips.'}
            </p>
          </div>
        </PreferenceCard>
      )}

      {currentPlatform === 'linux' && (
        <PreferenceCard
          title="Hyprland Integration"
          description="Apply window rules to keep Snips floating and centered when using Hyprland."
          actions={
            <div className="flex items-center gap-3">
              <a
                href="https://wiki.hyprland.org/Configuring/Window-Rules/"
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-[color:hsl(var(--accent))] hover:underline"
                title="Open Hyprland window rule documentation"
              >
                Hyprland docs
              </a>
              <Button
                variant="tonal"
                size="sm"
                onClick={handleCopyHyprlandRules}
                title="Copy Hyprland window rules"
              >
                {copySuccess ? 'Copied!' : 'Copy rules'}
              </Button>
            </div>
          }
        >
          <pre className="rounded-[9px] border border-[hsl(var(--outline-soft))] bg-[hsl(var(--surface-subtle))] p-4 text-xs leading-relaxed">
            {HYPRLAND_WINDOW_RULES}
          </pre>
          <p className="typography-caption text-[color:hsl(var(--text-secondary))]">
            Snips uses native window chrome on Linux; adjust these rules if you prefer tiling
            behaviour instead.
          </p>
        </PreferenceCard>
      )}
    </div>
  );
}

interface StatusBannerProps {
  variant: 'success' | 'error';
  children: ReactNode;
}

function StatusBanner({ variant, children }: StatusBannerProps): ReactElement {
  const variantClasses =
    variant === 'success'
      ? 'border border-[color-mix(in_srgb,hsl(var(--accent))_35%,transparent)] bg-[color-mix(in_srgb,hsl(var(--accent))_12%,hsl(var(--surface-subtle)))] text-[color:hsl(var(--accent))]'
      : 'border border-red-400/40 bg-red-500/10 text-red-500 dark:text-red-300';

  return (
    <div className={`typography-body rounded-[9px] px-4 py-3 ${variantClasses}`} role="status">
      {children}
    </div>
  );
}
