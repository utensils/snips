import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { getSettings, updateSettings } from '@/lib/api';
import type { AppSettings } from '@/types/settings';

import { GeneralTab } from './GeneralTab';

// Mock the API
vi.mock('@/lib/api', () => ({
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
}));

const platformMock = vi.hoisted(() => vi.fn(() => 'macos'));
const invokeMock = vi.hoisted(() => vi.fn());
const createMatchMedia = (matches: boolean): MediaQueryList => ({
  matches,
  media: '(prefers-color-scheme: dark)',
  onchange: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
  dispatchEvent: vi.fn(() => false),
});
const matchMediaMock = vi.hoisted(() => vi.fn(() => createMatchMedia(false)));
let systemPrefersDark = false;

// Mock Tauri platform API
vi.mock('@tauri-apps/plugin-os', () => ({
  platform: platformMock,
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: invokeMock,
}));

// Mock Tauri event system
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
  emit: vi.fn(() => Promise.resolve()),
}));

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: matchMediaMock,
  });
});

describe('GeneralTab - Theme Selection Integration', () => {
  const mockSettings: AppSettings = {
    storage_type: 'local',
    theme: 'system',
    global_shortcuts: {
      quick_add: 'CommandOrControl+Shift+A',
      search_select: 'CommandOrControl+Shift+S',
    },
    search_settings: {
      max_results: 50,
      enable_fuzzy_search: true,
      search_in_tags: true,
      weight_text_relevance: 10.0,
      weight_usage_frequency: 2.0,
      weight_recency: 1.0,
    },
    privacy_settings: {
      enable_analytics: true,
      track_usage: true,
    },
    window_chrome: {
      macos: 'frameless_shadow',
      linux: 'native',
      windows: 'native',
    },
    quick_window_preferences: {
      float_on_tiling: true,
      per_wm_overrides: {},
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSettings).mockResolvedValue(mockSettings);
    vi.mocked(updateSettings).mockResolvedValue(undefined);
    platformMock.mockReturnValue('macos');
    systemPrefersDark = false;
    matchMediaMock.mockImplementation(() => createMatchMedia(systemPrefersDark));
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'current_window_manager_label') {
        return Promise.resolve('other');
      }
      return Promise.resolve(undefined);
    });
  });

  it('should load and display current theme from settings', async () => {
    render(<GeneralTab />);

    // Wait for settings to load
    await waitFor(() => {
      expect(getSettings).toHaveBeenCalled();
    });

    // Verify theme options are displayed
    expect(screen.getByRole('button', { name: 'Light' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dark' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'System' })).toBeInTheDocument();
  });

  it('should change theme from system to dark', async () => {
    const user = userEvent.setup();
    render(<GeneralTab />);

    // Wait for settings to load
    await waitFor(() => {
      expect(getSettings).toHaveBeenCalled();
    });

    // Click on Dark theme option
    const darkButton = screen.getByText('Dark').closest('button');
    expect(darkButton).toBeInTheDocument();

    await user.click(darkButton!);

    // Verify updateSettings was called with dark theme
    await waitFor(() => {
      expect(updateSettings).toHaveBeenCalledWith({
        ...mockSettings,
        theme: 'dark',
      });
    });

    // Verify success message appears
    await waitFor(() => {
      expect(screen.getByText('Settings saved successfully')).toBeInTheDocument();
    });
  });

  it('should change theme from system to light', async () => {
    const user = userEvent.setup();
    render(<GeneralTab />);

    await waitFor(() => {
      expect(getSettings).toHaveBeenCalled();
    });

    // Click on Light theme option
    const lightButton = screen.getByText('Light').closest('button');
    await user.click(lightButton!);

    // Verify updateSettings was called with light theme
    await waitFor(() => {
      expect(updateSettings).toHaveBeenCalledWith({
        ...mockSettings,
        theme: 'light',
      });
    });

    // Verify success message appears
    await waitFor(() => {
      expect(screen.getByText('Settings saved successfully')).toBeInTheDocument();
    });
  });

  it('should change theme multiple times', async () => {
    const user = userEvent.setup();
    render(<GeneralTab />);

    await waitFor(() => {
      expect(getSettings).toHaveBeenCalled();
    });

    // Change to dark
    const darkButton = screen.getByText('Dark').closest('button');
    await user.click(darkButton!);

    await waitFor(() => {
      expect(updateSettings).toHaveBeenCalledWith({
        ...mockSettings,
        theme: 'dark',
      });
    });

    // Change to light
    const lightButton = screen.getByText('Light').closest('button');
    await user.click(lightButton!);

    await waitFor(() => {
      expect(updateSettings).toHaveBeenCalledWith({
        ...mockSettings,
        theme: 'light',
      });
    });

    // Verify updateSettings was called twice
    expect(updateSettings).toHaveBeenCalledTimes(2);
  });

  it('should display error message when theme update fails', async () => {
    const user = userEvent.setup();
    vi.mocked(updateSettings).mockRejectedValue(new Error('Failed to save settings'));

    render(<GeneralTab />);

    await waitFor(() => {
      expect(getSettings).toHaveBeenCalled();
    });

    // Click on Dark theme option
    const darkButton = screen.getByText('Dark').closest('button');
    await user.click(darkButton!);

    // Verify error message appears
    await waitFor(() => {
      expect(screen.getByText('Failed to save settings')).toBeInTheDocument();
    });

    // Success message should not appear
    expect(screen.queryByText('Settings saved successfully')).not.toBeInTheDocument();
  });

  it('should start with dark theme if loaded from settings', async () => {
    vi.mocked(getSettings).mockResolvedValue({
      ...mockSettings,
      theme: 'dark',
    });

    render(<GeneralTab />);

    await waitFor(() => {
      expect(getSettings).toHaveBeenCalled();
    });

    // Dark button should be selected (has the selected styling)
    const darkButton = screen.getByText('Dark').closest('button');
    expect(darkButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows system theme badge when following dark system preference', async () => {
    systemPrefersDark = true;
    matchMediaMock.mockImplementation(() => createMatchMedia(systemPrefersDark));
    vi.mocked(getSettings).mockResolvedValue({
      ...mockSettings,
      theme: 'system',
    });

    render(<GeneralTab />);

    await waitFor(() => {
      expect(getSettings).toHaveBeenCalled();
    });

    expect(screen.getByText(/Following system preference \(Dark\)/i)).toBeInTheDocument();
    expect(screen.getByTestId('theme-preview-badge-dark')).toHaveTextContent('System');
  });

  it('should start with light theme if loaded from settings', async () => {
    vi.mocked(getSettings).mockResolvedValue({
      ...mockSettings,
      theme: 'light',
    });

    render(<GeneralTab />);

    await waitFor(() => {
      expect(getSettings).toHaveBeenCalled();
    });

    // Light button should be selected
    const lightButton = screen.getByText('Light').closest('button');
    expect(lightButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('should disable theme buttons while saving', async () => {
    const user = userEvent.setup();

    // Make updateSettings slow to simulate network delay
    vi.mocked(updateSettings).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(<GeneralTab />);

    await waitFor(() => {
      expect(getSettings).toHaveBeenCalled();
    });

    // Click dark button
    await user.click(screen.getByRole('button', { name: 'Dark' }));

    // Buttons should be disabled immediately
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Dark' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Light' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'System' })).toBeDisabled();
    });
  });

  it('should show retry button when initial settings load fails', async () => {
    const user = userEvent.setup();
    vi.mocked(getSettings).mockRejectedValueOnce(new Error('Network error'));

    render(<GeneralTab />);

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    // Click retry
    vi.mocked(getSettings).mockResolvedValue(mockSettings);
    const retryButton = screen.getByText('Retry');
    await user.click(retryButton);

    // Settings should load successfully
    await waitFor(() => {
      expect(screen.getByText('Theme')).toBeInTheDocument();
    });
  });

  it('copies Hyprland rules on Linux when copy button is pressed', async () => {
    const user = userEvent.setup();
    platformMock.mockReturnValue('linux');

    render(<GeneralTab />);

    await waitFor(() => {
      expect(getSettings).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('Hyprland Integration')).toBeInTheDocument();
    });

    const copyButton = screen.getByRole('button', { name: /Copy rules/i });
    await user.click(copyButton);

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith('copy_to_clipboard', {
        text: expect.stringContaining('Quick Add Snippet'),
      });
    });
  });

  it('allows Linux users to disable floating quick windows', async () => {
    const user = userEvent.setup();
    platformMock.mockReturnValue('linux');
    invokeMock.mockImplementation((cmd: string) => {
      if (cmd === 'current_window_manager_label') {
        return Promise.resolve('hyprland');
      }
      return Promise.resolve(undefined);
    });

    render(<GeneralTab />);

    await waitFor(() => {
      expect(getSettings).toHaveBeenCalled();
    });

    const toggle = screen.getByRole('checkbox', {
      name: /Keep quick windows floating/i,
    }) as HTMLInputElement;
    expect(toggle).toBeChecked();

    await user.click(toggle);

    await waitFor(() => {
      expect(updateSettings).toHaveBeenCalledWith({
        ...mockSettings,
        quick_window_preferences: {
          ...mockSettings.quick_window_preferences,
          float_on_tiling: false,
          per_wm_overrides: {
            ...mockSettings.quick_window_preferences.per_wm_overrides,
            hyprland: false,
          },
        },
      });
    });

    await waitFor(() => {
      expect(toggle).not.toBeChecked();
    });
  });
});
