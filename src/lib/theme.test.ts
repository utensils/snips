import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ThemePalette } from '@/types/theme';

import { applyOmarchyPalette, clearOmarchyPalette } from './theme';

const root = document.documentElement;

const basePalette: ThemePalette = {
  name: 'test-theme',
  colors: {
    background: '#ffffff',
    foreground: '#1a1a1a',
    text: '#1a1a1a',
    surface: '#f4f4f4',
    muted: '#dddddd',
    border: '#cccccc',
    accent: '#3366ff',
    selected_text: '#3366ff',
  },
  is_light: true,
  icon_theme: 'adwaita',
  wallpaper: '/tmp/wallpaper.png',
};

describe('applyOmarchyPalette', () => {
  beforeEach(() => {
    clearOmarchyPalette();
    root.style.cssText = '';
  });

  afterEach(() => {
    clearOmarchyPalette();
    vi.restoreAllMocks();
  });

  it('sets dataset attributes and CSS variables', () => {
    applyOmarchyPalette(basePalette, 'asset:///wallpaper.png');

    expect(root.dataset.omarchyTheme).toBe('test-theme');
    expect(root.dataset.omarchyLuminance).toBe('light');
    expect(root.dataset.omarchyIconTheme).toBe('adwaita');

    expect(root.style.getPropertyValue('--background')).not.toBe('');
    expect(root.style.getPropertyValue('--foreground')).not.toBe('');
    expect(root.style.getPropertyValue('--omarchy-wallpaper')).toContain('asset:///wallpaper.png');
  });

  it('emits warnings for insufficient contrast in development', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const lowContrastPalette: ThemePalette = {
      ...basePalette,
      name: 'low-contrast',
      colors: {
        ...basePalette.colors,
        background: '#101010',
        foreground: '#111111',
        text: '#111111',
      },
    };

    applyOmarchyPalette(lowContrastPalette, null);

    const warnings = warnSpy.mock.calls
      .flat()
      .filter((call): call is string => typeof call === 'string');
    expect(warnings.some((message) => message.includes('low foreground/background contrast'))).toBe(
      true
    );
  });

  it('clears palette state when requested', () => {
    applyOmarchyPalette(basePalette, null);
    clearOmarchyPalette();

    expect(root.dataset.omarchyTheme).toBeUndefined();
    expect(root.style.getPropertyValue('--background')).toBe('');
    expect(root.style.getPropertyValue('--omarchy-wallpaper')).toBe('');
  });
});
