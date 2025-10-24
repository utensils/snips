/// Tauri commands for managing global keyboard shortcuts.
///
/// This module provides IPC commands that allow the frontend to:
/// - Query registered shortcuts
/// - Register custom shortcuts
/// - Unregister shortcuts
/// - Handle shortcut conflicts
use crate::services::shortcuts;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;

/// Information about a registered shortcut.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShortcutInfo {
    /// The shortcut key combination (e.g., "CmdOrCtrl+Shift+S")
    pub shortcut: String,
    /// A human-readable description of what the shortcut does
    pub description: String,
    /// Whether this is a default (built-in) shortcut
    pub is_default: bool,
}

/// Returns information about all default shortcuts.
///
/// # Returns
///
/// A list of `ShortcutInfo` objects describing the default shortcuts.
///
/// # Examples
///
/// ```typescript
/// const shortcuts = await invoke('get_default_shortcuts');
/// console.log(shortcuts); // [{ shortcut: "CmdOrCtrl+Shift+S", ... }]
/// ```
#[tauri::command]
pub fn get_default_shortcuts() -> Vec<ShortcutInfo> {
    vec![
        ShortcutInfo {
            shortcut: shortcuts::SHORTCUT_SEARCH.to_string(),
            description: "Open search overlay".to_string(),
            is_default: true,
        },
        ShortcutInfo {
            shortcut: shortcuts::SHORTCUT_QUICK_ADD.to_string(),
            description: "Open quick add dialog".to_string(),
            is_default: true,
        },
    ]
}

/// Attempts to register a custom shortcut.
///
/// # Arguments
///
/// * `app` - The Tauri application handle (automatically injected)
/// * `shortcut` - The shortcut string to register (e.g., "Cmd+Shift+K")
/// * `action` - The action to perform (currently only "search" or "quick-add" supported)
///
/// # Returns
///
/// Returns `Ok(())` if the shortcut was registered successfully, or an error message.
///
/// # Errors
///
/// Returns an error if:
/// - The shortcut format is invalid
/// - The shortcut is already registered by another application
/// - The action is not recognized
///
/// # Examples
///
/// ```typescript
/// try {
///   await invoke('register_custom_shortcut', {
///     shortcut: 'Cmd+Shift+K',
///     action: 'search'
///   });
/// } catch (error) {
///   console.error('Failed to register shortcut:', error);
/// }
/// ```
#[tauri::command]
pub fn register_custom_shortcut(
    app: AppHandle,
    shortcut: String,
    action: String,
) -> Result<(), String> {
    match action.as_str() {
        "search" => shortcuts::register_custom_shortcut(&app, &shortcut, |app_handle| {
            if let Err(e) = crate::services::window::toggle_search_window(app_handle) {
                eprintln!("Failed to toggle search window: {}", e);
            }
        })
        .map_err(|e| e.to_string()),
        "quick-add" => shortcuts::register_custom_shortcut(&app, &shortcut, |app_handle| {
            if let Err(e) = crate::services::window::show_quick_add_window(app_handle) {
                eprintln!("Failed to show quick add window: {}", e);
            }
        })
        .map_err(|e| e.to_string()),
        _ => Err(format!("Unknown action: {}", action)),
    }
}

/// Unregisters a specific shortcut.
///
/// # Arguments
///
/// * `app` - The Tauri application handle (automatically injected)
/// * `shortcut` - The shortcut string to unregister
///
/// # Returns
///
/// Returns `Ok(())` if the shortcut was unregistered successfully, or an error message.
///
/// # Examples
///
/// ```typescript
/// await invoke('unregister_shortcut', { shortcut: 'Cmd+Shift+K' });
/// ```
#[tauri::command]
pub fn unregister_shortcut(app: AppHandle, shortcut: String) -> Result<(), String> {
    shortcuts::unregister_shortcut(&app, &shortcut).map_err(|e| e.to_string())
}

/// Checks if a shortcut string is valid.
///
/// This command allows the frontend to validate shortcut input before
/// attempting to register it.
///
/// # Arguments
///
/// * `shortcut` - The shortcut string to validate
///
/// # Returns
///
/// Returns `true` if the shortcut format is valid, `false` otherwise.
///
/// # Examples
///
/// ```typescript
/// const isValid = await invoke('is_shortcut_valid', { shortcut: 'Cmd+Shift+K' });
/// if (!isValid) {
///   console.error('Invalid shortcut format');
/// }
/// ```
#[tauri::command]
pub fn is_shortcut_valid(shortcut: String) -> bool {
    use tauri_plugin_global_shortcut::Shortcut;
    shortcut.parse::<Shortcut>().is_ok()
}

/// Re-registers all default shortcuts.
///
/// This is useful if shortcuts were unregistered or if there was a conflict
/// that has been resolved.
///
/// # Arguments
///
/// * `app` - The Tauri application handle (automatically injected)
///
/// # Returns
///
/// Returns `Ok(())` if shortcuts were re-registered successfully, or an error message.
///
/// # Examples
///
/// ```typescript
/// await invoke('reregister_default_shortcuts');
/// ```
#[tauri::command]
pub fn reregister_default_shortcuts(app: AppHandle) -> Result<(), String> {
    shortcuts::register_all_shortcuts(&app).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_default_shortcuts() {
        let shortcuts = get_default_shortcuts();
        assert_eq!(shortcuts.len(), 2);

        assert!(shortcuts.iter().any(|s| s.shortcut == "CmdOrCtrl+Shift+S"));
        assert!(shortcuts.iter().any(|s| s.shortcut == "CmdOrCtrl+Shift+A"));

        for shortcut in shortcuts {
            assert!(shortcut.is_default);
            assert!(!shortcut.description.is_empty());
        }
    }

    #[test]
    fn test_is_shortcut_valid() {
        assert!(is_shortcut_valid("CmdOrCtrl+Shift+S".to_string()));
        assert!(is_shortcut_valid("Cmd+K".to_string()));
        assert!(is_shortcut_valid("Ctrl+Alt+Delete".to_string()));

        assert!(!is_shortcut_valid("".to_string()));
        assert!(!is_shortcut_valid("InvalidShortcut".to_string()));
    }
}
