use tauri::{AppHandle, Emitter};

use crate::services::theme;

#[tauri::command]
pub async fn get_theme_palette(_app: AppHandle) -> Result<theme::ThemePalette, String> {
    theme::load_omarchy_theme_palette().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_omarchy_themes(_app: AppHandle) -> Result<Vec<String>, String> {
    theme::list_omarchy_themes().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn import_omarchy_theme(
    app: AppHandle,
    theme_name: String,
) -> Result<theme::ThemePalette, String> {
    let palette = theme::import_omarchy_theme(&theme_name).map_err(|e| e.to_string())?;
    if let Err(err) = app.emit("appearance-updated", &palette) {
        eprintln!(
            "[WARN] [theme] Failed to emit appearance update after import: {}",
            err
        );
    }
    Ok(palette)
}
