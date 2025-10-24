use crate::models::{CreateSnippetInput, Snippet, SnippetId, UpdateSnippetInput};
use crate::services::database::get_pool;
use crate::services::tags;
use crate::utils::error::AppError;
use crate::utils::time::current_timestamp;
use sqlx::Row;
use tauri::AppHandle;

/// Create a new snippet with optional tags
#[tauri::command]
pub async fn create_snippet(app: AppHandle, input: CreateSnippetInput) -> Result<Snippet, String> {
    // Validate input
    if input.name.trim().is_empty() {
        return Err(AppError::InvalidInput("Snippet name cannot be empty".to_string()).into());
    }
    if input.content.trim().is_empty() {
        return Err(AppError::InvalidInput("Snippet content cannot be empty".to_string()).into());
    }

    let pool = get_pool(&app)?;
    let now = current_timestamp();

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
        if e.to_string().contains("UNIQUE constraint failed") {
            AppError::Duplicate(format!("Snippet with name '{}' already exists", input.name))
        } else {
            AppError::Database(format!("Failed to create snippet: {}", e))
        }
    })?;

    let snippet_id = result.last_insert_rowid();

    // Associate tags
    if !input.tags.is_empty() {
        tags::associate_tags(&app, snippet_id, &input.tags).await?;
    }

    // Fetch and return the created snippet with tags
    get_snippet(app, SnippetId(snippet_id)).await
}

/// Get a single snippet by ID
#[tauri::command]
pub async fn get_snippet(app: AppHandle, id: SnippetId) -> Result<Snippet, String> {
    let pool = get_pool(&app)?;

    let result = sqlx::query(
        "SELECT id, name, content, description, created_at, updated_at
         FROM snippets WHERE id = ?",
    )
    .bind(id.0)
    .fetch_optional(&pool)
    .await
    .map_err(|e| AppError::from(e).to_string())?;

    match result {
        Some(row) => {
            let snippet_id: i64 = row.get(0);
            let tags = tags::get_snippet_tags(&app, snippet_id).await?;

            Ok(Snippet {
                id: SnippetId(snippet_id),
                name: row.get(1),
                content: row.get(2),
                description: row.get(3),
                created_at: row.get(4),
                updated_at: row.get(5),
                tags: Some(tags),
            })
        }
        None => Err(AppError::NotFound(format!("Snippet with id {} not found", id.0)).into()),
    }
}

/// Get all snippets with their tags
#[tauri::command]
pub async fn get_all_snippets(app: AppHandle) -> Result<Vec<Snippet>, String> {
    let pool = get_pool(&app)?;

    let results = sqlx::query(
        "SELECT id, name, content, description, created_at, updated_at
         FROM snippets ORDER BY created_at DESC",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| AppError::from(e).to_string())?;

    let mut snippets = Vec::new();
    for row in results {
        let snippet_id: i64 = row.get(0);
        let tags = tags::get_snippet_tags(&app, snippet_id).await?;

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
        return Err(AppError::InvalidInput("Snippet name cannot be empty".to_string()).into());
    }
    if input.content.trim().is_empty() {
        return Err(AppError::InvalidInput("Snippet content cannot be empty".to_string()).into());
    }

    let pool = get_pool(&app)?;

    // Check if snippet exists
    let exists = sqlx::query("SELECT id FROM snippets WHERE id = ?")
        .bind(id.0)
        .fetch_optional(&pool)
        .await
        .map_err(|e| AppError::from(e).to_string())?;

    if exists.is_none() {
        return Err(AppError::NotFound(format!("Snippet with id {} not found", id.0)).into());
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
        if e.to_string().contains("UNIQUE constraint failed") {
            AppError::Duplicate(format!("Snippet with name '{}' already exists", input.name))
        } else {
            AppError::Database(format!("Failed to update snippet: {}", e))
        }
    })?;

    // Update tags: remove old associations and create new ones
    tags::remove_snippet_tags(&app, id.0).await?;
    if !input.tags.is_empty() {
        tags::associate_tags(&app, id.0, &input.tags).await?;
    }

    // Fetch and return the updated snippet
    get_snippet(app, id).await
}

/// Delete a snippet by ID
#[tauri::command]
pub async fn delete_snippet(app: AppHandle, id: SnippetId) -> Result<(), String> {
    let pool = get_pool(&app)?;

    // Check if snippet exists
    let exists = sqlx::query("SELECT id FROM snippets WHERE id = ?")
        .bind(id.0)
        .fetch_optional(&pool)
        .await
        .map_err(|e| AppError::from(e).to_string())?;

    if exists.is_none() {
        return Err(AppError::NotFound(format!("Snippet with id {} not found", id.0)).into());
    }

    // Delete snippet (cascades to snippet_tags and analytics due to foreign keys)
    sqlx::query("DELETE FROM snippets WHERE id = ?")
        .bind(id.0)
        .execute(&pool)
        .await
        .map_err(|e| AppError::from(e).to_string())?;

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
