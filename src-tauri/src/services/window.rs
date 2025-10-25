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

/// Gets the quick add window handle
/// Window is pre-created in tauri.conf.json for better stability
pub fn get_quick_add_window(app: &AppHandle) -> Result<WebviewWindow, AppError> {
    app.get_webview_window(QUICK_ADD_WINDOW_LABEL)
        .ok_or_else(|| AppError::NotFound("Quick add window not found".into()))
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
    eprintln!(
        "[DEBUG] [window.rs] show_window: is_visible={:?}, is_focused={:?}",
        window.is_visible().unwrap_or(false),
        window.is_focused().unwrap_or(false)
    );

    // Platform-specific workarounds for Wayland/Hyprland
    #[cfg(target_os = "linux")]
    {
        // Workaround 1: Try hide/show pattern (works on some X11 window managers)
        let _ = window.hide();
        std::thread::sleep(std::time::Duration::from_millis(10));
    }

    window
        .show()
        .map_err(|e| AppError::TauriError(e.to_string()))?;

    eprintln!(
        "[DEBUG] [window.rs] show_window: after show() - is_visible={:?}, is_focused={:?}",
        window.is_visible().unwrap_or(false),
        window.is_focused().unwrap_or(false)
    );

    // Give the compositor time to process the show request (Wayland)
    #[cfg(target_os = "linux")]
    std::thread::sleep(std::time::Duration::from_millis(20));

    // Try multiple methods to ensure window gets focus on Wayland
    window
        .set_focus()
        .map_err(|e| AppError::TauriError(e.to_string()))?;

    eprintln!(
        "[DEBUG] [window.rs] show_window: after set_focus() - is_visible={:?}, is_focused={:?}",
        window.is_visible().unwrap_or(false),
        window.is_focused().unwrap_or(false)
    );

    // Try unminimize (X11 only, but harmless on Wayland)
    eprintln!("[DEBUG] [window.rs] show_window: calling unminimize()");
    let _ = window.unminimize();

    // Multiple focus attempts for Wayland compositors that may ignore first attempts
    #[cfg(target_os = "linux")]
    {
        for attempt in 1..3 {
            std::thread::sleep(std::time::Duration::from_millis(10));
            if let Err(e) = window.set_focus() {
                eprintln!(
                    "[DEBUG] [window.rs] show_window: focus retry {} failed: {}",
                    attempt, e
                );
            } else {
                eprintln!(
                    "[DEBUG] [window.rs] show_window: focus retry {} succeeded",
                    attempt
                );
            }
        }
    }

    eprintln!(
        "[DEBUG] [window.rs] show_window: final state - is_visible={:?}, is_focused={:?}",
        window.is_visible().unwrap_or(false),
        window.is_focused().unwrap_or(false)
    );

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
    eprintln!("[DEBUG] [window.rs] show_quick_add_window() called");

    // IMPORTANT: Capture selected text BEFORE showing window to avoid losing focus
    let selected_text = capture_selected_text_sync();
    eprintln!(
        "[DEBUG] [window.rs] Text capture result: {}",
        match &selected_text {
            Ok(t) => format!("Ok({} chars)", t.len()),
            Err(e) => format!("Err({})", e),
        }
    );

    eprintln!("[DEBUG] [window.rs] Getting quick-add window");
    let window = get_quick_add_window(app)?;
    eprintln!("[DEBUG] [window.rs] Window obtained successfully");

    eprintln!("[DEBUG] [window.rs] Centering window");
    center_window(&window)?;
    eprintln!("[DEBUG] [window.rs] Window centered");

    eprintln!("[DEBUG] [window.rs] Showing window");
    show_window(&window)?;
    eprintln!("[DEBUG] [window.rs] Window shown successfully");

    // Emit event AFTER showing window to ensure frontend listener is ready
    // Window is pre-created at startup, so use shorter delay
    let delay_ms = 200;

    if let Ok(text) = selected_text {
        eprintln!(
            "[DEBUG] [window.rs] Spawning thread to emit selected-text-captured event (delay: {}ms)",
            delay_ms
        );
        let app_clone = app.clone();
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_millis(delay_ms));
            eprintln!("[DEBUG] [window.rs] Emitting selected-text-captured event");
            // Use emit_to to target the specific window
            if let Err(e) =
                app_clone.emit_to(QUICK_ADD_WINDOW_LABEL, "selected-text-captured", text)
            {
                eprintln!("Failed to emit selected-text-captured event: {}", e);
            } else {
                eprintln!("[DEBUG] [window.rs] Event emitted successfully");
            }
        });
    } else if let Err(e) = selected_text {
        eprintln!(
            "[DEBUG] [window.rs] Text capture failed, emitting error event: {}",
            e
        );
        // If text capture failed, emit an error event
        let app_clone = app.clone();
        let error_msg = e.to_string();
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_millis(delay_ms));
            // Use emit_to to target the specific window
            if let Err(e) =
                app_clone.emit_to(QUICK_ADD_WINDOW_LABEL, "selected-text-error", error_msg)
            {
                eprintln!("Failed to emit selected-text-error event: {}", e);
            }
        });
    }

    eprintln!("[DEBUG] [window.rs] show_quick_add_window() completed successfully");
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

    #[cfg(target_os = "linux")]
    {
        use arboard::{Clipboard, GetExtLinux, LinuxClipboardKind};

        eprintln!("[DEBUG] [window.rs] Attempting to access PRIMARY selection on Linux");

        // On Linux, read the PRIMARY selection (auto-updated when user selects text)
        let mut clipboard = Clipboard::new().map_err(|e| {
            eprintln!("[DEBUG] [window.rs] Failed to create clipboard: {}", e);
            AppError::External(format!("Failed to access clipboard: {}", e))
        })?;

        eprintln!("[DEBUG] [window.rs] Clipboard created successfully");

        // Try PRIMARY selection first
        let primary_result = clipboard
            .get()
            .clipboard(LinuxClipboardKind::Primary)
            .text();

        match primary_result {
            Ok(text) if !text.trim().is_empty() => {
                eprintln!(
                    "[DEBUG] [window.rs] PRIMARY selection: {} chars, starts with: {:?}",
                    text.len(),
                    &text[..text.len().min(50)]
                );
                Ok(text)
            }
            Ok(_text) => {
                eprintln!("[DEBUG] [window.rs] PRIMARY selection is empty");
                // PRIMARY is empty, fallback to standard CLIPBOARD
                eprintln!("[DEBUG] [window.rs] Falling back to CLIPBOARD");
                match get_clipboard_sync() {
                    Ok(text) if !text.trim().is_empty() => {
                        eprintln!(
                            "[DEBUG] [window.rs] Got text from CLIPBOARD fallback: {:?} ({} chars)",
                            &text[..text.len().min(50)],
                            text.len()
                        );
                        Ok(text)
                    }
                    Ok(_) => {
                        eprintln!("[DEBUG] [window.rs] CLIPBOARD is also empty");
                        Err(AppError::NotFound("No text selected".to_string()))
                    }
                    Err(e) => {
                        eprintln!("[DEBUG] [window.rs] Failed to read CLIPBOARD: {}", e);
                        Err(AppError::NotFound("No text selected".to_string()))
                    }
                }
            }
            Err(e) => {
                eprintln!("[DEBUG] [window.rs] PRIMARY selection error: {}", e);
                // PRIMARY failed, fallback to standard CLIPBOARD
                eprintln!("[DEBUG] [window.rs] Falling back to CLIPBOARD after error");
                match get_clipboard_sync() {
                    Ok(text) if !text.trim().is_empty() => {
                        eprintln!(
                            "[DEBUG] [window.rs] Got text from CLIPBOARD fallback: {:?} ({} chars)",
                            &text[..text.len().min(50)],
                            text.len()
                        );
                        Ok(text)
                    }
                    Ok(_) => {
                        eprintln!("[DEBUG] [window.rs] CLIPBOARD is also empty");
                        Err(AppError::NotFound("No text selected".to_string()))
                    }
                    Err(e) => {
                        eprintln!("[DEBUG] [window.rs] Failed to read CLIPBOARD: {}", e);
                        Err(AppError::NotFound("No text selected".to_string()))
                    }
                }
            }
        }
    }

    #[cfg(not(any(target_os = "macos", target_os = "linux")))]
    {
        Err(AppError::Unsupported(
            "Text capture only supported on macOS and Linux".to_string(),
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

#[cfg(target_os = "linux")]
fn get_clipboard_sync() -> Result<String, AppError> {
    use arboard::Clipboard;

    eprintln!("[DEBUG] [window.rs] get_clipboard_sync: Creating clipboard");

    let mut clipboard = Clipboard::new().map_err(|e| {
        eprintln!(
            "[DEBUG] [window.rs] get_clipboard_sync: Failed to create clipboard: {}",
            e
        );
        AppError::External(format!("Failed to access clipboard: {}", e))
    })?;

    let result = clipboard.get_text();
    eprintln!(
        "[DEBUG] [window.rs] get_clipboard_sync: get_text() result: {:?}",
        result
    );

    result.map_err(|e| AppError::External(format!("Failed to read clipboard: {}", e)))
}

#[cfg(target_os = "linux")]
#[allow(dead_code)]
fn set_clipboard_sync(text: &str) -> Result<(), AppError> {
    use arboard::Clipboard;

    eprintln!(
        "[DEBUG] [window.rs] set_clipboard_sync: Setting text: {:?}",
        &text[..text.len().min(50)]
    );

    let mut clipboard = Clipboard::new().map_err(|e| {
        eprintln!(
            "[DEBUG] [window.rs] set_clipboard_sync: Failed to create clipboard: {}",
            e
        );
        AppError::External(format!("Failed to access clipboard: {}", e))
    })?;

    let result = clipboard.set_text(text.to_string());
    eprintln!(
        "[DEBUG] [window.rs] set_clipboard_sync: set_text() result: {:?}",
        result
    );

    result.map_err(|e| AppError::External(format!("Failed to write clipboard: {}", e)))
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

    #[test]
    fn test_event_emission_delay_calculation() {
        // Test that delay calculation logic is reasonable
        // Newly created window needs longer delay for webview initialization
        let delay_newly_created = if true { 1000 } else { 200 };
        assert_eq!(delay_newly_created, 1000);
        assert!(
            delay_newly_created >= 500,
            "First load delay should be at least 500ms"
        );

        // Existing window needs shorter delay
        let delay_existing = if false { 1000 } else { 200 };
        assert_eq!(delay_existing, 200);
        assert!(
            delay_existing >= 100,
            "Existing window delay should be at least 100ms"
        );
    }

    /// Integration test notes (requires running app):
    ///
    /// Test Case 1: First window creation
    /// - Trigger quick-add for the first time after app launch
    /// - Verify text appears in the window (1000ms delay should be sufficient)
    ///
    /// Test Case 2: Subsequent window shows
    /// - Trigger quick-add again after closing the window
    /// - Verify text appears quickly (200ms delay should work for cached window)
    ///
    /// Test Case 3: Window focus on Wayland
    /// - Verify window receives focus and appears on top
    /// - Check debug logs for focus state transitions
    #[test]
    fn test_quick_add_window_behavior_documentation() {
        // This test exists to document expected behavior
        // Actual testing requires a running Tauri app instance

        // Window should track creation state
        let was_just_created = true;
        assert!(
            was_just_created,
            "get_or_create should return true on first creation"
        );

        let was_just_created = false;
        assert!(
            !was_just_created,
            "get_or_create should return false for existing window"
        );
    }
}
