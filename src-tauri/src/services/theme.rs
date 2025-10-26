use crate::utils::error::AppError;
use serde::Serialize;
use std::collections::HashMap;

#[derive(Debug, Serialize)]
pub struct ThemePalette {
    pub name: String,
    pub colors: HashMap<String, String>,
    pub is_light: bool,
    pub icon_theme: Option<String>,
    pub wallpaper: Option<String>,
}

#[cfg(target_os = "linux")]
const COLOR_MAPPING: [(&str, &[&str]); 6] = [
    ("--background", &["base", "background"]),
    ("--foreground", &["text", "foreground"]),
    ("--primary", &["selected_text", "accent"]),
    ("--primary-foreground", &["foreground", "text"]),
    ("--border", &["border"]),
    ("--muted", &["surface", "muted"]),
];

#[cfg(target_os = "linux")]
fn home_dir() -> Option<std::path::PathBuf> {
    std::env::var_os("HOME").map(std::path::PathBuf::from)
}

#[cfg(target_os = "linux")]
fn omarchy_theme_root() -> Option<std::path::PathBuf> {
    home_dir().map(|home| home.join(".config/omarchy/current/theme"))
}

#[cfg(target_os = "linux")]
fn parse_walker_colors(theme_root: &std::path::Path) -> Result<HashMap<String, String>, AppError> {
    let mut colors = HashMap::new();
    let walker_path = theme_root.join("walker.css");
    let content = std::fs::read_to_string(&walker_path).map_err(|e| {
        AppError::External(format!(
            "Failed to read Omarchy walker.css at {}: {}",
            walker_path.display(),
            e
        ))
    })?;

    for line in content.lines() {
        let line = line.trim();
        if !line.starts_with("@define-color") {
            continue;
        }
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 3 {
            continue;
        }

        let key = parts[1].trim().trim_matches(';').replace('-', "_");
        let value = parts[2].trim_end_matches(';').trim_matches('"').to_string();
        colors.insert(key, value);
    }

    Ok(colors)
}

#[cfg(target_os = "linux")]
fn rgb_to_hsl(r: f64, g: f64, b: f64) -> (u16, u16, u16) {
    let r = (r / 255.0).clamp(0.0, 1.0);
    let g = (g / 255.0).clamp(0.0, 1.0);
    let b = (b / 255.0).clamp(0.0, 1.0);

    let max = r.max(g).max(b);
    let min = r.min(g).min(b);
    let mut h = 0.0;
    let l = (max + min) / 2.0;
    let mut s = 0.0;

    if (max - min).abs() > f64::EPSILON {
        let d = max - min;
        s = if l > 0.5 {
            d / (2.0 - max - min)
        } else {
            d / (max + min)
        };
        h = match max {
            m if (m - r).abs() < f64::EPSILON => (g - b) / d + if g < b { 6.0 } else { 0.0 },
            m if (m - g).abs() < f64::EPSILON => (b - r) / d + 2.0,
            _ => (r - g) / d + 4.0,
        };
        h /= 6.0;
    }

    let hue = (h * 360.0).round() as u16;
    let saturation = (s * 100.0).round() as u16;
    let lightness = (l * 100.0).round() as u16;

    (hue, saturation, lightness)
}

#[cfg(target_os = "linux")]
fn color_to_hsl(value: &str) -> Option<String> {
    let trimmed = value.trim();

    if let Some(stripped) = trimmed.strip_prefix('#') {
        let hex = if stripped.len() == 3 {
            stripped.chars().flat_map(|c| [c, c]).collect::<String>()
        } else {
            stripped.to_string()
        };

        if hex.len() == 6 {
            if let (Ok(r), Ok(g), Ok(b)) = (
                u32::from_str_radix(&hex[0..2], 16),
                u32::from_str_radix(&hex[2..4], 16),
                u32::from_str_radix(&hex[4..6], 16),
            ) {
                let (h, s, l) = rgb_to_hsl(r as f64, g as f64, b as f64);
                return Some(format!("{} {}% {}%", h, s, l));
            }
        }
    }

    if trimmed.starts_with("rgb") {
        let inner = trimmed
            .strip_prefix("rgba(")
            .or_else(|| trimmed.strip_prefix("rgb("))
            .and_then(|rest| rest.strip_suffix(')'));
        if let Some(content) = inner {
            let mut parts = content.split(',').map(|p| p.trim().parse::<f64>());
            if let (Some(Ok(r)), Some(Ok(g)), Some(Ok(b))) =
                (parts.next(), parts.next(), parts.next())
            {
                let (h, s, l) = rgb_to_hsl(r, g, b);
                return Some(format!("{} {}% {}%", h, s, l));
            }
        }
        return None;
    }

    if trimmed.starts_with("hsl") {
        if let Some(inner) = trimmed
            .strip_prefix("hsl(")
            .and_then(|rest| rest.strip_suffix(')'))
        {
            let parts: Vec<&str> = inner.split(',').map(|p| p.trim()).collect();
            if parts.len() >= 3 {
                let hue = parts[0].trim_end_matches("deg");
                return Some(format!("{} {} {}", hue, parts[1], parts[2]));
            }
        }
    }

    None
}

#[cfg(target_os = "linux")]
fn write_theme_fragment(theme: &ThemePalette) -> Result<(), AppError> {
    let fragment_dir = home_dir()
        .map(|home| home.join(".config/snips/themes"))
        .ok_or_else(|| AppError::NotFound("Home directory not set".into()))?;
    std::fs::create_dir_all(&fragment_dir).map_err(|e| {
        AppError::External(format!(
            "Failed to create Snips theme directory {}: {}",
            fragment_dir.display(),
            e
        ))
    })?;

    let mut css = format!(":root[data-omarchy-theme=\"{}\"] {{\n", theme.name);
    for (css_var, keys) in COLOR_MAPPING.iter() {
        if let Some(value) = keys
            .iter()
            .find_map(|key| theme.colors.get(*key).map(|v| v.as_str()))
        {
            if let Some(hsl) = color_to_hsl(value) {
                css.push_str(&format!("  {}: {};\n", css_var, hsl));
            }
        }
    }
    css.push('}');
    css.push('\n');

    let fragment_path = fragment_dir.join(format!("{}.css", theme.name));
    std::fs::write(&fragment_path, css).map_err(|e| {
        AppError::External(format!(
            "Failed to write Snips theme fragment {}: {}",
            fragment_path.display(),
            e
        ))
    })?;

    Ok(())
}

#[cfg(target_os = "linux")]
fn load_theme_palette_from_path(
    theme_root: &std::path::Path,
    theme_name: String,
    wallpaper: Option<String>,
) -> Result<ThemePalette, AppError> {
    let colors = parse_walker_colors(theme_root)?;
    let is_light = theme_root.join("light.mode").exists();

    let icon_theme_path = theme_root.join("icons.theme");
    let icon_theme = std::fs::read_to_string(&icon_theme_path)
        .map(|s| s.trim().to_string())
        .ok()
        .filter(|s| !s.is_empty());

    let palette = ThemePalette {
        name: theme_name,
        colors,
        is_light,
        icon_theme,
        wallpaper,
    };

    write_theme_fragment(&palette)?;

    Ok(palette)
}

#[cfg(target_os = "linux")]
pub fn load_omarchy_theme_palette() -> Result<ThemePalette, AppError> {
    let theme_root = omarchy_theme_root()
        .ok_or_else(|| AppError::NotFound("Omarchy theme directory not found".into()))?;

    if !theme_root.exists() {
        return Err(AppError::NotFound(format!(
            "Omarchy theme directory missing: {}",
            theme_root.display()
        )));
    }

    let theme_name = std::fs::read_link(&theme_root)
        .map(|p| {
            p.file_name()
                .map(|os| os.to_string_lossy().to_string())
                .unwrap_or_else(|| "unknown".to_string())
        })
        .unwrap_or_else(|_| {
            theme_root
                .file_name()
                .map(|os| os.to_string_lossy().to_string())
                .unwrap_or_else(|| "unknown".to_string())
        });

    let wallpaper_symlink = home_dir()
        .map(|home| home.join(".config/omarchy/current/background"))
        .filter(|p| p.exists());

    let wallpaper = wallpaper_symlink
        .and_then(|p| {
            if let Ok(target) = std::fs::read_link(&p) {
                Some(target)
            } else if p.is_file() {
                Some(p)
            } else {
                None
            }
        })
        .map(|p| p.to_string_lossy().to_string());

    load_theme_palette_from_path(&theme_root, theme_name, wallpaper)
}

#[cfg(target_os = "linux")]
fn themes_directory() -> Option<std::path::PathBuf> {
    home_dir().map(|home| home.join(".config/omarchy/themes"))
}

#[cfg(target_os = "linux")]
fn find_theme_directory(theme_name: &str) -> Option<(String, std::path::PathBuf)> {
    let themes_dir = themes_directory()?;
    let desired = theme_name.to_lowercase().replace(' ', "-");

    let entries = std::fs::read_dir(&themes_dir).ok()?;
    for entry in entries.flatten() {
        if entry.file_type().map(|ft| ft.is_dir()).unwrap_or(false) {
            let current_name = entry.file_name().to_string_lossy().to_string();
            if current_name.to_lowercase() == desired {
                return Some((current_name, entry.path()));
            }
        }
    }
    None
}

#[cfg(target_os = "linux")]
pub fn list_omarchy_themes() -> Result<Vec<String>, AppError> {
    let themes_dir = themes_directory()
        .ok_or_else(|| AppError::NotFound("Omarchy themes directory not found".into()))?;

    let entries = std::fs::read_dir(&themes_dir).map_err(|e| {
        AppError::External(format!(
            "Failed to read Omarchy themes directory {}: {}",
            themes_dir.display(),
            e
        ))
    })?;

    let mut themes = Vec::new();
    for entry in entries.flatten() {
        if entry.file_type().map(|ft| ft.is_dir()).unwrap_or(false) {
            themes.push(entry.file_name().to_string_lossy().to_string());
        }
    }
    themes.sort();
    Ok(themes)
}

#[cfg(target_os = "linux")]
pub fn import_omarchy_theme(theme_name: &str) -> Result<ThemePalette, AppError> {
    let (resolved_name, theme_dir) = find_theme_directory(theme_name).ok_or_else(|| {
        AppError::NotFound(format!("Omarchy theme '{}' was not found", theme_name))
    })?;

    let wallpaper = theme_dir
        .join("backgrounds")
        .exists()
        .then(|| theme_dir.join("backgrounds"))
        .and_then(|bg_dir| {
            std::fs::read_dir(bg_dir)
                .ok()
                .and_then(|entries| {
                    entries
                        .flatten()
                        .find(|entry| entry.file_type().map(|ft| ft.is_file()).unwrap_or(false))
                })
                .map(|entry| entry.path().to_string_lossy().to_string())
        });

    load_theme_palette_from_path(&theme_dir, resolved_name, wallpaper)
}

#[cfg(not(target_os = "linux"))]
pub fn list_omarchy_themes() -> Result<Vec<String>, AppError> {
    Err(AppError::Unsupported(
        "Omarchy themes supported on Linux only".into(),
    ))
}

#[cfg(not(target_os = "linux"))]
pub fn import_omarchy_theme(_theme_name: &str) -> Result<ThemePalette, AppError> {
    Err(AppError::Unsupported(
        "Omarchy themes supported on Linux only".into(),
    ))
}

#[cfg(not(target_os = "linux"))]
pub fn load_omarchy_theme_palette() -> Result<ThemePalette, AppError> {
    Err(AppError::Unsupported(
        "Omarchy themes supported on Linux only".into(),
    ))
}
