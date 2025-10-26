import { describe, expect, it } from 'vitest';

import {
  getContrastRatio,
  getLuminance,
  getTextColor,
  getTextColorWithRatio,
  hexToRgb,
  isValidHex,
  rgbToHex,
} from './color';

describe('color utilities', () => {
  describe('hexToRgb', () => {
    it('should parse hex with hash prefix', () => {
      const rgb = hexToRgb('#FF5733');
      expect(rgb).toEqual({ r: 255, g: 87, b: 51 });
    });

    it('should parse hex without hash prefix', () => {
      const rgb = hexToRgb('FF5733');
      expect(rgb).toEqual({ r: 255, g: 87, b: 51 });
    });

    it('should throw error for invalid hex length', () => {
      expect(() => hexToRgb('#FF')).toThrow('Invalid hex color');
    });

    it('should throw error for invalid hex characters', () => {
      expect(() => hexToRgb('#GGGGGG')).toThrow('Invalid hex color');
    });
  });

  describe('rgbToHex', () => {
    it('should convert RGB to hex', () => {
      const hex = rgbToHex({ r: 255, g: 87, b: 51 });
      expect(hex).toBe('#FF5733');
    });

    it('should handle black', () => {
      const hex = rgbToHex({ r: 0, g: 0, b: 0 });
      expect(hex).toBe('#000000');
    });

    it('should handle white', () => {
      const hex = rgbToHex({ r: 255, g: 255, b: 255 });
      expect(hex).toBe('#FFFFFF');
    });
  });

  describe('getLuminance', () => {
    it('should calculate luminance for white', () => {
      const white = { r: 255, g: 255, b: 255 };
      const luminance = getLuminance(white);
      expect(luminance).toBeGreaterThan(0.9);
    });

    it('should calculate luminance for black', () => {
      const black = { r: 0, g: 0, b: 0 };
      const luminance = getLuminance(black);
      expect(luminance).toBeLessThan(0.1);
    });

    it('should have white brighter than black', () => {
      const white = { r: 255, g: 255, b: 255 };
      const black = { r: 0, g: 0, b: 0 };
      expect(getLuminance(white)).toBeGreaterThan(getLuminance(black));
    });
  });

  describe('getContrastRatio', () => {
    it('should calculate maximum contrast for black and white', () => {
      const white = { r: 255, g: 255, b: 255 };
      const black = { r: 0, g: 0, b: 0 };
      const ratio = getContrastRatio(white, black);
      // White vs black should be close to 21:1
      expect(ratio).toBeCloseTo(21, 0);
    });

    it('should return same ratio regardless of order', () => {
      const white = { r: 255, g: 255, b: 255 };
      const black = { r: 0, g: 0, b: 0 };
      const ratio1 = getContrastRatio(white, black);
      const ratio2 = getContrastRatio(black, white);
      expect(ratio1).toBe(ratio2);
    });

    it('should return 1 for identical colors', () => {
      const gray = { r: 128, g: 128, b: 128 };
      const ratio = getContrastRatio(gray, gray);
      expect(ratio).toBe(1);
    });
  });

  describe('getTextColor', () => {
    it('should return black for light backgrounds', () => {
      expect(getTextColor('#FFFFFF')).toBe('#000000');
      expect(getTextColor('#EDEDED')).toBe('#000000');
      expect(getTextColor('#F0F0F0')).toBe('#000000');
    });

    it('should return white for dark backgrounds', () => {
      expect(getTextColor('#000000')).toBe('#FFFFFF');
      expect(getTextColor('#333333')).toBe('#FFFFFF');
      expect(getTextColor('#1A1A1A')).toBe('#FFFFFF');
    });

    it('should handle GitHub label colors', () => {
      expect(getTextColor('#0075ca')).toBe('#FFFFFF'); // Blue
      expect(getTextColor('#fbca04')).toBe('#000000'); // Yellow
      expect(getTextColor('#cfd3d7')).toBe('#000000'); // Gray
    });
  });

  describe('getTextColorWithRatio', () => {
    it('should return text color with contrast ratio', () => {
      const result = getTextColorWithRatio('#EDEDED');
      expect(result.textColor).toBe('#000000');
      expect(result.contrastRatio).toBeGreaterThan(4.5); // WCAG AA
    });

    it('should return white text for dark background', () => {
      const result = getTextColorWithRatio('#000000');
      expect(result.textColor).toBe('#FFFFFF');
      expect(result.contrastRatio).toBeCloseTo(21, 0);
    });
  });

  describe('isValidHex', () => {
    it('should validate correct hex colors', () => {
      expect(isValidHex('#FF5733')).toBe(true);
      expect(isValidHex('FF5733')).toBe(true);
      expect(isValidHex('#000000')).toBe(true);
      expect(isValidHex('#FFFFFF')).toBe(true);
    });

    it('should reject invalid hex colors', () => {
      expect(isValidHex('#FF')).toBe(false);
      expect(isValidHex('#GGGGGG')).toBe(false);
      expect(isValidHex('invalid')).toBe(false);
      expect(isValidHex('')).toBe(false);
    });
  });
});
