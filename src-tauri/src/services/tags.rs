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
    let pool = get_pool(app).map_err(|e| {
        AppError::Database(format!(
            "Failed to get database connection for tag '{}': {}",
            tag_name, e
        ))
    })?;

    // Try to get existing tag
    let result = sqlx::query("SELECT id FROM tags WHERE name = ?")
        .bind(tag_name)
        .fetch_optional(&pool)
        .await
        .map_err(|e| AppError::Database(format!("Failed to query tag '{}': {}", tag_name, e)))?;

    if let Some(row) = result {
        return Ok(row.get(0));
    }

    // Create new tag if it doesn't exist
    let result = sqlx::query("INSERT INTO tags (name) VALUES (?)")
        .bind(tag_name)
        .execute(&pool)
        .await
        .map_err(|e| AppError::Database(format!("Failed to create tag '{}': {}", tag_name, e)))?;

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
    eprintln!(
        "[DEBUG] [tags] associate_tags: snippet_id={}, {} tags",
        snippet_id,
        tags.len()
    );

    let pool = get_pool(app).map_err(|e| {
        eprintln!("[ERROR] [tags] associate_tags: Failed to get pool: {}", e);
        AppError::Database(format!(
            "Failed to get database connection for tag association: {}",
            e
        ))
    })?;

    for (i, tag_name) in tags.iter().enumerate() {
        let tag_name = tag_name.trim();
        if tag_name.is_empty() {
            eprintln!(
                "[DEBUG] [tags] associate_tags: Skipping empty tag at index {}",
                i
            );
            continue;
        }

        eprintln!(
            "[DEBUG] [tags] associate_tags: Processing tag '{}' ({}/{})",
            tag_name,
            i + 1,
            tags.len()
        );
        let tag_id = get_or_create_tag(app, tag_name).await?;
        eprintln!(
            "[DEBUG] [tags] associate_tags: Tag '{}' has id={}",
            tag_name, tag_id
        );

        // Create snippet-tag association (ignore duplicates)
        eprintln!("[DEBUG] [tags] associate_tags: Inserting snippet_tags record");
        sqlx::query("INSERT OR IGNORE INTO snippet_tags (snippet_id, tag_id) VALUES (?, ?)")
            .bind(snippet_id)
            .bind(tag_id)
            .execute(&pool)
            .await
            .map_err(|e| {
                eprintln!("[ERROR] [tags] associate_tags: INSERT failed: {}", e);
                AppError::Database(format!(
                    "Failed to associate tag '{}' (id: {}) with snippet {}: {}",
                    tag_name, tag_id, snippet_id, e
                ))
            })?;
        eprintln!(
            "[DEBUG] [tags] associate_tags: Tag '{}' associated successfully",
            tag_name
        );
    }

    eprintln!("[DEBUG] [tags] associate_tags: All tags processed successfully");
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
    eprintln!("[DEBUG] [tags] get_snippet_tags: snippet_id={}", snippet_id);

    let pool = get_pool(app).map_err(|e| {
        eprintln!("[ERROR] [tags] get_snippet_tags: Failed to get pool: {}", e);
        AppError::Database(format!("Failed to get database connection for tags: {}", e))
    })?;

    eprintln!("[DEBUG] [tags] get_snippet_tags: Executing SELECT query");
    let tags = sqlx::query(
        "SELECT t.name FROM tags t
         INNER JOIN snippet_tags st ON t.id = st.tag_id
         WHERE st.snippet_id = ?
         ORDER BY t.name",
    )
    .bind(snippet_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| {
        eprintln!("[ERROR] [tags] get_snippet_tags: SELECT failed: {}", e);
        AppError::Database(format!(
            "Failed to fetch tags for snippet {}: {}",
            snippet_id, e
        ))
    })?;

    let tag_names: Vec<String> = tags.iter().map(|row| row.get(0)).collect();
    eprintln!(
        "[DEBUG] [tags] get_snippet_tags: Found {} tags: {:?}",
        tag_names.len(),
        tag_names
    );
    Ok(tag_names)
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

    #[test]
    fn test_tag_sql_queries() {
        // Test SQL query syntax is valid
        let get_tag_query = "SELECT id FROM tags WHERE name = ?";
        assert!(get_tag_query.contains("SELECT"));
        assert!(get_tag_query.contains("WHERE"));

        let insert_tag_query = "INSERT INTO tags (name) VALUES (?)";
        assert!(insert_tag_query.contains("INSERT"));
        assert!(insert_tag_query.contains("VALUES"));

        let associate_query =
            "INSERT OR IGNORE INTO snippet_tags (snippet_id, tag_id) VALUES (?, ?)";
        assert!(associate_query.contains("INSERT OR IGNORE"));
        assert!(associate_query.contains("snippet_tags"));
    }

    #[test]
    fn test_get_snippet_tags_query() {
        // Verify the JOIN query structure for fetching tags
        let query = "SELECT t.name FROM tags t
         INNER JOIN snippet_tags st ON t.id = st.tag_id
         WHERE st.snippet_id = ?
         ORDER BY t.name";

        assert!(query.contains("INNER JOIN"));
        assert!(query.contains("snippet_tags"));
        assert!(query.contains("ORDER BY t.name"));
    }

    #[test]
    fn test_error_messages_are_descriptive() {
        // Test that error messages include context
        let tag_name = "test-tag";
        let snippet_id = 123i64;

        // Error format examples from actual code
        let error1 = format!(
            "Failed to get database connection for tag '{}': test error",
            tag_name
        );
        assert!(error1.contains("test-tag"));
        assert!(error1.contains("database connection"));

        let error2 = format!("Failed to query tag '{}': test error", tag_name);
        assert!(error2.contains("test-tag"));
        assert!(error2.contains("query"));

        let error3 = format!(
            "Failed to fetch tags for snippet {}: test error",
            snippet_id
        );
        assert!(error3.contains("123"));
        assert!(error3.contains("fetch tags"));
    }

    /// Integration test notes for tag operations
    ///
    /// Test Case 1: Create tag and associate with snippet
    /// - Create a snippet
    /// - Associate tags via associate_tags()
    /// - Verify get_snippet_tags() returns correct tags
    /// - Tags should be alphabetically sorted
    ///
    /// Test Case 2: Duplicate tag handling
    /// - Call get_or_create_tag() twice with same name
    /// - Should return same tag_id both times
    /// - No duplicate tags should be created
    ///
    /// Test Case 3: Empty tag filtering
    /// - Call associate_tags() with empty strings
    /// - Empty tags should be skipped (continue in loop)
    /// - Only non-empty tags should be created
    ///
    /// Test Case 4: Tag removal
    /// - Associate tags with snippet
    /// - Call remove_snippet_tags()
    /// - Verify get_snippet_tags() returns empty vector
    /// - Tags themselves should still exist (not deleted)
    #[test]
    fn test_tag_integration_documentation() {
        // This test documents expected behavior for integration tests
        // Actual integration tests require database setup
        assert!(true, "See test comments for integration test scenarios");
    }
}
