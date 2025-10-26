use crate::models::tag::Tag;
use crate::services::tags::{get_all_tags, update_tag_color};
use tauri::AppHandle;

/// Get all tags with their colors
///
/// # Arguments
///
/// * `app` - Tauri application handle
///
/// # Returns
///
/// Vector of all tags with their metadata (id, name, color)
///
/// # Errors
///
/// Returns error string if database operations fail
#[tauri::command]
pub async fn get_tags(app: AppHandle) -> Result<Vec<Tag>, String> {
    get_all_tags(&app).await.map_err(|e| e.to_string())
}

/// Update the color of a tag
///
/// # Arguments
///
/// * `app` - Tauri application handle
/// * `tag_name` - Name of the tag to update
/// * `color` - New hex color (e.g., "#FF5733")
///
/// # Returns
///
/// `Ok(())` on success
///
/// # Errors
///
/// Returns error string if database operations fail or tag doesn't exist
#[tauri::command]
pub async fn update_tag_color_cmd(
    app: AppHandle,
    tag_name: String,
    color: String,
) -> Result<(), String> {
    update_tag_color(&app, &tag_name, &color)
        .await
        .map_err(|e| e.to_string())
}
