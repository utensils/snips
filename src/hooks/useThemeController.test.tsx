import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppSettings } from '@/types/settings';
import type { ThemePalette } from '@/types/theme';

import { useThemeController } from './useThemeController';

const mockListeners = new Map<string, (event: { payload: unknown }) => void>();

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn((event: string, cb: (event: { payload: unknown }) => void) => {
    mockListeners.set(event, cb);
    return Promise.resolve(() => {
      mockListeners.delete(event);
    });
  }),
}));

vi.mock('@/hooks/useTheme', () => ({
  useTheme: vi.fn(() => ({ theme: 'system', isDark: false })),
}));

const mockInvoke = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
  convertFileSrc: vi.fn((path: string) => `asset://${path}`),
}));

const mockPlatform = vi.fn();

vi.mock('@tauri-apps/plugin-os', () => ({
  platform: () => mockPlatform(),
}));

const mockApplyPalette = vi.fn();
const mockClearPalette = vi.fn();

vi.mock('@/lib/theme', () => ({
  applyOmarchyPalette: (palette: ThemePalette, wallpaper?: string | null) =>
    mockApplyPalette(palette, wallpaper),
  clearOmarchyPalette: () => mockClearPalette(),
}));

const baseSettings = {
  window_chrome: {
    macos: 'frameless_shadow',
    linux: 'native',
    windows: 'native',
  },
} as AppSettings;

describe('useThemeController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListeners.clear();
    mockInvoke.mockReset();
    mockPlatform.mockReset();
    mockApplyPalette.mockReset();
    mockClearPalette.mockReset();
    document.documentElement.removeAttribute('data-platform');
    document.documentElement.removeAttribute('data-chrome');
    delete document.documentElement.dataset.omarchyTheme;
    delete document.documentElement.dataset.omarchyLuminance;
    delete document.documentElement.dataset.omarchyIconTheme;
    document.documentElement.style.cssText = '';
  });

  it('initialises platform data attributes and chrome preference', async () => {
    mockPlatform.mockResolvedValue('macos');
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === 'get_settings') {
        return baseSettings;
      }
      throw new Error(`Unexpected command: ${cmd}`);
    });

    const { result } = renderHook(() => useThemeController());

    await waitFor(() => {
      expect(result.current.platform).toBe('macos');
    });

    expect(document.documentElement.getAttribute('data-platform')).toBe('macos');
    expect(document.documentElement.getAttribute('data-chrome')).toBe('frameless-shadow');
    expect(mockClearPalette).toHaveBeenCalledTimes(1);
  });

  it('loads Omarchy palette on linux and responds to appearance updates', async () => {
    const initialPalette: ThemePalette = {
      name: 'omarchy-test',
      colors: { accent: '#3366ff', background: '#ffffff' },
      is_light: true,
      icon_theme: 'adwaita',
      wallpaper: '/tmp/wallpaper.png',
    };

    const updatedPalette: ThemePalette = {
      ...initialPalette,
      name: 'omarchy-new',
    };

    mockPlatform.mockResolvedValue('linux');
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === 'get_settings') {
        return baseSettings;
      }
      if (cmd === 'get_theme_palette') {
        return initialPalette;
      }
      throw new Error(`Unexpected command: ${cmd}`);
    });

    const { result } = renderHook(() => useThemeController());

    await waitFor(() => {
      expect(result.current.platform).toBe('linux');
      expect(result.current.palette).toEqual(initialPalette);
    });

    expect(mockApplyPalette).toHaveBeenCalledWith(initialPalette, 'asset:///tmp/wallpaper.png');

    const appearanceCallback = mockListeners.get('appearance-updated');
    expect(appearanceCallback).toBeDefined();
    await act(async () => {
      appearanceCallback?.({ payload: updatedPalette });
    });

    await waitFor(() => {
      expect(result.current.palette).toEqual(updatedPalette);
    });

    expect(mockApplyPalette).toHaveBeenLastCalledWith(updatedPalette, 'asset:///tmp/wallpaper.png');
  });

  it('applies chrome preference on settings change events', async () => {
    mockPlatform.mockResolvedValue('linux');
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === 'get_settings') {
        return {
          ...baseSettings,
          window_chrome: {
            ...baseSettings.window_chrome,
            linux: 'frameless_shadow',
          },
        };
      }
      if (cmd === 'get_theme_palette') {
        return null;
      }
      throw new Error(`Unexpected command: ${cmd}`);
    });

    renderHook(() => useThemeController());

    await waitFor(() => {
      expect(document.documentElement.getAttribute('data-chrome')).toBe('frameless-shadow');
    });

    await waitFor(() => {
      expect(mockClearPalette).toHaveBeenCalled();
    });

    const settingsCallback = mockListeners.get('settings-changed');
    expect(settingsCallback).toBeDefined();

    await act(async () => {
      settingsCallback?.({
        payload: {
          ...baseSettings,
          window_chrome: {
            ...baseSettings.window_chrome,
            linux: 'native',
          },
        } as AppSettings,
      });
    });

    await waitFor(() => {
      expect(document.documentElement.getAttribute('data-chrome')).toBe('native');
    });
  });
});
