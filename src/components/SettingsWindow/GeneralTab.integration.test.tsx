import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getSettings, updateSettings } from '@/lib/api';
import type { AppSettings } from '@/types/settings';

import { GeneralTab } from './GeneralTab';

// Mock the API
vi.mock('@/lib/api', () => ({
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
}));

// Mock Tauri platform API
vi.mock('@tauri-apps/plugin-os', () => ({
  platform: vi.fn(() => 'macos'),
}));

// Mock Tauri event system
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
  emit: vi.fn(() => Promise.resolve()),
}));

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
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSettings).mockResolvedValue(mockSettings);
    vi.mocked(updateSettings).mockResolvedValue(undefined);
  });

  it('should load and display current theme from settings', async () => {
    render(<GeneralTab />);

    // Wait for settings to load
    await waitFor(() => {
      expect(getSettings).toHaveBeenCalled();
    });

    // Verify theme options are displayed
    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
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

    const darkButton = screen.getByText('Dark').closest('button');

    // Click dark button
    await user.click(darkButton!);

    // Buttons should be disabled immediately
    await waitFor(() => {
      expect(darkButton).toBeDisabled();
      expect(screen.getByText('Light').closest('button')).toBeDisabled();
      expect(screen.getByText('System').closest('button')).toBeDisabled();
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
});
