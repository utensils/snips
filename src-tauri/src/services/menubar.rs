use tauri::AppHandle;

use crate::utils::error::AppError;

/// Updates the tray icon badge count (for selected snippets)
pub fn update_badge_count(app: &AppHandle, count: u32) -> Result<(), AppError> {
    if let Some(tray) = app.tray_by_id("main-tray") {
        // On macOS, we can set a badge on the tray icon
        // Note: This functionality may be limited depending on the platform
        let tooltip = if count > 0 {
            format!("Snips - {} selected", count)
        } else {
            "Snips - Snippet Manager".to_string()
        };

        tray.set_tooltip(Some(tooltip))
            .map_err(|e| AppError::TauriError(e.to_string()))?;
    }
    Ok(())
}
