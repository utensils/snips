/// Utilities for working with colors and calculating contrast
use serde::{Deserialize, Serialize};

/// Represents RGB color components
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct RGB {
    pub r: u8,
    pub g: u8,
    pub b: u8,
}

impl RGB {
    /// Parse a hex color string (e.g., "#FF5733" or "FF5733") into RGB
    pub fn from_hex(hex: &str) -> Result<Self, String> {
        let hex = hex.trim_start_matches('#');

        if hex.len() != 6 {
            return Err(format!("Invalid hex color: {}", hex));
        }

        let r = u8::from_str_radix(&hex[0..2], 16)
            .map_err(|_| format!("Invalid red component: {}", &hex[0..2]))?;
        let g = u8::from_str_radix(&hex[2..4], 16)
            .map_err(|_| format!("Invalid green component: {}", &hex[2..4]))?;
        let b = u8::from_str_radix(&hex[4..6], 16)
            .map_err(|_| format!("Invalid blue component: {}", &hex[4..6]))?;

        Ok(RGB { r, g, b })
    }

    /// Convert RGB to hex string
    pub fn to_hex(&self) -> String {
        format!("#{:02X}{:02X}{:02X}", self.r, self.g, self.b)
    }

    /// Calculate relative luminance according to WCAG 2.1
    /// https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
    pub fn luminance(&self) -> f64 {
        let r = Self::linearize(self.r as f64 / 255.0);
        let g = Self::linearize(self.g as f64 / 255.0);
        let b = Self::linearize(self.b as f64 / 255.0);

        0.2126 * r + 0.7152 * g + 0.0722 * b
    }

    /// Linearize sRGB color component
    fn linearize(component: f64) -> f64 {
        if component <= 0.03928 {
            component / 12.92
        } else {
            ((component + 0.055) / 1.055).powf(2.4)
        }
    }
}

/// Calculate contrast ratio between two colors according to WCAG 2.1
/// https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
pub fn contrast_ratio(color1: &RGB, color2: &RGB) -> f64 {
    let l1 = color1.luminance();
    let l2 = color2.luminance();

    let lighter = l1.max(l2);
    let darker = l1.min(l2);

    (lighter + 0.05) / (darker + 0.05)
}

/// Determine the best text color (black or white) for a given background color
/// Returns "#000000" for dark text or "#FFFFFF" for light text
pub fn get_text_color(bg_color: &str) -> Result<String, String> {
    let bg = RGB::from_hex(bg_color)?;
    let black = RGB { r: 0, g: 0, b: 0 };
    let white = RGB {
        r: 255,
        g: 255,
        b: 255,
    };

    let contrast_with_black = contrast_ratio(&bg, &black);
    let contrast_with_white = contrast_ratio(&bg, &white);

    // Choose the color with better contrast
    if contrast_with_black > contrast_with_white {
        Ok("#000000".to_string())
    } else {
        Ok("#FFFFFF".to_string())
    }
}

/// Result of text color calculation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextColorResult {
    pub text_color: String,
    pub contrast_ratio: f64,
}

/// Get text color with contrast ratio information
pub fn get_text_color_with_ratio(bg_color: &str) -> Result<TextColorResult, String> {
    let bg = RGB::from_hex(bg_color)?;
    let black = RGB { r: 0, g: 0, b: 0 };
    let white = RGB {
        r: 255,
        g: 255,
        b: 255,
    };

    let contrast_with_black = contrast_ratio(&bg, &black);
    let contrast_with_white = contrast_ratio(&bg, &white);

    if contrast_with_black > contrast_with_white {
        Ok(TextColorResult {
            text_color: "#000000".to_string(),
            contrast_ratio: contrast_with_black,
        })
    } else {
        Ok(TextColorResult {
            text_color: "#FFFFFF".to_string(),
            contrast_ratio: contrast_with_white,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rgb_from_hex() {
        let rgb = RGB::from_hex("#FF5733").unwrap();
        assert_eq!(rgb.r, 255);
        assert_eq!(rgb.g, 87);
        assert_eq!(rgb.b, 51);

        // Test without hash
        let rgb2 = RGB::from_hex("FF5733").unwrap();
        assert_eq!(rgb, rgb2);
    }

    #[test]
    fn test_rgb_to_hex() {
        let rgb = RGB {
            r: 255,
            g: 87,
            b: 51,
        };
        assert_eq!(rgb.to_hex(), "#FF5733");
    }

    #[test]
    fn test_invalid_hex() {
        assert!(RGB::from_hex("#FF").is_err());
        assert!(RGB::from_hex("#GGGGGG").is_err());
        assert!(RGB::from_hex("invalid").is_err());
    }

    #[test]
    fn test_luminance() {
        let white = RGB {
            r: 255,
            g: 255,
            b: 255,
        };
        let black = RGB { r: 0, g: 0, b: 0 };

        assert!(white.luminance() > black.luminance());
        assert!(white.luminance() > 0.9); // White should be close to 1.0
        assert!(black.luminance() < 0.1); // Black should be close to 0.0
    }

    #[test]
    fn test_contrast_ratio() {
        let white = RGB {
            r: 255,
            g: 255,
            b: 255,
        };
        let black = RGB { r: 0, g: 0, b: 0 };

        let ratio = contrast_ratio(&white, &black);
        // White vs black should have maximum contrast ratio of 21:1
        assert!((ratio - 21.0).abs() < 0.1);
    }

    #[test]
    fn test_get_text_color_light_background() {
        // Light gray background should use dark text
        let result = get_text_color("#EDEDED").unwrap();
        assert_eq!(result, "#000000");

        // White background should use dark text
        let result = get_text_color("#FFFFFF").unwrap();
        assert_eq!(result, "#000000");
    }

    #[test]
    fn test_get_text_color_dark_background() {
        // Dark gray background should use light text
        let result = get_text_color("#333333").unwrap();
        assert_eq!(result, "#FFFFFF");

        // Black background should use light text
        let result = get_text_color("#000000").unwrap();
        assert_eq!(result, "#FFFFFF");
    }

    #[test]
    fn test_github_label_colors() {
        // Test some common GitHub label colors
        // Note: Some colors may differ from GitHub due to accessibility standards
        let colors = vec![
            ("#0075ca", "#FFFFFF"), // Blue - white text
            ("#fbca04", "#000000"), // Yellow - black text
            ("#cfd3d7", "#000000"), // Gray - black text
            ("#EDEDED", "#000000"), // Default light gray - black text
        ];

        for (bg, expected_text) in colors {
            let result = get_text_color(bg).unwrap();
            assert_eq!(
                result, expected_text,
                "Background {} should use text color {}",
                bg, expected_text
            );
        }
    }

    #[test]
    fn test_get_text_color_with_ratio() {
        let result = get_text_color_with_ratio("#EDEDED").unwrap();
        assert_eq!(result.text_color, "#000000");
        assert!(result.contrast_ratio >= 4.5); // Should meet WCAG AA for normal text
    }
}
