use tauri::AppHandle;

use crate::services::window;

/// Shows the search window
#[tauri::command]
pub async fn show_search_window(app: AppHandle) -> Result<(), String> {
    window::show_search_window(&app).map_err(|e| e.to_string())
}

/// Hides the search window
#[tauri::command]
pub async fn hide_search_window(app: AppHandle) -> Result<(), String> {
    window::hide_search_window(&app).map_err(|e| e.to_string())
}

/// Toggles the search window visibility
#[tauri::command]
pub async fn toggle_search_window(app: AppHandle) -> Result<(), String> {
    window::toggle_search_window(&app).map_err(|e| e.to_string())
}

/// Shows the management window
#[tauri::command]
pub async fn show_management_window(app: AppHandle) -> Result<(), String> {
    window::show_management_window(&app).map_err(|e| e.to_string())
}

/// Shows the settings window
#[tauri::command]
pub async fn show_settings_window(app: AppHandle) -> Result<(), String> {
    window::show_settings_window(&app).map_err(|e| e.to_string())
}

/// Shows the quick add window
#[tauri::command]
pub async fn show_quick_add_window(app: AppHandle) -> Result<(), String> {
    window::show_quick_add_window(&app).map_err(|e| e.to_string())
}

/// Hides the quick add window
#[tauri::command]
pub async fn hide_quick_add_window(app: AppHandle) -> Result<(), String> {
    window::hide_quick_add_window(&app).map_err(|e| e.to_string())
}

/// Updates the menubar badge count
#[tauri::command]
pub async fn update_badge_count(app: AppHandle, count: u32) -> Result<(), String> {
    crate::services::menubar::update_badge_count(&app, count).map_err(|e| e.to_string())
}

/// Returns a snapshot of all window states for diagnostics
#[tauri::command]
pub async fn window_diagnostics(
    app: AppHandle,
) -> Result<Vec<crate::services::window::WindowDiagnostic>, String> {
    Ok(crate::services::window::collect_window_diagnostics(&app))
}

/// Returns the detected window manager label (hyprland, sway, river, other)
#[tauri::command]
pub async fn current_window_manager_label() -> Result<String, String> {
    Ok(crate::services::window::current_window_manager_label().to_string())
}
