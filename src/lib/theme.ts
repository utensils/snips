import type { ThemePalette } from '@/types/theme';

const ROLE_MAPPING: Array<{ cssVar: string; keys: string[] }> = [
  { cssVar: '--color-neutral-0', keys: ['base', 'background'] },
  { cssVar: '--color-neutral-1', keys: ['surface', 'surface_highlight', 'surface_alt'] },
  { cssVar: '--color-neutral-2', keys: ['muted', 'surface_low', 'surface_raised'] },
  { cssVar: '--color-neutral-3', keys: ['shadow', 'surface_deep', 'surface_darker'] },
  { cssVar: '--color-text-primary', keys: ['text', 'foreground'] },
  {
    cssVar: '--color-text-secondary',
    keys: ['text_secondary', 'muted_foreground', 'text_disabled', 'muted'],
  },
  { cssVar: '--color-accent-primary', keys: ['accent', 'selected_text', 'highlight'] },
  {
    cssVar: '--color-accent-foreground',
    keys: ['accent_foreground', 'foreground', 'text', 'background'],
  },
  { cssVar: '--color-outline-strong', keys: ['outline_strong', 'outline', 'border'] },
  { cssVar: '--color-outline-soft', keys: ['outline_soft', 'surface', 'border', 'muted'] },
  { cssVar: '--color-muted', keys: ['surface_muted', 'muted', 'surface'] },
  {
    cssVar: '--color-muted-foreground',
    keys: ['muted_foreground', 'text_disabled', 'text_secondary'],
  },
];

const LEGACY_DERIVED_VARS = [
  '--background',
  '--foreground',
  '--primary',
  '--primary-foreground',
  '--secondary',
  '--secondary-foreground',
  '--accent',
  '--accent-foreground',
  '--muted',
  '--muted-foreground',
  '--border',
  '--border-soft',
  '--surface-0',
  '--surface-1',
  '--surface-2',
  '--surface-3',
  '--surface-window',
  '--surface-raised',
  '--surface-subtle',
  '--outline-soft',
  '--outline-strong',
  '--text-primary',
  '--text-secondary',
  '--input',
  '--ring',
];

const OMARCHY_STYLE_VARS = new Set<string>([
  ...ROLE_MAPPING.map((role) => role.cssVar),
  ...LEGACY_DERIVED_VARS,
  '--icon-theme',
  '--omarchy-wallpaper',
]);

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
    const components = trimmed
      .replace(/rgba?\(/, '')
      .replace(')', '')
      .split(',')
      .map((token) => Number.parseFloat(token.trim()))
      .filter((component) => Number.isFinite(component));

    if (components.length < 3) {
      return null;
    }

    const [r, g, b] = components.slice(0, 3) as [number, number, number];
    return rgbToHsl(r, g, b);
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
    if (!h || !s || !l) {
      return null;
    }
    return `${h.replace('deg', '').trim()} ${s.trim()} ${l.trim()}`;
  }

  return null;
}

function parseHslTriplet(value: string): [number, number, number] | null {
  const parts = value.trim().replace(/\s+/g, ' ').split(' ').filter(Boolean);

  if (parts.length < 3) {
    return null;
  }

  const [huePart, saturationPart, lightnessPart] = parts as [string, string, string];
  const hue = Number.parseFloat(huePart);
  const saturation = Number.parseFloat(saturationPart.replace('%', '')) / 100;
  const lightness = Number.parseFloat(lightnessPart.replace('%', '')) / 100;

  if ([hue, saturation, lightness].some((component) => !Number.isFinite(component))) {
    return null;
  }

  return [hue, Math.min(Math.max(saturation, 0), 1), Math.min(Math.max(lightness, 0), 1)];
}

function hslToRgbTriplet(h: number, s: number, l: number): [number, number, number] {
  const hue = ((h % 360) + 360) % 360;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const hueSegment = hue / 60;
  const secondary = chroma * (1 - Math.abs((hueSegment % 2) - 1));

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (hueSegment >= 0 && hueSegment < 1) {
    r1 = chroma;
    g1 = secondary;
  } else if (hueSegment < 2) {
    r1 = secondary;
    g1 = chroma;
  } else if (hueSegment < 3) {
    g1 = chroma;
    b1 = secondary;
  } else if (hueSegment < 4) {
    g1 = secondary;
    b1 = chroma;
  } else if (hueSegment < 5) {
    r1 = secondary;
    b1 = chroma;
  } else {
    r1 = chroma;
    b1 = secondary;
  }

  const match = l - chroma / 2;
  const to255 = (value: number): number => Math.round((value + match) * 255);

  return [to255(r1), to255(g1), to255(b1)];
}

function srgbToLinear(value: number): number {
  const normalized = value / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const rLinear = srgbToLinear(r);
  const gLinear = srgbToLinear(g);
  const bLinear = srgbToLinear(b);
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

function contrastRatio(l1: number, l2: number): number {
  const [maxLum, minLum] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (maxLum + 0.05) / (minLum + 0.05);
}

function luminanceFromCssValue(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = parseHslTriplet(value);
  if (!parsed) {
    return null;
  }

  const rgb = hslToRgbTriplet(parsed[0], parsed[1], parsed[2]);
  return relativeLuminance(rgb);
}

export function applyOmarchyPalette(palette: ThemePalette, wallpaperSrc?: string | null): void {
  const root = document.documentElement;
  root.dataset.omarchyTheme = palette.name;
  root.dataset.omarchyLuminance = palette.is_light ? 'light' : 'dark';

  const appliedValues = new Map<string, string>();

  ROLE_MAPPING.forEach(({ cssVar, keys }) => {
    const colorKey = keys.find((key) => palette.colors[key] !== undefined);
    if (!colorKey) {
      return;
    }

    const value = palette.colors[colorKey];
    if (!value) {
      return;
    }
    const hsl = normalizeHsl(value);
    if (!hsl) {
      return;
    }

    root.style.setProperty(cssVar, hsl);
    appliedValues.set(cssVar, hsl);
  });

  if (palette.icon_theme) {
    root.dataset.omarchyIconTheme = palette.icon_theme;
  } else {
    delete root.dataset.omarchyIconTheme;
  }

  const iconAccentCandidates = [palette.colors.selected_text, palette.colors.accent];
  const iconAccent = iconAccentCandidates.find((candidate): candidate is string =>
    Boolean(candidate)
  );
  const iconAccentHsl = iconAccent ? normalizeHsl(iconAccent) : null;
  if (iconAccentHsl) {
    root.style.setProperty('--icon-theme', iconAccentHsl);
  }

  if (wallpaperSrc) {
    root.style.setProperty('--omarchy-wallpaper', `url('${wallpaperSrc}')`);
  } else {
    root.style.removeProperty('--omarchy-wallpaper');
  }

  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const computedStyles = window.getComputedStyle(root);
    const resolveValue = (cssVar: string): string | null => {
      const inline = appliedValues.get(cssVar) ?? root.style.getPropertyValue(cssVar);
      if (inline && inline.trim()) {
        return inline.trim();
      }
      const computed = computedStyles.getPropertyValue(cssVar).trim();
      return computed || null;
    };

    const colorPairs: Array<{ background: string; foreground: string; label: string }> = [
      {
        background: '--color-neutral-0',
        foreground: '--color-text-primary',
        label: 'text-primary on neutral-0',
      },
      {
        background: '--color-neutral-1',
        foreground: '--color-text-primary',
        label: 'text-primary on neutral-1',
      },
      {
        background: '--color-neutral-0',
        foreground: '--color-accent-primary',
        label: 'accent on neutral-0',
      },
      {
        background: '--color-accent-primary',
        foreground: '--color-accent-foreground',
        label: 'accent foreground',
      },
    ];

    colorPairs.forEach(({ background, foreground, label }) => {
      const backgroundValue = resolveValue(background);
      const foregroundValue = resolveValue(foreground);
      if (!backgroundValue || !foregroundValue) {
        return;
      }

      const backgroundLuminance = luminanceFromCssValue(backgroundValue);
      const foregroundLuminance = luminanceFromCssValue(foregroundValue);
      if (backgroundLuminance === null || foregroundLuminance === null) {
        return;
      }

      const ratio = contrastRatio(backgroundLuminance, foregroundLuminance);
      if (ratio < 4.5) {
        console.warn(
          `Omarchy theme "${palette.name}" has low ${label} contrast (ratio ${ratio.toFixed(2)}). Consider adjusting palette tokens for accessibility.`
        );
      }
    });
  }
}

export function clearOmarchyPalette(): void {
  const root = document.documentElement;
  delete root.dataset.omarchyTheme;
  delete root.dataset.omarchyLuminance;
  delete root.dataset.omarchyIconTheme;

  OMARCHY_STYLE_VARS.forEach((cssVar) => {
    root.style.removeProperty(cssVar);
  });
}
