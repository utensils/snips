import type { ThemePalette } from '@/types/theme';

const COLOR_MAPPING: Record<string, string[]> = {
  '--background': ['base', 'background'],
  '--foreground': ['text', 'foreground'],
  '--primary': ['selected_text', 'accent'],
  '--primary-foreground': ['foreground', 'text'],
  '--border': ['border'],
  '--muted': ['surface', 'muted'],
  '--muted-foreground': ['muted_foreground', 'muted'],
};

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(Math.max(value, min), max);
}

function rgbToHsl(r: number, g: number, b: number): string {
  const rNorm = clamp(r / 255);
  const gNorm = clamp(g / 255);
  const bNorm = clamp(b / 255);

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
        break;
      case gNorm:
        h = (bNorm - rNorm) / d + 2;
        break;
      case bNorm:
        h = (rNorm - gNorm) / d + 4;
        break;
      default:
        break;
    }
    h /= 6;
  }

  const hue = Math.round(clamp(h) * 360);
  const saturation = Math.round(clamp(s) * 100);
  const lightness = Math.round(clamp(l) * 100);

  return `${hue} ${saturation}% ${lightness}%`;
}

function normalizeHsl(value: string): string | null {
  const trimmed = value.trim();

  if (trimmed.startsWith('#')) {
    const hex = trimmed.replace('#', '');
    const normalized =
      hex.length === 3
        ? hex
            .split('')
            .map((c) => c + c)
            .join('')
        : hex;

    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
      return null;
    }

    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    return rgbToHsl(r, g, b);
  }

  if (trimmed.startsWith('rgb')) {
    const match = trimmed
      .replace(/rgba?\(/, '')
      .replace(')', '')
      .split(',')
      .map((token) => token.trim())
      .slice(0, 3)
      .map((token) => Number.parseFloat(token));
    if (match.some((component) => Number.isNaN(component))) {
      return null;
    }
    return rgbToHsl(match[0], match[1], match[2]);
  }

  if (trimmed.startsWith('hsl')) {
    const parts = trimmed
      .replace('hsl(', '')
      .replace(')', '')
      .split(',')
      .map((token) => token.trim());
    if (parts.length < 3) {
      return null;
    }
    const [h, s, l] = parts;
    return `${h.replace('deg', '').trim()} ${s.trim()} ${l.trim()}`;
  }

  return null;
}

export function applyOmarchyPalette(palette: ThemePalette, wallpaperSrc?: string | null): void {
  const root = document.documentElement;
  root.dataset.omarchyTheme = palette.name;
  root.dataset.omarchyLuminance = palette.is_light ? 'light' : 'dark';

  const entries = Object.entries(COLOR_MAPPING) as Array<[string, string[]]>;
  entries.forEach(([cssVar, keys]) => {
    const colorKey = keys.find((key) => palette.colors[key] !== undefined);
    if (!colorKey) {
      return;
    }

    const value = palette.colors[colorKey];
    const hsl = normalizeHsl(value);
    if (hsl) {
      root.style.setProperty(cssVar, hsl);
    }
  });

  if (palette.icon_theme) {
    root.dataset.omarchyIconTheme = palette.icon_theme;
  } else {
    delete root.dataset.omarchyIconTheme;
  }

  const iconAccent = palette.colors.selected_text ?? palette.colors.accent;
  const iconAccentHsl = iconAccent ? normalizeHsl(iconAccent) : null;
  if (iconAccentHsl) {
    root.style.setProperty('--icon-theme', iconAccentHsl);
  }

  if (wallpaperSrc) {
    root.style.setProperty('--omarchy-wallpaper', `url('${wallpaperSrc}')`);
  } else {
    root.style.removeProperty('--omarchy-wallpaper');
  }
}
