/**
 * Utilities for working with colors and calculating contrast
 */

/**
 * Represents RGB color components
 */
export interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * Parse a hex color string (e.g., "#FF5733" or "FF5733") into RGB
 *
 * @param hex - Hex color string
 * @returns RGB object
 * @throws {Error} If hex string is invalid
 */
export function hexToRgb(hex: string): RGB {
  const cleanHex = hex.trim().replace(/^#/, '');

  if (cleanHex.length !== 6) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  return { r, g, b };
}

/**
 * Convert RGB to hex string
 *
 * @param rgb - RGB object
 * @returns Hex color string with # prefix
 */
export function rgbToHex(rgb: RGB): string {
  const toHex = (n: number): string => {
    const hex = Math.round(n).toString(16).toUpperCase();
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/**
 * Linearize sRGB color component for luminance calculation
 *
 * @param component - Color component value (0-1)
 * @returns Linearized value
 */
function linearize(component: number): number {
  if (component <= 0.03928) {
    return component / 12.92;
  }
  return Math.pow((component + 0.055) / 1.055, 2.4);
}

/**
 * Calculate relative luminance according to WCAG 2.1
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 *
 * @param rgb - RGB object
 * @returns Relative luminance (0-1)
 */
export function getLuminance(rgb: RGB): number {
  const r = linearize(rgb.r / 255);
  const g = linearize(rgb.g / 255);
  const b = linearize(rgb.b / 255);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio between two colors according to WCAG 2.1
 * https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 *
 * @param color1 - First RGB color
 * @param color2 - Second RGB color
 * @returns Contrast ratio (1-21)
 */
export function getContrastRatio(color1: RGB, color2: RGB): number {
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Determine the best text color (black or white) for a given background color
 * Uses WCAG 2.1 relative luminance and contrast ratio for accessibility
 * Returns "#000000" for dark text or "#FFFFFF" for light text
 *
 * @param bgColor - Background hex color
 * @returns Best text color hex string
 */
export function getTextColor(bgColor: string): string {
  const bg = hexToRgb(bgColor);
  const black: RGB = { r: 0, g: 0, b: 0 };
  const white: RGB = { r: 255, g: 255, b: 255 };

  const contrastWithBlack = getContrastRatio(bg, black);
  const contrastWithWhite = getContrastRatio(bg, white);

  return contrastWithBlack > contrastWithWhite ? '#000000' : '#FFFFFF';
}

/**
 * Result of text color calculation with contrast ratio
 */
export interface TextColorResult {
  textColor: string;
  contrastRatio: number;
}

/**
 * Get text color with contrast ratio information
 *
 * @param bgColor - Background hex color
 * @returns Text color and contrast ratio
 */
export function getTextColorWithRatio(bgColor: string): TextColorResult {
  const bg = hexToRgb(bgColor);
  const black: RGB = { r: 0, g: 0, b: 0 };
  const white: RGB = { r: 255, g: 255, b: 255 };

  const contrastWithBlack = getContrastRatio(bg, black);
  const contrastWithWhite = getContrastRatio(bg, white);

  if (contrastWithBlack > contrastWithWhite) {
    return {
      textColor: '#000000',
      contrastRatio: contrastWithBlack,
    };
  }
  return {
    textColor: '#FFFFFF',
    contrastRatio: contrastWithWhite,
  };
}

/**
 * Validate if a string is a valid hex color
 *
 * @param hex - Hex color string to validate
 * @returns True if valid
 */
export function isValidHex(hex: string): boolean {
  try {
    hexToRgb(hex);
    return true;
  } catch {
    return false;
  }
}
