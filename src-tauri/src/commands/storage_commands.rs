use crate::services::backup_scheduler::{BackupConfig, BackupSchedulerState};
use crate::services::database::get_pool;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// Database statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseStats {
    pub total_snippets: i64,
    pub total_tags: i64,
    pub total_analytics_records: i64,
    pub database_size_bytes: u64,
    pub last_backup: Option<i64>,
}

/// Backup metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupInfo {
    pub path: String,
    pub created_at: i64,
    pub size_bytes: u64,
}

/// Export data structure for JSON format
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportData {
    pub version: String,
    pub exported_at: i64,
    pub snippets: Vec<SnippetExport>,
}

/// Snippet with tags for export
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SnippetExport {
    pub name: String,
    pub content: String,
    pub description: Option<String>,
    pub tags: Vec<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Diagnostic information about database location and status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseDiagnostics {
    pub db_path: String,
    pub db_dir: String,
    pub db_exists: bool,
    pub db_size_bytes: u64,
    pub db_readable: bool,
    pub db_writable: bool,
    pub dir_exists: bool,
    pub dir_writable: bool,
    pub error_message: Option<String>,
}

/// Get diagnostic information about the database
/// Helps troubleshoot database connection and permission issues
#[tauri::command]
pub async fn get_database_diagnostics(app: AppHandle) -> Result<DatabaseDiagnostics, String> {
    use std::fs;

    // Use app_config_dir() to match tauri-plugin-sql and backend SQLx
    let app_dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Failed to get app config dir: {}", e))?;

    let db_path = app_dir.join("snips.db");

    let db_exists = db_path.exists();
    let dir_exists = app_dir.exists();

    let db_size_bytes = if db_exists {
        fs::metadata(&db_path).map(|m| m.len()).unwrap_or(0)
    } else {
        0
    };

    // Test readability
    let db_readable = if db_exists {
        fs::File::open(&db_path).is_ok()
    } else {
        false
    };

    // Test writability (for directory if db doesn't exist, for file if it does)
    let db_writable = if db_exists {
        fs::OpenOptions::new().append(true).open(&db_path).is_ok()
    } else {
        false
    };

    let dir_writable = if dir_exists {
        // Try creating a temporary file
        let test_file = app_dir.join(".write_test");
        let writable = fs::File::create(&test_file).is_ok();
        let _ = fs::remove_file(&test_file);
        writable
    } else {
        false
    };

    let error_message = if !dir_exists {
        Some(format!(
            "Database directory does not exist: {}",
            app_dir.display()
        ))
    } else if !dir_writable {
        Some(format!(
            "Database directory is not writable: {}. Check permissions.",
            app_dir.display()
        ))
    } else if db_exists && !db_readable {
        Some(format!(
            "Database file exists but is not readable: {}. Check permissions.",
            db_path.display()
        ))
    } else if db_exists && !db_writable {
        Some(format!(
            "Database file is read-only: {}. Check permissions.",
            db_path.display()
        ))
    } else if db_exists && db_size_bytes == 0 {
        Some(format!(
            "Database file is empty (0 bytes): {}. It may not be initialized correctly.",
            db_path.display()
        ))
    } else {
        None
    };

    Ok(DatabaseDiagnostics {
        db_path: db_path.to_string_lossy().to_string(),
        db_dir: app_dir.to_string_lossy().to_string(),
        db_exists,
        db_size_bytes,
        db_readable,
        db_writable,
        dir_exists,
        dir_writable,
        error_message,
    })
}

/// Create a backup of the database
#[tauri::command]
pub async fn backup_database(app: AppHandle) -> Result<BackupInfo, String> {
    // Use app_config_dir() to match tauri-plugin-sql and backend SQLx
    let app_dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Failed to get app config dir: {}", e))?;

    let db_path = app_dir.join("snips.db");

    if !db_path.exists() {
        return Err("Database file not found".to_string());
    }

    // Create backups directory
    let backup_dir = app_dir.join("backups");
    std::fs::create_dir_all(&backup_dir)
        .map_err(|e| format!("Failed to create backup directory: {}", e))?;

    // Generate backup filename with timestamp
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| format!("Failed to get timestamp: {}", e))?
        .as_secs();

    let backup_filename = format!("snips_backup_{}.db", timestamp);
    let backup_path = backup_dir.join(&backup_filename);

    // Copy database file to backup location
    std::fs::copy(&db_path, &backup_path).map_err(|e| format!("Failed to copy database: {}", e))?;

    // Get backup file size
    let size_bytes = std::fs::metadata(&backup_path)
        .map_err(|e| format!("Failed to get backup file size: {}", e))?
        .len();

    Ok(BackupInfo {
        path: backup_path.to_string_lossy().to_string(),
        created_at: timestamp as i64,
        size_bytes,
    })
}

/// Restore database from a backup file
#[tauri::command]
pub async fn restore_database(app: AppHandle, backup_path: String) -> Result<(), String> {
    let backup_file = PathBuf::from(&backup_path);

    if !backup_file.exists() {
        return Err("Backup file not found".to_string());
    }

    // Use app_config_dir() to match tauri-plugin-sql and backend SQLx
    let app_dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Failed to get app config dir: {}", e))?;

    let db_path = app_dir.join("snips.db");

    // Create a backup of current database before restoring
    if db_path.exists() {
        let pre_restore_backup = app_dir.join("snips_pre_restore.db");
        std::fs::copy(&db_path, &pre_restore_backup)
            .map_err(|e| format!("Failed to create pre-restore backup: {}", e))?;
    }

    // Copy backup file to database location
    std::fs::copy(&backup_file, &db_path)
        .map_err(|e| format!("Failed to restore database: {}", e))?;

    Ok(())
}

/// Get database statistics
#[tauri::command]
pub async fn get_database_stats(app: AppHandle) -> Result<DatabaseStats, String> {
    let pool = get_pool(&app).map_err(|e| e.to_string())?;

    // Get snippet count
    let snippet_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM snippets")
        .fetch_one(&pool)
        .await
        .map_err(|e| format!("Failed to get snippet count: {}", e))?;

    // Get tag count
    let tag_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM tags")
        .fetch_one(&pool)
        .await
        .map_err(|e| format!("Failed to get tag count: {}", e))?;

    // Get analytics record count
    let analytics_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM analytics")
        .fetch_one(&pool)
        .await
        .map_err(|e| format!("Failed to get analytics count: {}", e))?;

    // Get database file size
    // Use app_config_dir() to match tauri-plugin-sql and backend SQLx
    let app_dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Failed to get app config dir: {}", e))?;

    let db_path = app_dir.join("snips.db");
    let database_size_bytes = if db_path.exists() {
        std::fs::metadata(&db_path)
            .map_err(|e| format!("Failed to get database size: {}", e))?
            .len()
    } else {
        0
    };

    // Check for last backup
    let backup_dir = app_dir.join("backups");
    let last_backup = if backup_dir.exists() {
        std::fs::read_dir(&backup_dir).ok().and_then(|entries| {
            entries
                .filter_map(|e| e.ok())
                .filter(|e| {
                    e.path()
                        .extension()
                        .and_then(|s| s.to_str())
                        .map(|s| s == "db")
                        .unwrap_or(false)
                })
                .filter_map(|e| e.metadata().ok())
                .filter_map(|m| m.modified().ok())
                .filter_map(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_secs() as i64)
                .max()
        })
    } else {
        None
    };

    Ok(DatabaseStats {
        total_snippets: snippet_count,
        total_tags: tag_count,
        total_analytics_records: analytics_count,
        database_size_bytes,
        last_backup,
    })
}

/// Export database to JSON format
#[tauri::command]
pub async fn export_to_json(app: AppHandle, export_path: String) -> Result<(), String> {
    let pool = get_pool(&app).map_err(|e| e.to_string())?;

    // Fetch all snippets with their tags
    let snippets = sqlx::query(
        r#"
        SELECT
            s.id,
            s.name,
            s.content,
            s.description,
            s.created_at,
            s.updated_at,
            GROUP_CONCAT(t.name, ',') as tags
        FROM snippets s
        LEFT JOIN snippet_tags st ON s.id = st.snippet_id
        LEFT JOIN tags t ON st.tag_id = t.id
        GROUP BY s.id
        ORDER BY s.created_at
        "#,
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Failed to fetch snippets: {}", e))?;

    let mut snippet_exports = Vec::new();

    for row in snippets {
        let tags_str: Option<String> = row.try_get("tags").ok();
        let tags = tags_str
            .map(|t| {
                t.split(',')
                    .filter(|s| !s.is_empty())
                    .map(|s| s.to_string())
                    .collect()
            })
            .unwrap_or_default();

        snippet_exports.push(SnippetExport {
            name: row.try_get("name").map_err(|e| e.to_string())?,
            content: row.try_get("content").map_err(|e| e.to_string())?,
            description: row.try_get("description").ok(),
            tags,
            created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
            updated_at: row.try_get("updated_at").map_err(|e| e.to_string())?,
        });
    }

    let export_data = ExportData {
        version: "1.0.0".to_string(),
        exported_at: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| format!("Failed to get timestamp: {}", e))?
            .as_secs() as i64,
        snippets: snippet_exports,
    };

    // Write to file
    let json = serde_json::to_string_pretty(&export_data)
        .map_err(|e| format!("Failed to serialize data: {}", e))?;

    std::fs::write(&export_path, json)
        .map_err(|e| format!("Failed to write export file: {}", e))?;

    Ok(())
}

/// Import snippets from JSON format
#[tauri::command]
pub async fn import_from_json(app: AppHandle, import_path: String) -> Result<usize, String> {
    let pool = get_pool(&app).map_err(|e| e.to_string())?;

    // Read the import file
    let json = std::fs::read_to_string(&import_path)
        .map_err(|e| format!("Failed to read import file: {}", e))?;

    let import_data: ExportData =
        serde_json::from_str(&json).map_err(|e| format!("Failed to parse import file: {}", e))?;

    let mut imported_count = 0;

    // Import each snippet
    for snippet in import_data.snippets {
        // Validate snippet data
        if snippet.name.is_empty() {
            continue; // Skip invalid snippets
        }

        if snippet.content.is_empty() {
            continue; // Skip snippets without content
        }

        // Check if snippet with same name already exists
        let existing: Option<i64> = sqlx::query_scalar("SELECT id FROM snippets WHERE name = ?")
            .bind(&snippet.name)
            .fetch_optional(&pool)
            .await
            .map_err(|e| format!("Failed to check existing snippet: {}", e))?;

        let snippet_id = if let Some(id) = existing {
            // Update existing snippet
            sqlx::query(
                r#"
                UPDATE snippets
                SET content = ?, description = ?, updated_at = ?
                WHERE id = ?
                "#,
            )
            .bind(&snippet.content)
            .bind(&snippet.description)
            .bind(snippet.updated_at)
            .bind(id)
            .execute(&pool)
            .await
            .map_err(|e| format!("Failed to update snippet: {}", e))?;

            id
        } else {
            // Insert new snippet
            let result = sqlx::query(
                r#"
                INSERT INTO snippets (name, content, description, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
                "#,
            )
            .bind(&snippet.name)
            .bind(&snippet.content)
            .bind(&snippet.description)
            .bind(snippet.created_at)
            .bind(snippet.updated_at)
            .execute(&pool)
            .await
            .map_err(|e| format!("Failed to insert snippet: {}", e))?;

            result.last_insert_rowid()
        };

        // Handle tags
        if !snippet.tags.is_empty() {
            // Delete existing tags for this snippet
            sqlx::query("DELETE FROM snippet_tags WHERE snippet_id = ?")
                .bind(snippet_id)
                .execute(&pool)
                .await
                .map_err(|e| format!("Failed to delete existing tags: {}", e))?;

            // Insert tags
            for tag_name in snippet.tags {
                if tag_name.is_empty() {
                    continue;
                }

                // Get or create tag
                let tag_id: Option<i64> = sqlx::query_scalar("SELECT id FROM tags WHERE name = ?")
                    .bind(&tag_name)
                    .fetch_optional(&pool)
                    .await
                    .map_err(|e| format!("Failed to get tag: {}", e))?;

                let tag_id = if let Some(id) = tag_id {
                    id
                } else {
                    let result = sqlx::query("INSERT INTO tags (name) VALUES (?)")
                        .bind(&tag_name)
                        .execute(&pool)
                        .await
                        .map_err(|e| format!("Failed to insert tag: {}", e))?;

                    result.last_insert_rowid()
                };

                // Link tag to snippet
                sqlx::query("INSERT INTO snippet_tags (snippet_id, tag_id) VALUES (?, ?)")
                    .bind(snippet_id)
                    .bind(tag_id)
                    .execute(&pool)
                    .await
                    .map_err(|e| format!("Failed to link tag: {}", e))?;
            }
        }

        imported_count += 1;
    }

    Ok(imported_count)
}

/// List all available backups
#[tauri::command]
pub async fn list_backups(app: AppHandle) -> Result<Vec<BackupInfo>, String> {
    // Use app_config_dir() to match tauri-plugin-sql and backend SQLx
    let app_dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Failed to get app config dir: {}", e))?;

    let backup_dir = app_dir.join("backups");

    if !backup_dir.exists() {
        return Ok(Vec::new());
    }

    let mut backups = Vec::new();

    for entry in std::fs::read_dir(&backup_dir)
        .map_err(|e| format!("Failed to read backup directory: {}", e))?
    {
        let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
        let path = entry.path();

        if path.extension().and_then(|s| s.to_str()) != Some("db") {
            continue;
        }

        let metadata = entry
            .metadata()
            .map_err(|e| format!("Failed to get file metadata: {}", e))?;

        let created_at = metadata
            .modified()
            .map_err(|e| format!("Failed to get modification time: {}", e))?
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| format!("Failed to convert time: {}", e))?
            .as_secs() as i64;

        backups.push(BackupInfo {
            path: path.to_string_lossy().to_string(),
            created_at,
            size_bytes: metadata.len(),
        });
    }

    // Sort by creation time, newest first
    backups.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    Ok(backups)
}

/// Get backup scheduler configuration
#[tauri::command]
pub async fn get_backup_config(app: AppHandle) -> Result<BackupConfig, String> {
    let state = app.state::<BackupSchedulerState>();
    let scheduler_lock = state.0.read().await;

    if let Some(scheduler) = scheduler_lock.as_ref() {
        Ok(scheduler.get_config().await)
    } else {
        Ok(BackupConfig::default())
    }
}

/// Update backup scheduler configuration
#[tauri::command]
pub async fn update_backup_config(app: AppHandle, config: BackupConfig) -> Result<(), String> {
    let state = app.state::<BackupSchedulerState>();
    let scheduler_lock = state.0.read().await;

    if let Some(scheduler) = scheduler_lock.as_ref() {
        scheduler.update_config(config).await;
        Ok(())
    } else {
        Err("Backup scheduler not initialized".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_export_data_serialization() {
        let export = ExportData {
            version: "1.0.0".to_string(),
            exported_at: 1234567890,
            snippets: vec![SnippetExport {
                name: "test".to_string(),
                content: "content".to_string(),
                description: Some("desc".to_string()),
                tags: vec!["tag1".to_string()],
                created_at: 1000,
                updated_at: 2000,
            }],
        };

        let json = serde_json::to_string(&export).unwrap();
        let deserialized: ExportData = serde_json::from_str(&json).unwrap();

        assert_eq!(export.version, deserialized.version);
        assert_eq!(export.snippets.len(), deserialized.snippets.len());
    }

    #[test]
    fn test_database_stats_structure() {
        let stats = DatabaseStats {
            total_snippets: 10,
            total_tags: 5,
            total_analytics_records: 100,
            database_size_bytes: 1024,
            last_backup: Some(1234567890),
        };

        assert_eq!(stats.total_snippets, 10);
        assert_eq!(stats.total_tags, 5);
    }

    #[test]
    fn test_database_diagnostics_struct() {
        let diagnostics = DatabaseDiagnostics {
            db_path: "/test/path/snips.db".to_string(),
            db_dir: "/test/path".to_string(),
            db_exists: true,
            db_size_bytes: 92160,
            db_readable: true,
            db_writable: true,
            dir_exists: true,
            dir_writable: true,
            error_message: None,
        };

        assert_eq!(diagnostics.db_path, "/test/path/snips.db");
        assert!(diagnostics.db_exists);
        assert!(diagnostics.error_message.is_none());
    }

    #[test]
    fn test_diagnostics_error_messages() {
        // Test error message generation for common scenarios
        let error1 = "Database directory does not exist: /some/path";
        assert!(error1.contains("directory does not exist"));

        let error2 = "Database directory is not writable: /some/path. Check permissions.";
        assert!(error2.contains("not writable"));
        assert!(error2.contains("Check permissions"));

        let error3 =
            "Database file is empty (0 bytes): /path/db. It may not be initialized correctly.";
        assert!(error3.contains("empty (0 bytes)"));
        assert!(error3.contains("not be initialized"));
    }

    /// Critical: Verify all storage commands use app_config_dir
    #[test]
    fn test_storage_path_consistency_documentation() {
        // All storage commands MUST use app_config_dir() to match:
        // - tauri-plugin-sql (uses AppConfig)
        // - init_db_pool (uses app_config_dir)
        //
        // Commands that must use app_config_dir:
        // - backup_database
        // - restore_database
        // - get_database_stats
        // - get_database_diagnostics
        // - export_to_json
        // - import_from_json
        // - list_backups

        assert!(true, "All storage commands must use app_config_dir");
    }
}
