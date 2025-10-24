use crate::services::database::get_pool;
use crate::utils::error::AppError;
use sqlx::Row;
use tauri::AppHandle;

/// Gets or creates a tag by name, returns tag_id
///
/// # Arguments
///
/// * `app` - Tauri application handle
/// * `tag_name` - The name of the tag to get or create
///
/// # Returns
///
/// The tag ID (i64) of the existing or newly created tag
///
/// # Errors
///
/// Returns `AppError` if database operations fail
pub async fn get_or_create_tag(app: &AppHandle, tag_name: &str) -> Result<i64, AppError> {
    let pool = get_pool(app)?;

    // Try to get existing tag
    let result = sqlx::query("SELECT id FROM tags WHERE name = ?")
        .bind(tag_name)
        .fetch_optional(&pool)
        .await?;

    if let Some(row) = result {
        return Ok(row.get(0));
    }

    // Create new tag if it doesn't exist
    let result = sqlx::query("INSERT INTO tags (name) VALUES (?)")
        .bind(tag_name)
        .execute(&pool)
        .await?;

    Ok(result.last_insert_rowid())
}

/// Associates tags with a snippet
///
/// # Arguments
///
/// * `app` - Tauri application handle
/// * `snippet_id` - The ID of the snippet to associate tags with
/// * `tags` - Slice of tag names to associate
///
/// # Returns
///
/// `Ok(())` on success
///
/// # Errors
///
/// Returns `AppError` if database operations fail
pub async fn associate_tags(
    app: &AppHandle,
    snippet_id: i64,
    tags: &[String],
) -> Result<(), AppError> {
    let pool = get_pool(app)?;

    for tag_name in tags {
        let tag_name = tag_name.trim();
        if tag_name.is_empty() {
            continue;
        }

        let tag_id = get_or_create_tag(app, tag_name).await?;

        // Create snippet-tag association (ignore duplicates)
        sqlx::query("INSERT OR IGNORE INTO snippet_tags (snippet_id, tag_id) VALUES (?, ?)")
            .bind(snippet_id)
            .bind(tag_id)
            .execute(&pool)
            .await?;
    }

    Ok(())
}

/// Gets all tags for a snippet
///
/// # Arguments
///
/// * `app` - Tauri application handle
/// * `snippet_id` - The ID of the snippet to get tags for
///
/// # Returns
///
/// Vector of tag names sorted alphabetically
///
/// # Errors
///
/// Returns `AppError` if database operations fail
pub async fn get_snippet_tags(app: &AppHandle, snippet_id: i64) -> Result<Vec<String>, AppError> {
    let pool = get_pool(app)?;

    let tags = sqlx::query(
        "SELECT t.name FROM tags t
         INNER JOIN snippet_tags st ON t.id = st.tag_id
         WHERE st.snippet_id = ?
         ORDER BY t.name",
    )
    .bind(snippet_id)
    .fetch_all(&pool)
    .await?;

    Ok(tags.iter().map(|row| row.get(0)).collect())
}

/// Removes all tags from a snippet
///
/// # Arguments
///
/// * `app` - Tauri application handle
/// * `snippet_id` - The ID of the snippet to remove tags from
///
/// # Returns
///
/// `Ok(())` on success
///
/// # Errors
///
/// Returns `AppError` if database operations fail
pub async fn remove_snippet_tags(app: &AppHandle, snippet_id: i64) -> Result<(), AppError> {
    let pool = get_pool(app)?;

    sqlx::query("DELETE FROM snippet_tags WHERE snippet_id = ?")
        .bind(snippet_id)
        .execute(&pool)
        .await?;

    Ok(())
}

#[cfg(test)]
mod tests {

    #[test]
    fn test_tag_name_trimming() {
        let tag = "  rust  ";
        assert_eq!(tag.trim(), "rust");
    }

    #[test]
    fn test_empty_tag_detection() {
        let empty_tags = vec!["".to_string(), "   ".to_string()];
        for tag in empty_tags {
            assert!(tag.trim().is_empty());
        }
    }
}
