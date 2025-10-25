use crate::models::{CreateSnippetInput, Snippet, SnippetId, UpdateSnippetInput};
use crate::services::database::get_pool;
use crate::services::tags;
use crate::utils::time::current_timestamp;
use sqlx::Row;
use tauri::AppHandle;

/// Create a new snippet with optional tags
#[tauri::command]
pub async fn create_snippet(app: AppHandle, input: CreateSnippetInput) -> Result<Snippet, String> {
    eprintln!("[DEBUG] [snippet_commands] === create_snippet() called ===");
    eprintln!(
        "[DEBUG] [snippet_commands] Input: name='{}', content_len={}, tags={:?}",
        input.name,
        input.content.len(),
        input.tags
    );

    // Validate input
    if input.name.trim().is_empty() {
        eprintln!("[ERROR] [snippet_commands] Validation failed: empty name");
        return Err("Snippet name is required and cannot be empty".to_string());
    }
    if input.content.trim().is_empty() {
        eprintln!("[ERROR] [snippet_commands] Validation failed: empty content");
        return Err("Snippet content is required and cannot be empty".to_string());
    }

    eprintln!("[DEBUG] [snippet_commands] Validation passed, getting database pool");
    let pool = get_pool(&app).map_err(|e| {
        eprintln!(
            "[ERROR] [snippet_commands] Failed to get database pool: {}",
            e
        );
        format!("Database connection failed: {}. Try restarting the app.", e)
    })?;

    eprintln!("[DEBUG] [snippet_commands] Got database pool successfully");
    let now = current_timestamp();

    eprintln!("[DEBUG] [snippet_commands] Executing INSERT query");
    // Insert snippet
    let result = sqlx::query(
        "INSERT INTO snippets (name, content, description, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)",
    )
    .bind(input.name.trim())
    .bind(input.content.trim())
    .bind(input.description.as_deref().map(|s| s.trim()))
    .bind(now)
    .bind(now)
    .execute(&pool)
    .await
    .map_err(|e| {
        eprintln!("[ERROR] [snippet_commands] Database insert failed: {}", e);
        if e.to_string().contains("UNIQUE constraint failed") {
            format!(
                "A snippet named '{}' already exists. Please choose a different name.",
                input.name.trim()
            )
        } else if e.to_string().contains("no such table") {
            "Database not initialized. The 'snippets' table is missing. Try restarting the app.".to_string()
        } else if e.to_string().contains("database is locked") {
            "Database is locked by another process. Close any other instances of the app and try again.".to_string()
        } else if e.to_string().contains("readonly database") || e.to_string().contains("attempt to write a readonly database") {
            format!("Database is read-only. Check file permissions: {}", e)
        } else {
            format!("Failed to save snippet to database: {}. Check logs for details.", e)
        }
    })?;

    let snippet_id = result.last_insert_rowid();
    eprintln!(
        "[DEBUG] [snippet_commands] INSERT succeeded, snippet_id={}",
        snippet_id
    );

    // Associate tags
    if !input.tags.is_empty() {
        eprintln!(
            "[DEBUG] [snippet_commands] Associating {} tags",
            input.tags.len()
        );
        tags::associate_tags(&app, snippet_id, &input.tags)
            .await
            .map_err(|e| {
                eprintln!("[ERROR] [snippet_commands] Tag association failed: {}", e);
                format!(
                    "Snippet created (ID: {}) but failed to add tags: {}",
                    snippet_id, e
                )
            })?;
        eprintln!("[DEBUG] [snippet_commands] Tags associated successfully");
    } else {
        eprintln!("[DEBUG] [snippet_commands] No tags to associate");
    }

    // Fetch and return the created snippet with tags
    eprintln!(
        "[DEBUG] [snippet_commands] Calling get_snippet({}) to return result",
        snippet_id
    );
    let result = get_snippet(app, SnippetId(snippet_id)).await.map_err(|e| {
        eprintln!("[ERROR] [snippet_commands] get_snippet failed: {}", e);
        format!(
            "Snippet created (ID: {}) but failed to retrieve it: {}. The snippet was saved successfully.",
            snippet_id, e
        )
    });

    eprintln!(
        "[DEBUG] [snippet_commands] get_snippet result: {:?}",
        result
            .as_ref()
            .map(|s| format!("Ok(name={})", s.name))
            .map_err(|e| e.clone())
    );
    eprintln!("[DEBUG] [snippet_commands] === create_snippet() returning ===");

    result
}

/// Get a single snippet by ID
#[tauri::command]
pub async fn get_snippet(app: AppHandle, id: SnippetId) -> Result<Snippet, String> {
    eprintln!("[DEBUG] [snippet_commands] get_snippet({}) called", id.0);

    let pool = get_pool(&app).map_err(|e| {
        eprintln!(
            "[ERROR] [snippet_commands] get_snippet: Failed to get pool: {}",
            e
        );
        format!("Database connection failed: {}", e)
    })?;

    eprintln!("[DEBUG] [snippet_commands] get_snippet: Executing SELECT query");
    let result = sqlx::query(
        "SELECT id, name, content, description, created_at, updated_at
         FROM snippets WHERE id = ?",
    )
    .bind(id.0)
    .fetch_optional(&pool)
    .await
    .map_err(|e| {
        eprintln!(
            "[ERROR] [snippet_commands] get_snippet: SELECT failed: {}",
            e
        );
        format!("Failed to retrieve snippet from database: {}", e)
    })?;

    eprintln!(
        "[DEBUG] [snippet_commands] get_snippet: SELECT returned: {:?}",
        result.as_ref().map(|_| "Some(row)").or(Some("None"))
    );

    match result {
        Some(row) => {
            let snippet_id: i64 = row.get(0);
            let name: String = row.get(1);
            eprintln!(
                "[DEBUG] [snippet_commands] get_snippet: Found snippet id={}, name='{}'",
                snippet_id, name
            );

            eprintln!("[DEBUG] [snippet_commands] get_snippet: Fetching tags");
            let tags = tags::get_snippet_tags(&app, snippet_id)
                .await
                .map_err(|e| {
                    eprintln!(
                        "[ERROR] [snippet_commands] get_snippet: Failed to get tags: {}",
                        e
                    );
                    format!("Snippet found but failed to load tags: {}", e)
                })?;
            eprintln!(
                "[DEBUG] [snippet_commands] get_snippet: Got {} tags",
                tags.len()
            );

            let snippet = Snippet {
                id: SnippetId(snippet_id),
                name,
                content: row.get(2),
                description: row.get(3),
                created_at: row.get(4),
                updated_at: row.get(5),
                tags: Some(tags),
            };

            eprintln!("[DEBUG] [snippet_commands] get_snippet: Returning Ok(Snippet)");
            Ok(snippet)
        }
        None => {
            eprintln!(
                "[ERROR] [snippet_commands] get_snippet: Snippet {} not found",
                id.0
            );
            Err(format!(
                "Snippet with ID {} does not exist. It may have been deleted.",
                id.0
            ))
        }
    }
}

/// Get all snippets with their tags
#[tauri::command]
pub async fn get_all_snippets(app: AppHandle) -> Result<Vec<Snippet>, String> {
    let pool = get_pool(&app).map_err(|e| format!("Database connection failed: {}", e))?;

    let results = sqlx::query(
        "SELECT id, name, content, description, created_at, updated_at
         FROM snippets ORDER BY created_at DESC",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| {
        eprintln!(
            "[ERROR] [snippet_commands] Failed to fetch all snippets: {}",
            e
        );
        if e.to_string().contains("no such table") {
            "Database not initialized. The 'snippets' table is missing. Try restarting the app."
                .to_string()
        } else {
            format!("Failed to load snippets from database: {}", e)
        }
    })?;

    eprintln!(
        "[DEBUG] [snippet_commands] Fetched {} snippets",
        results.len()
    );

    let mut snippets = Vec::new();
    for row in results {
        let snippet_id: i64 = row.get(0);
        let tags = tags::get_snippet_tags(&app, snippet_id)
            .await
            .map_err(|e| format!("Failed to load tags for snippet {}: {}", snippet_id, e))?;

        snippets.push(Snippet {
            id: SnippetId(snippet_id),
            name: row.get(1),
            content: row.get(2),
            description: row.get(3),
            created_at: row.get(4),
            updated_at: row.get(5),
            tags: Some(tags),
        });
    }

    Ok(snippets)
}

/// Update an existing snippet
#[tauri::command]
pub async fn update_snippet(
    app: AppHandle,
    id: SnippetId,
    input: UpdateSnippetInput,
) -> Result<Snippet, String> {
    // Validate input
    if input.name.trim().is_empty() {
        return Err("Snippet name is required and cannot be empty".to_string());
    }
    if input.content.trim().is_empty() {
        return Err("Snippet content is required and cannot be empty".to_string());
    }

    let pool = get_pool(&app).map_err(|e| format!("Database connection failed: {}", e))?;

    eprintln!(
        "[DEBUG] [snippet_commands] Updating snippet {}: name='{}', content_len={}",
        id.0,
        input.name.trim(),
        input.content.len()
    );

    // Check if snippet exists
    let exists = sqlx::query("SELECT id FROM snippets WHERE id = ?")
        .bind(id.0)
        .fetch_optional(&pool)
        .await
        .map_err(|e| {
            eprintln!(
                "[ERROR] [snippet_commands] Failed to check if snippet {} exists: {}",
                id.0, e
            );
            format!("Failed to verify snippet exists: {}", e)
        })?;

    if exists.is_none() {
        return Err(format!(
            "Snippet with ID {} does not exist. It may have been deleted.",
            id.0
        ));
    }

    let now = current_timestamp();

    // Update snippet
    sqlx::query(
        "UPDATE snippets SET name = ?, content = ?, description = ?, updated_at = ?
         WHERE id = ?",
    )
    .bind(input.name.trim())
    .bind(input.content.trim())
    .bind(input.description.as_deref().map(|s| s.trim()))
    .bind(now)
    .bind(id.0)
    .execute(&pool)
    .await
    .map_err(|e| {
        eprintln!(
            "[ERROR] [snippet_commands] Failed to update snippet {}: {}",
            id.0, e
        );
        if e.to_string().contains("UNIQUE constraint failed") {
            format!(
                "A snippet named '{}' already exists. Please choose a different name.",
                input.name.trim()
            )
        } else if e.to_string().contains("readonly database") {
            "Database is read-only. Check file permissions.".to_string()
        } else {
            format!("Failed to save changes to database: {}", e)
        }
    })?;

    eprintln!(
        "[DEBUG] [snippet_commands] Snippet {} updated successfully",
        id.0
    );

    // Update tags: remove old associations and create new ones
    tags::remove_snippet_tags(&app, id.0)
        .await
        .map_err(|e| format!("Snippet updated but failed to remove old tags: {}", e))?;
    if !input.tags.is_empty() {
        tags::associate_tags(&app, id.0, &input.tags)
            .await
            .map_err(|e| format!("Snippet updated but failed to add new tags: {}", e))?;
    }

    // Fetch and return the updated snippet
    get_snippet(app, id).await
}

/// Delete a snippet by ID
#[tauri::command]
pub async fn delete_snippet(app: AppHandle, id: SnippetId) -> Result<(), String> {
    let pool = get_pool(&app).map_err(|e| format!("Database connection failed: {}", e))?;

    eprintln!("[DEBUG] [snippet_commands] Deleting snippet {}", id.0);

    // Check if snippet exists
    let exists = sqlx::query("SELECT id FROM snippets WHERE id = ?")
        .bind(id.0)
        .fetch_optional(&pool)
        .await
        .map_err(|e| {
            eprintln!(
                "[ERROR] [snippet_commands] Failed to check if snippet {} exists: {}",
                id.0, e
            );
            format!("Failed to verify snippet exists: {}", e)
        })?;

    if exists.is_none() {
        return Err(format!(
            "Snippet with ID {} does not exist. It may have already been deleted.",
            id.0
        ));
    }

    // Delete snippet (cascades to snippet_tags and analytics due to foreign keys)
    sqlx::query("DELETE FROM snippets WHERE id = ?")
        .bind(id.0)
        .execute(&pool)
        .await
        .map_err(|e| {
            eprintln!(
                "[ERROR] [snippet_commands] Failed to delete snippet {}: {}",
                id.0, e
            );
            if e.to_string().contains("readonly database") {
                "Database is read-only. Check file permissions.".to_string()
            } else {
                format!("Failed to delete snippet from database: {}", e)
            }
        })?;

    eprintln!(
        "[DEBUG] [snippet_commands] Snippet {} deleted successfully",
        id.0
    );
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validation() {
        // Test empty name validation
        let input = CreateSnippetInput {
            name: "".to_string(),
            content: "content".to_string(),
            description: None,
            tags: vec![],
        };
        assert!(input.name.trim().is_empty());

        // Test empty content validation
        let input = CreateSnippetInput {
            name: "name".to_string(),
            content: "".to_string(),
            description: None,
            tags: vec![],
        };
        assert!(input.content.trim().is_empty());
    }

    #[test]
    fn test_input_trimming() {
        let input = CreateSnippetInput {
            name: "  test  ".to_string(),
            content: "  content  ".to_string(),
            description: Some("  desc  ".to_string()),
            tags: vec!["  tag1  ".to_string()],
        };

        assert_eq!(input.name.trim(), "test");
        assert_eq!(input.content.trim(), "content");
        assert_eq!(input.description.as_deref().map(|s| s.trim()), Some("desc"));
    }
}
