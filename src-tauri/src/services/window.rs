use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewWindow};

use crate::utils::error::AppError;

/// Window labels used in the application
pub const SEARCH_WINDOW_LABEL: &str = "search";
pub const MANAGEMENT_WINDOW_LABEL: &str = "management";
pub const QUICK_ADD_WINDOW_LABEL: &str = "quick-add";
pub const SETTINGS_WINDOW_LABEL: &str = "settings";

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
    .inner_size(650.0, 700.0)
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

/// Gets the settings window handle, creating it if it doesn't exist
pub fn get_or_create_settings_window(app: &AppHandle) -> Result<WebviewWindow, AppError> {
    if let Some(window) = app.get_webview_window(SETTINGS_WINDOW_LABEL) {
        return Ok(window);
    }

    // Create settings window
    let window = tauri::WebviewWindowBuilder::new(
        app,
        SETTINGS_WINDOW_LABEL,
        tauri::WebviewUrl::App("index.html".into()),
    )
    .title("Snips - Settings")
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

/// Shows the settings window
pub fn show_settings_window(app: &AppHandle) -> Result<(), AppError> {
    let window = get_or_create_settings_window(app)?;
    show_window(&window)?;
    Ok(())
}

/// Shows the quick add window with pre-captured selected text
pub fn show_quick_add_window(app: &AppHandle) -> Result<(), AppError> {
    // IMPORTANT: Capture selected text BEFORE showing window to avoid losing focus
    let selected_text = capture_selected_text_sync();

    let window = get_or_create_quick_add_window(app)?;

    center_window(&window)?;
    show_window(&window)?;

    // Emit event AFTER showing window to ensure frontend listener is ready
    // Use a delay to allow the webview to initialize and frontend to mount
    if let Ok(text) = selected_text {
        let app_clone = app.clone();
        std::thread::spawn(move || {
            // Longer delay to ensure webview is fully initialized
            std::thread::sleep(std::time::Duration::from_millis(200));
            // Use emit_to to target the specific window
            if let Err(e) =
                app_clone.emit_to(QUICK_ADD_WINDOW_LABEL, "selected-text-captured", text)
            {
                eprintln!("Failed to emit selected-text-captured event: {}", e);
            }
        });
    } else if let Err(e) = selected_text {
        // If text capture failed, emit an error event
        let app_clone = app.clone();
        let error_msg = e.to_string();
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_millis(200));
            // Use emit_to to target the specific window
            if let Err(e) =
                app_clone.emit_to(QUICK_ADD_WINDOW_LABEL, "selected-text-error", error_msg)
            {
                eprintln!("Failed to emit selected-text-error event: {}", e);
            }
        });
    }

    Ok(())
}

/// Synchronously captures selected text using clipboard method
/// This must be called BEFORE the window takes focus
fn capture_selected_text_sync() -> Result<String, AppError> {
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;

        // Store current clipboard
        let original = get_clipboard_sync().unwrap_or_default();

        // Simulate Cmd+C to copy selected text
        let script = r#"
            tell application "System Events"
                keystroke "c" using {command down}
            end tell
        "#;

        let output = Command::new("osascript")
            .arg("-e")
            .arg(script)
            .output()
            .map_err(|e| AppError::External(format!("Failed to execute AppleScript: {}", e)))?;

        if !output.status.success() {
            return Err(AppError::External(
                "Failed to capture selected text".to_string(),
            ));
        }

        // Small delay for clipboard update
        std::thread::sleep(std::time::Duration::from_millis(150));

        // Read clipboard
        let selected = get_clipboard_sync()?;

        // Restore original clipboard if different
        if !original.is_empty() && original != selected {
            let _ = set_clipboard_sync(&original);
        }

        if selected.trim().is_empty() {
            return Err(AppError::NotFound("No text selected".to_string()));
        }

        Ok(selected)
    }

    #[cfg(not(target_os = "macos"))]
    {
        Err(AppError::Unsupported(
            "Text capture only supported on macOS".to_string(),
        ))
    }
}

#[cfg(target_os = "macos")]
fn get_clipboard_sync() -> Result<String, AppError> {
    use std::process::Command;

    let output = Command::new("pbpaste")
        .output()
        .map_err(|e| AppError::External(format!("Failed to read clipboard: {}", e)))?;

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

#[cfg(target_os = "macos")]
fn set_clipboard_sync(text: &str) -> Result<(), AppError> {
    use std::io::Write;
    use std::process::{Command, Stdio};

    let mut child = Command::new("pbcopy")
        .stdin(Stdio::piped())
        .spawn()
        .map_err(|e| AppError::External(format!("Failed to write clipboard: {}", e)))?;

    if let Some(mut stdin) = child.stdin.take() {
        stdin
            .write_all(text.as_bytes())
            .map_err(|e| AppError::External(format!("Failed to write clipboard: {}", e)))?;
    }

    child
        .wait()
        .map_err(|e| AppError::External(format!("Failed to write clipboard: {}", e)))?;

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
        assert_eq!(SETTINGS_WINDOW_LABEL, "settings");
    }
}
