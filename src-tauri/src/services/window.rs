use tauri::{AppHandle, Manager, PhysicalPosition, PhysicalSize, WebviewWindow};

use crate::utils::error::AppError;

/// Window labels used in the application
pub const SEARCH_WINDOW_LABEL: &str = "search";
pub const MANAGEMENT_WINDOW_LABEL: &str = "management";
pub const QUICK_ADD_WINDOW_LABEL: &str = "quick-add";

/// Gets the search window handle
pub fn get_search_window(app: &AppHandle) -> Result<WebviewWindow, AppError> {
    app.get_webview_window(SEARCH_WINDOW_LABEL)
        .ok_or_else(|| AppError::NotFound("Search window not found".into()))
}

/// Gets the management window handle, creating it if it doesn't exist
pub fn get_or_create_management_window(app: &AppHandle) -> Result<WebviewWindow, AppError> {
    if let Some(window) = app.get_webview_window(MANAGEMENT_WINDOW_LABEL) {
        return Ok(window);
    }

    // Create management window
    let window = tauri::WebviewWindowBuilder::new(
        app,
        MANAGEMENT_WINDOW_LABEL,
        tauri::WebviewUrl::App("index.html".into()),
    )
    .title("Snips - Management")
    .inner_size(1000.0, 700.0)
    .center()
    .resizable(true)
    .visible(false)
    .skip_taskbar(false)
    .decorations(true)
    .build()
    .map_err(|e| AppError::TauriError(e.to_string()))?;

    Ok(window)
}

/// Gets the quick add window handle, creating it if it doesn't exist
pub fn get_or_create_quick_add_window(app: &AppHandle) -> Result<WebviewWindow, AppError> {
    if let Some(window) = app.get_webview_window(QUICK_ADD_WINDOW_LABEL) {
        return Ok(window);
    }

    // Create quick add window
    let window = tauri::WebviewWindowBuilder::new(
        app,
        QUICK_ADD_WINDOW_LABEL,
        tauri::WebviewUrl::App("index.html".into()),
    )
    .title("Quick Add Snippet")
    .inner_size(500.0, 400.0)
    .center()
    .resizable(false)
    .visible(false)
    .always_on_top(true)
    .skip_taskbar(true)
    .decorations(true)
    .build()
    .map_err(|e| AppError::TauriError(e.to_string()))?;

    Ok(window)
}

/// Shows a window and brings it to focus
pub fn show_window(window: &WebviewWindow) -> Result<(), AppError> {
    window
        .show()
        .map_err(|e| AppError::TauriError(e.to_string()))?;
    window
        .set_focus()
        .map_err(|e| AppError::TauriError(e.to_string()))?;
    Ok(())
}

/// Hides a window
pub fn hide_window(window: &WebviewWindow) -> Result<(), AppError> {
    window
        .hide()
        .map_err(|e| AppError::TauriError(e.to_string()))?;
    Ok(())
}

/// Centers a window on the screen
pub fn center_window(window: &WebviewWindow) -> Result<(), AppError> {
    window
        .center()
        .map_err(|e| AppError::TauriError(e.to_string()))?;
    Ok(())
}

/// Positions a window near the cursor position
pub fn position_near_cursor(window: &WebviewWindow) -> Result<(), AppError> {
    // Get cursor position - this is a placeholder implementation
    // On macOS, we'll need to use platform-specific APIs to get cursor position
    // For now, we'll just center the window
    center_window(window)?;
    Ok(())
}

/// Positions a window at a specific screen position
pub fn position_window(window: &WebviewWindow, x: i32, y: i32) -> Result<(), AppError> {
    let position = PhysicalPosition::new(x, y);
    window
        .set_position(position)
        .map_err(|e| AppError::TauriError(e.to_string()))?;
    Ok(())
}

/// Resizes a window
pub fn resize_window(window: &WebviewWindow, width: u32, height: u32) -> Result<(), AppError> {
    let size = PhysicalSize::new(width, height);
    window
        .set_size(size)
        .map_err(|e| AppError::TauriError(e.to_string()))?;
    Ok(())
}

/// Shows and centers the search window
pub fn show_search_window(app: &AppHandle) -> Result<(), AppError> {
    let window = get_search_window(app)?;
    center_window(&window)?;
    show_window(&window)?;
    Ok(())
}

/// Hides the search window
pub fn hide_search_window(app: &AppHandle) -> Result<(), AppError> {
    let window = get_search_window(app)?;
    hide_window(&window)?;
    Ok(())
}

/// Toggles the search window visibility
pub fn toggle_search_window(app: &AppHandle) -> Result<(), AppError> {
    let window = get_search_window(app)?;
    if window.is_visible().unwrap_or(false) {
        hide_window(&window)?;
    } else {
        center_window(&window)?;
        show_window(&window)?;
    }
    Ok(())
}

/// Shows the management window
pub fn show_management_window(app: &AppHandle) -> Result<(), AppError> {
    let window = get_or_create_management_window(app)?;
    show_window(&window)?;
    Ok(())
}

/// Shows the quick add window
pub fn show_quick_add_window(app: &AppHandle) -> Result<(), AppError> {
    let window = get_or_create_quick_add_window(app)?;
    center_window(&window)?;
    show_window(&window)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_window_labels() {
        assert_eq!(SEARCH_WINDOW_LABEL, "search");
        assert_eq!(MANAGEMENT_WINDOW_LABEL, "management");
        assert_eq!(QUICK_ADD_WINDOW_LABEL, "quick-add");
    }
}
