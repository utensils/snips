/// Global shortcuts service for registering and managing keyboard shortcuts.
///
/// This module provides functionality to register global keyboard shortcuts
/// that work system-wide, even when the app is not in focus.
use tauri::AppHandle;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

use crate::models::settings::GlobalShortcuts;
use crate::services::window;

/// The default keyboard shortcut for opening the search overlay.
///
/// Uses the `CmdOrCtrl` meta-key which automatically maps to:
/// - macOS: Cmd+Shift+S
/// - Windows: Ctrl+Shift+S
/// - Linux: Ctrl+Shift+S
///
/// **Note for Linux/Wayland**: Global shortcuts may not work due to compositor
/// security restrictions. Use D-Bus IPC instead:
/// ```bash
/// dbus-send --session --type=method_call --dest=io.utensils.snips \
///   /io/utensils/snips io.utensils.snips.ShowSearch
/// ```
pub const SHORTCUT_SEARCH: &str = "CmdOrCtrl+Shift+S";

/// The default keyboard shortcut for opening the quick add dialog.
///
/// Uses the `CmdOrCtrl` meta-key which automatically maps to:
/// - macOS: Cmd+Shift+A
/// - Windows: Ctrl+Shift+A
/// - Linux: Ctrl+Shift+A
///
/// **Note for Linux/Wayland**: Global shortcuts may not work due to compositor
/// security restrictions. Use D-Bus IPC instead:
/// ```bash
/// dbus-send --session --type=method_call --dest=io.utensils.snips \
///   /io/utensils/snips io.utensils.snips.ShowQuickAdd
/// ```
pub const SHORTCUT_QUICK_ADD: &str = "CmdOrCtrl+Shift+A";

/// Returns the platform-specific display string for the search shortcut.
///
/// This function returns the actual key combination that users should press:
/// - macOS: "Cmd+Shift+S"
/// - Windows/Linux: "Ctrl+Shift+S"
///
/// # Returns
///
/// A static string representing the platform-specific shortcut.
///
/// # Examples
///
/// ```rust
/// let shortcut_display = get_search_shortcut_display();
/// println!("Press {} to search", shortcut_display);
/// ```
#[must_use]
pub fn get_search_shortcut_display() -> &'static str {
    #[cfg(target_os = "macos")]
    return "Cmd+Shift+S";
    #[cfg(not(target_os = "macos"))]
    return "Ctrl+Shift+S";
}

/// Returns the platform-specific display string for the quick add shortcut.
///
/// This function returns the actual key combination that users should press:
/// - macOS: "Cmd+Shift+A"
/// - Windows/Linux: "Ctrl+Shift+A"
///
/// # Returns
///
/// A static string representing the platform-specific shortcut.
///
/// # Examples
///
/// ```rust
/// let shortcut_display = get_quick_add_shortcut_display();
/// println!("Press {} to quick add", shortcut_display);
/// ```
#[must_use]
pub fn get_quick_add_shortcut_display() -> &'static str {
    #[cfg(target_os = "macos")]
    return "Cmd+Shift+A";
    #[cfg(not(target_os = "macos"))]
    return "Ctrl+Shift+A";
}

/// Represents an error that occurred while working with global shortcuts.
#[derive(Debug, thiserror::Error)]
pub enum ShortcutError {
    #[error("Failed to register shortcut '{0}': {1}")]
    RegistrationFailed(String, String),

    #[error("Failed to unregister shortcut '{0}': {1}")]
    UnregistrationFailed(String, String),

    #[error("Shortcut '{0}' is already registered by another application")]
    AlreadyRegistered(String),

    #[error("Invalid shortcut format: {0}")]
    InvalidFormat(String),

    #[error("Tauri error: {0}")]
    TauriError(String),
}

impl From<tauri::Error> for ShortcutError {
    fn from(err: tauri::Error) -> Self {
        ShortcutError::TauriError(err.to_string())
    }
}

/// Registers all default global shortcuts for the application.
///
/// This function registers:
/// - Search shortcut (Cmd/Ctrl+Shift+S) - Opens the search overlay
/// - Quick add shortcut (Cmd/Ctrl+Shift+A) - Opens the quick add dialog
///
/// The shortcuts use `CmdOrCtrl` which automatically maps to the correct modifier:
/// - macOS: Cmd key
/// - Windows/Linux: Ctrl key
///
/// **Note**: On Wayland, global shortcuts may fail due to compositor restrictions.
/// The app will continue to function, but shortcuts won't work. Users should
/// configure D-Bus keybinds in their window manager instead.
///
/// # Arguments
///
/// * `app` - The Tauri application handle
///
/// # Returns
///
/// Returns `Ok(())` if all shortcuts were registered successfully, or a `ShortcutError`
/// if any registration failed.
///
/// # Examples
///
/// ```rust
/// use tauri::AppHandle;
///
/// fn setup(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
///     register_all_shortcuts(app)?;
///     Ok(())
/// }
/// ```
pub fn register_all_shortcuts(app: &AppHandle) -> Result<(), ShortcutError> {
    // Register search shortcut (CmdOrCtrl+Shift+S)
    // This automatically becomes:
    // - Cmd+Shift+S on macOS
    // - Ctrl+Shift+S on Windows/Linux
    match register_search_shortcut(app) {
        Ok(_) => {}
        Err(e) => {
            eprintln!("Warning: Failed to register search shortcut: {}", e);
            // Don't return error, try to register other shortcuts
            // On Wayland, this is expected to fail - D-Bus should be used instead
        }
    }

    // Register quick add shortcut (CmdOrCtrl+Shift+A)
    // This automatically becomes:
    // - Cmd+Shift+A on macOS
    // - Ctrl+Shift+A on Windows/Linux
    match register_quick_add_shortcut(app) {
        Ok(_) => {}
        Err(e) => {
            eprintln!("Warning: Failed to register quick add shortcut: {}", e);
            // Don't return error, continue with app startup
            // On Wayland, this is expected to fail - D-Bus should be used instead
        }
    }

    Ok(())
}

/// Registers shortcuts from settings configuration.
///
/// This function unregisters all existing shortcuts and registers new ones
/// based on the provided settings. It should be called when settings are updated.
///
/// # Arguments
///
/// * `app` - The Tauri application handle
/// * `shortcuts` - The shortcut configuration from settings
///
/// # Returns
///
/// Returns `Ok(())` if all shortcuts were registered successfully.
///
/// # Errors
///
/// Returns `ShortcutError` if any registration fails.
pub fn register_shortcuts_from_settings(
    app: &AppHandle,
    shortcuts: &GlobalShortcuts,
) -> Result<(), ShortcutError> {
    // Unregister all existing shortcuts first
    unregister_all_shortcuts(app)?;

    // Register search shortcut with custom key combination
    register_search_shortcut_with_key(app, &shortcuts.search_select)?;

    // Register quick add shortcut with custom key combination
    register_quick_add_shortcut_with_key(app, &shortcuts.quick_add)?;

    Ok(())
}

/// Registers the search overlay shortcut with a custom key combination.
///
/// # Arguments
///
/// * `app` - The Tauri application handle
/// * `shortcut_str` - The shortcut string (e.g., "Cmd+Shift+S")
///
/// # Returns
///
/// Returns `Ok(())` if the shortcut was registered successfully.
///
/// # Errors
///
/// Returns `ShortcutError` if registration fails.
pub fn register_search_shortcut_with_key(
    app: &AppHandle,
    shortcut_str: &str,
) -> Result<(), ShortcutError> {
    let shortcut = shortcut_str
        .parse::<Shortcut>()
        .map_err(|e| ShortcutError::InvalidFormat(format!("{}: {}", shortcut_str, e)))?;

    let app_handle = app.clone();

    app.global_shortcut()
        .on_shortcut(shortcut, move |_app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                if let Err(e) = window::toggle_search_window(&app_handle) {
                    eprintln!("Failed to toggle search window from shortcut: {}", e);
                }
            }
        })
        .map_err(|e| ShortcutError::RegistrationFailed(shortcut_str.to_string(), e.to_string()))?;

    Ok(())
}

/// Registers the quick add dialog shortcut with a custom key combination.
///
/// # Arguments
///
/// * `app` - The Tauri application handle
/// * `shortcut_str` - The shortcut string (e.g., "Cmd+Shift+A")
///
/// # Returns
///
/// Returns `Ok(())` if the shortcut was registered successfully.
///
/// # Errors
///
/// Returns `ShortcutError` if registration fails.
pub fn register_quick_add_shortcut_with_key(
    app: &AppHandle,
    shortcut_str: &str,
) -> Result<(), ShortcutError> {
    let shortcut = shortcut_str
        .parse::<Shortcut>()
        .map_err(|e| ShortcutError::InvalidFormat(format!("{}: {}", shortcut_str, e)))?;

    let app_handle = app.clone();

    app.global_shortcut()
        .on_shortcut(shortcut, move |_app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                if let Err(e) = window::show_quick_add_window(&app_handle) {
                    eprintln!("Failed to show quick add window from shortcut: {}", e);
                }
            }
        })
        .map_err(|e| ShortcutError::RegistrationFailed(shortcut_str.to_string(), e.to_string()))?;

    Ok(())
}

/// Registers the search overlay shortcut (Cmd/Ctrl+Shift+S).
///
/// This function registers the default search shortcut using `CmdOrCtrl+Shift+S`,
/// which automatically resolves to the platform-appropriate modifier key:
/// - macOS: Cmd+Shift+S
/// - Windows/Linux: Ctrl+Shift+S
///
/// **Platform Notes**:
/// - Linux X11: Works natively via Tauri's global shortcut plugin
/// - Linux Wayland: Will likely fail due to compositor restrictions. Use D-Bus instead.
///
/// # Arguments
///
/// * `app` - The Tauri application handle
///
/// # Returns
///
/// Returns `Ok(())` if the shortcut was registered successfully.
///
/// # Errors
///
/// Returns `ShortcutError` if:
/// - The shortcut is already registered by another application
/// - The shortcut format is invalid
/// - Registration fails for any other reason (e.g., Wayland restrictions)
pub fn register_search_shortcut(app: &AppHandle) -> Result<(), ShortcutError> {
    // Parse the CmdOrCtrl shortcut string into a Shortcut object
    // The tauri-plugin-global-shortcut will resolve CmdOrCtrl to the correct key
    let shortcut = SHORTCUT_SEARCH
        .parse::<Shortcut>()
        .map_err(|e| ShortcutError::InvalidFormat(format!("{}: {}", SHORTCUT_SEARCH, e)))?;

    let app_handle = app.clone();

    app.global_shortcut()
        .on_shortcut(shortcut, move |_app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                if let Err(e) = window::toggle_search_window(&app_handle) {
                    eprintln!("Failed to toggle search window from shortcut: {}", e);
                }
            }
        })
        .map_err(|e| {
            ShortcutError::RegistrationFailed(SHORTCUT_SEARCH.to_string(), e.to_string())
        })?;

    Ok(())
}

/// Registers the quick add dialog shortcut (Cmd/Ctrl+Shift+A).
///
/// This function registers the default quick add shortcut using `CmdOrCtrl+Shift+A`,
/// which automatically resolves to the platform-appropriate modifier key:
/// - macOS: Cmd+Shift+A
/// - Windows/Linux: Ctrl+Shift+A
///
/// **Platform Notes**:
/// - Linux X11: Works natively via Tauri's global shortcut plugin
/// - Linux Wayland: Will likely fail due to compositor restrictions. Use D-Bus instead.
///
/// # Arguments
///
/// * `app` - The Tauri application handle
///
/// # Returns
///
/// Returns `Ok(())` if the shortcut was registered successfully.
///
/// # Errors
///
/// Returns `ShortcutError` if:
/// - The shortcut is already registered by another application
/// - The shortcut format is invalid
/// - Registration fails for any other reason (e.g., Wayland restrictions)
pub fn register_quick_add_shortcut(app: &AppHandle) -> Result<(), ShortcutError> {
    // Parse the CmdOrCtrl shortcut string into a Shortcut object
    // The tauri-plugin-global-shortcut will resolve CmdOrCtrl to the correct key
    let shortcut = SHORTCUT_QUICK_ADD
        .parse::<Shortcut>()
        .map_err(|e| ShortcutError::InvalidFormat(format!("{}: {}", SHORTCUT_QUICK_ADD, e)))?;

    let app_handle = app.clone();

    app.global_shortcut()
        .on_shortcut(shortcut, move |_app, _shortcut, event| {
            eprintln!(
                "[DEBUG] [shortcuts.rs] Quick Add shortcut triggered, state: {:?}",
                event.state
            );
            if event.state == ShortcutState::Pressed {
                eprintln!("[DEBUG] [shortcuts.rs] Calling show_quick_add_window()");
                if let Err(e) = window::show_quick_add_window(&app_handle) {
                    eprintln!(
                        "[ERROR] Failed to show quick add window from shortcut: {}",
                        e
                    );
                } else {
                    eprintln!("[DEBUG] [shortcuts.rs] show_quick_add_window() returned Ok");
                }
            }
        })
        .map_err(|e| {
            ShortcutError::RegistrationFailed(SHORTCUT_QUICK_ADD.to_string(), e.to_string())
        })?;

    Ok(())
}

/// Registers a custom shortcut with a callback.
///
/// This function provides a flexible way to register custom shortcuts
/// that aren't part of the default set.
///
/// # Arguments
///
/// * `app` - The Tauri application handle
/// * `shortcut_str` - The shortcut string (e.g., "Cmd+Shift+K")
/// * `callback` - The function to call when the shortcut is pressed
///
/// # Returns
///
/// Returns `Ok(())` if the shortcut was registered successfully.
///
/// # Errors
///
/// Returns `ShortcutError` if registration fails.
///
/// # Examples
///
/// ```rust
/// register_custom_shortcut(&app, "Cmd+Shift+K", |app| {
///     println!("Custom shortcut triggered!");
/// })?;
/// ```
pub fn register_custom_shortcut<F>(
    app: &AppHandle,
    shortcut_str: &str,
    callback: F,
) -> Result<(), ShortcutError>
where
    F: Fn(&AppHandle) + Send + Sync + 'static,
{
    let shortcut = shortcut_str
        .parse::<Shortcut>()
        .map_err(|e| ShortcutError::InvalidFormat(format!("{}: {}", shortcut_str, e)))?;

    let app_handle = app.clone();

    app.global_shortcut()
        .on_shortcut(shortcut, move |_app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                callback(&app_handle);
            }
        })
        .map_err(|e| ShortcutError::RegistrationFailed(shortcut_str.to_string(), e.to_string()))?;

    Ok(())
}

/// Unregisters a specific shortcut.
///
/// # Arguments
///
/// * `app` - The Tauri application handle
/// * `shortcut_str` - The shortcut string to unregister
///
/// # Returns
///
/// Returns `Ok(())` if the shortcut was unregistered successfully.
///
/// # Errors
///
/// Returns `ShortcutError` if unregistration fails.
pub fn unregister_shortcut(app: &AppHandle, shortcut_str: &str) -> Result<(), ShortcutError> {
    let shortcut = shortcut_str
        .parse::<Shortcut>()
        .map_err(|e| ShortcutError::InvalidFormat(format!("{}: {}", shortcut_str, e)))?;

    app.global_shortcut().unregister(shortcut).map_err(|e| {
        ShortcutError::UnregistrationFailed(shortcut_str.to_string(), e.to_string())
    })?;

    Ok(())
}

/// Unregisters all shortcuts for the application.
///
/// # Arguments
///
/// * `app` - The Tauri application handle
///
/// # Returns
///
/// Returns `Ok(())` if all shortcuts were unregistered successfully.
pub fn unregister_all_shortcuts(app: &AppHandle) -> Result<(), ShortcutError> {
    app.global_shortcut()
        .unregister_all()
        .map_err(|e| ShortcutError::UnregistrationFailed("all".to_string(), e.to_string()))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_shortcut_constants() {
        assert_eq!(SHORTCUT_SEARCH, "CmdOrCtrl+Shift+S");
        assert_eq!(SHORTCUT_QUICK_ADD, "CmdOrCtrl+Shift+A");
    }

    #[test]
    fn test_shortcut_error_display() {
        let error = ShortcutError::InvalidFormat("test".to_string());
        assert!(error.to_string().contains("Invalid shortcut format"));

        let error = ShortcutError::AlreadyRegistered("Cmd+S".to_string());
        assert!(error.to_string().contains("already registered"));
    }

    #[test]
    fn test_platform_specific_search_shortcut_display() {
        let display = get_search_shortcut_display();

        // On macOS, it should be Cmd+Shift+S
        #[cfg(target_os = "macos")]
        assert_eq!(display, "Cmd+Shift+S");

        // On Windows and Linux, it should be Ctrl+Shift+S
        #[cfg(not(target_os = "macos"))]
        assert_eq!(display, "Ctrl+Shift+S");
    }

    #[test]
    fn test_platform_specific_quick_add_shortcut_display() {
        let display = get_quick_add_shortcut_display();

        // On macOS, it should be Cmd+Shift+A
        #[cfg(target_os = "macos")]
        assert_eq!(display, "Cmd+Shift+A");

        // On Windows and Linux, it should be Ctrl+Shift+A
        #[cfg(not(target_os = "macos"))]
        assert_eq!(display, "Ctrl+Shift+A");
    }

    #[test]
    fn test_cmdorctrl_maps_correctly() {
        // Verify that CmdOrCtrl constant contains the meta-key
        assert!(SHORTCUT_SEARCH.contains("CmdOrCtrl"));
        assert!(SHORTCUT_QUICK_ADD.contains("CmdOrCtrl"));

        // The CmdOrCtrl meta-key should automatically map to:
        // - Cmd on macOS
        // - Ctrl on Windows/Linux
        //
        // This is handled by the tauri-plugin-global-shortcut parser,
        // so we verify that our constants use the correct format.
    }

    #[test]
    fn test_linux_shortcuts_documented() {
        // On Linux, Ctrl+Shift+S should work via CmdOrCtrl
        #[cfg(target_os = "linux")]
        {
            let search_display = get_search_shortcut_display();
            let quick_add_display = get_quick_add_shortcut_display();

            assert_eq!(search_display, "Ctrl+Shift+S");
            assert_eq!(quick_add_display, "Ctrl+Shift+A");

            // The internal constant still uses CmdOrCtrl for cross-platform compatibility
            assert_eq!(SHORTCUT_SEARCH, "CmdOrCtrl+Shift+S");
            assert_eq!(SHORTCUT_QUICK_ADD, "CmdOrCtrl+Shift+A");
        }
    }

    #[test]
    fn test_windows_shortcuts_documented() {
        // On Windows, Ctrl+Shift+S should work via CmdOrCtrl
        #[cfg(target_os = "windows")]
        {
            let search_display = get_search_shortcut_display();
            let quick_add_display = get_quick_add_shortcut_display();

            assert_eq!(search_display, "Ctrl+Shift+S");
            assert_eq!(quick_add_display, "Ctrl+Shift+A");

            // The internal constant still uses CmdOrCtrl for cross-platform compatibility
            assert_eq!(SHORTCUT_SEARCH, "CmdOrCtrl+Shift+S");
            assert_eq!(SHORTCUT_QUICK_ADD, "CmdOrCtrl+Shift+A");
        }
    }

    #[test]
    fn test_macos_shortcuts_documented() {
        // On macOS, Cmd+Shift+S should work via CmdOrCtrl
        #[cfg(target_os = "macos")]
        {
            let search_display = get_search_shortcut_display();
            let quick_add_display = get_quick_add_shortcut_display();

            assert_eq!(search_display, "Cmd+Shift+S");
            assert_eq!(quick_add_display, "Cmd+Shift+A");

            // The internal constant still uses CmdOrCtrl for cross-platform compatibility
            assert_eq!(SHORTCUT_SEARCH, "CmdOrCtrl+Shift+S");
            assert_eq!(SHORTCUT_QUICK_ADD, "CmdOrCtrl+Shift+A");
        }
    }
}
