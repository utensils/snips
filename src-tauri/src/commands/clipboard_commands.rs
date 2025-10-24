use crate::utils::error::AppError;
use tauri::AppHandle;

/// Get the currently selected text from the active application.
/// On macOS, this uses AppleScript to simulate Cmd+C and read the clipboard.
///
/// # Returns
///
/// The selected text as a String, or an error if the operation fails.
///
/// # Errors
///
/// Returns an error if:
/// - AppleScript execution fails
/// - No text is selected
/// - Clipboard reading fails
#[tauri::command]
pub async fn get_selected_text(_app: AppHandle) -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;

        // Store the current clipboard content to restore it later
        let original_clipboard = get_clipboard_content().await.unwrap_or_default();

        // Use AppleScript to copy selected text
        let script = r#"
            tell application "System Events"
                keystroke "c" using {command down}
            end tell
            delay 0.1
        "#;

        let output = Command::new("osascript")
            .arg("-e")
            .arg(script)
            .output()
            .map_err(|e| AppError::External(format!("Failed to execute AppleScript: {}", e)))?;

        if !output.status.success() {
            let error = String::from_utf8_lossy(&output.stderr);
            return Err(AppError::External(format!("AppleScript error: {}", error)).into());
        }

        // Small delay to ensure clipboard is updated
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

        // Read the clipboard content
        let selected_text = get_clipboard_content().await?;

        // Restore original clipboard if it was different
        if !original_clipboard.is_empty() && original_clipboard != selected_text {
            set_clipboard_content(&original_clipboard).await?;
        }

        if selected_text.trim().is_empty() {
            return Err(AppError::NotFound("No text selected".to_string()).into());
        }

        Ok(selected_text)
    }

    #[cfg(not(target_os = "macos"))]
    {
        Err(
            AppError::Unsupported("Text selection capture is only supported on macOS".to_string())
                .into(),
        )
    }
}

/// Copy text to the system clipboard
///
/// # Arguments
///
/// * `text` - The text to copy to clipboard
///
/// # Returns
///
/// Ok(()) on success, or an error if the operation fails
///
/// # Errors
///
/// Returns an error if:
/// - Text is empty
/// - Clipboard write operation fails
/// - Platform is not supported
#[tauri::command]
pub async fn copy_to_clipboard(_app: AppHandle, text: String) -> Result<(), String> {
    // Validate input
    if text.is_empty() {
        return Err(
            AppError::InvalidInput("Cannot copy empty text to clipboard".to_string()).into(),
        );
    }

    // Limit text size to prevent issues (10MB)
    const MAX_SIZE: usize = 10 * 1024 * 1024;
    if text.len() > MAX_SIZE {
        return Err(AppError::InvalidInput(format!(
            "Text too large to copy (max {} MB)",
            MAX_SIZE / 1024 / 1024
        ))
        .into());
    }

    set_clipboard_content(&text).await
}

/// Helper function to get clipboard content
async fn get_clipboard_content() -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;

        let output = Command::new("pbpaste")
            .output()
            .map_err(|e| AppError::External(format!("Failed to read clipboard: {}", e)))?;

        if !output.status.success() {
            return Err(AppError::External("Failed to read clipboard".to_string()).into());
        }

        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    }

    #[cfg(not(target_os = "macos"))]
    {
        Err(
            AppError::Unsupported("Clipboard operations only supported on macOS".to_string())
                .into(),
        )
    }
}

/// Helper function to set clipboard content
async fn set_clipboard_content(text: &str) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use std::io::Write;
        use std::process::{Command, Stdio};

        let mut child = Command::new("pbcopy")
            .stdin(Stdio::piped())
            .spawn()
            .map_err(|e| AppError::External(format!("Failed to write to clipboard: {}", e)))?;

        if let Some(mut stdin) = child.stdin.take() {
            stdin
                .write_all(text.as_bytes())
                .map_err(|e| AppError::External(format!("Failed to write to clipboard: {}", e)))?;
        }

        let status = child
            .wait()
            .map_err(|e| AppError::External(format!("Failed to write to clipboard: {}", e)))?;

        if !status.success() {
            return Err(AppError::External("Failed to write to clipboard".to_string()).into());
        }

        Ok(())
    }

    #[cfg(not(target_os = "macos"))]
    {
        Err(
            AppError::Unsupported("Clipboard operations only supported on macOS".to_string())
                .into(),
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    #[cfg(target_os = "macos")]
    async fn test_clipboard_operations() {
        let test_text = "Test clipboard content";

        // Test setting clipboard
        let result = set_clipboard_content(test_text).await;
        assert!(result.is_ok());

        // Test getting clipboard
        let result = get_clipboard_content().await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), test_text);
    }
}
