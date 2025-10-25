import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getSettings } from '@/lib/api';
import type { AppSettings } from '@/types/settings';

import { useTheme } from './useTheme';

// Mock the API
vi.mock('@/lib/api', () => ({
  getSettings: vi.fn(),
}));

// Mock Tauri event system
const mockListenCallbacks: Map<string, (event: unknown) => void> = new Map();

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn((eventName: string, callback: (event: unknown) => void) => {
    mockListenCallbacks.set(eventName, callback);
    return Promise.resolve(() => {
      mockListenCallbacks.delete(eventName);
    });
  }),
}));

// Helper to trigger settings-changed event
const emitSettingsChanged = (settings: AppSettings): void => {
  const callback = mockListenCallbacks.get('settings-changed');
  if (callback) {
    callback({ payload: settings });
  }
};

describe('useTheme', () => {
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
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockListenCallbacks.clear();

    // Default mock: return system theme
    vi.mocked(getSettings).mockResolvedValue(mockSettings);

    // Mock matchMedia for system preference detection
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)' ? false : true,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('should load theme from settings on mount', async () => {
    const { result } = renderHook(() => useTheme());

    // Initially shows system theme (default)
    expect(result.current.theme).toBe('system');

    // Wait for settings to load
    await waitFor(() => {
      expect(result.current.theme).toBe('system');
    });

    expect(getSettings).toHaveBeenCalledTimes(1);
  });

  it('should load dark theme from settings', async () => {
    vi.mocked(getSettings).mockResolvedValue({
      ...mockSettings,
      theme: 'dark',
    });

    const { result } = renderHook(() => useTheme());

    await waitFor(() => {
      expect(result.current.theme).toBe('dark');
      expect(result.current.isDark).toBe(true);
    });
  });

  it('should load light theme from settings', async () => {
    vi.mocked(getSettings).mockResolvedValue({
      ...mockSettings,
      theme: 'light',
    });

    const { result } = renderHook(() => useTheme());

    await waitFor(() => {
      expect(result.current.theme).toBe('light');
      expect(result.current.isDark).toBe(false);
    });
  });

  it('should fall back to system theme on settings load error', async () => {
    vi.mocked(getSettings).mockRejectedValue(new Error('Failed to load settings'));

    const { result } = renderHook(() => useTheme());

    await waitFor(() => {
      expect(result.current.theme).toBe('system');
    });
  });

  it('should update theme when settings-changed event is emitted', async () => {
    const { result } = renderHook(() => useTheme());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.theme).toBe('system');
    });

    // Emit settings change event with dark theme - wrapped in waitFor for act()
    await waitFor(() => {
      emitSettingsChanged({
        ...mockSettings,
        theme: 'dark',
      });
    });

    // Theme should update
    await waitFor(() => {
      expect(result.current.theme).toBe('dark');
      expect(result.current.isDark).toBe(true);
    });
  });

  it('should update theme multiple times via events', async () => {
    const { result } = renderHook(() => useTheme());

    await waitFor(() => {
      expect(result.current.theme).toBe('system');
    });

    // Change to dark - wrapped in waitFor for act()
    await waitFor(() => {
      emitSettingsChanged({
        ...mockSettings,
        theme: 'dark',
      });
    });

    await waitFor(() => {
      expect(result.current.theme).toBe('dark');
    });

    // Change to light - wrapped in waitFor for act()
    await waitFor(() => {
      emitSettingsChanged({
        ...mockSettings,
        theme: 'light',
      });
    });

    await waitFor(() => {
      expect(result.current.theme).toBe('light');
      expect(result.current.isDark).toBe(false);
    });
  });

  it('should apply dark class to document when theme is dark', async () => {
    vi.mocked(getSettings).mockResolvedValue({
      ...mockSettings,
      theme: 'dark',
    });

    const { result } = renderHook(() => useTheme());

    await waitFor(() => {
      expect(result.current.theme).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  it('should remove dark class from document when theme is light', async () => {
    vi.mocked(getSettings).mockResolvedValue({
      ...mockSettings,
      theme: 'light',
    });

    // Add dark class first
    document.documentElement.classList.add('dark');

    const { result } = renderHook(() => useTheme());

    await waitFor(() => {
      expect(result.current.theme).toBe('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  it('should respect system preference when theme is system and preference is dark', async () => {
    // Mock dark mode system preference
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)' ? true : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    vi.mocked(getSettings).mockResolvedValue({
      ...mockSettings,
      theme: 'system',
    });

    const { result } = renderHook(() => useTheme());

    await waitFor(() => {
      expect(result.current.theme).toBe('system');
      expect(result.current.isDark).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  it('should respect system preference when theme is system and preference is light', async () => {
    // Mock light mode system preference
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)' ? false : true,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    vi.mocked(getSettings).mockResolvedValue({
      ...mockSettings,
      theme: 'system',
    });

    const { result } = renderHook(() => useTheme());

    await waitFor(() => {
      expect(result.current.theme).toBe('system');
      expect(result.current.isDark).toBe(false);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  it('should clean up event listener on unmount', async () => {
    const { unmount } = renderHook(() => useTheme());

    await waitFor(() => {
      expect(mockListenCallbacks.has('settings-changed')).toBe(true);
    });

    unmount();

    await waitFor(() => {
      expect(mockListenCallbacks.has('settings-changed')).toBe(false);
    });
  });
});
