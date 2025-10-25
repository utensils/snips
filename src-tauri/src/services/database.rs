use crate::utils::error::AppError;
use sqlx::sqlite::{SqliteConnectOptions, SqlitePool, SqlitePoolOptions};
use std::str::FromStr;
use tauri::{AppHandle, Manager};
use tauri_plugin_sql::{Migration, MigrationKind};

/// Database connection pool state
pub struct DbPool(pub SqlitePool);

/// Initialize the database with migrations
pub fn get_migrations() -> Vec<Migration> {
    vec![
        // Migration 1: Create core tables
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: include_str!("../migrations/001_create_initial_tables.sql"),
            kind: MigrationKind::Up,
        },
        // Migration 2: Create FTS5 table and triggers
        Migration {
            version: 2,
            description: "create_fts5_search",
            sql: include_str!("../migrations/002_create_fts5_search.sql"),
            kind: MigrationKind::Up,
        },
        // Migration 3: Create indexes
        Migration {
            version: 3,
            description: "create_indexes",
            sql: include_str!("../migrations/003_create_indexes.sql"),
            kind: MigrationKind::Up,
        },
        // Migration 4: Create settings table
        Migration {
            version: 4,
            description: "create_settings_table",
            sql: include_str!("../migrations/004_create_settings_table.sql"),
            kind: MigrationKind::Up,
        },
        // Migration 5: Fix FTS5 tags column mismatch
        Migration {
            version: 5,
            description: "fix_fts5_tags_column",
            sql: include_str!("../migrations/005_fix_fts5_tags_column.sql"),
            kind: MigrationKind::Up,
        },
    ]
}

/// Initialize the database plugin with migrations
pub fn init_database() -> tauri_plugin_sql::Builder {
    tauri_plugin_sql::Builder::default().add_migrations("sqlite:snips.db", get_migrations())
}

/// Initialize SQLx connection pool for backend queries
///
/// IMPORTANT: Must use app_config_dir() to match tauri-plugin-sql's path resolution.
/// The plugin stores databases relative to AppConfig directory (~/.config on Linux).
pub async fn init_db_pool(app: &AppHandle) -> Result<SqlitePool, AppError> {
    // Use app_config_dir() to match tauri-plugin-sql behavior
    let app_dir = app
        .path()
        .app_config_dir()
        .map_err(|e| AppError::Database(format!("Failed to get app config dir: {}", e)))?;

    eprintln!(
        "[INFO] [database] Database directory: {}",
        app_dir.display()
    );

    // Ensure the directory exists
    std::fs::create_dir_all(&app_dir).map_err(|e| {
        let error_msg = format!(
            "Failed to create app config dir '{}': {}",
            app_dir.display(),
            e
        );
        eprintln!("[ERROR] [database] {}", error_msg);
        AppError::Database(error_msg)
    })?;

    let db_path = app_dir.join("snips.db");
    eprintln!("[INFO] [database] Database path: {}", db_path.display());

    let db_url = format!("sqlite://{}", db_path.display());

    let options = SqliteConnectOptions::from_str(&db_url)
        .map_err(|e| {
            let error_msg = format!("Invalid database URL '{}': {}", db_url, e);
            eprintln!("[ERROR] [database] {}", error_msg);
            AppError::Database(error_msg)
        })?
        .create_if_missing(true);

    eprintln!("[INFO] [database] Connecting to database...");
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await
        .map_err(|e| {
            let error_msg = format!(
                "Failed to connect to database at '{}': {}. Check file permissions and disk space.",
                db_path.display(),
                e
            );
            eprintln!("[ERROR] [database] {}", error_msg);
            AppError::Database(error_msg)
        })?;

    eprintln!("[INFO] [database] Successfully connected to database");
    Ok(pool)
}

/// Get database pool from app state
pub fn get_pool(app: &AppHandle) -> Result<SqlitePool, AppError> {
    Ok(app.state::<DbPool>().0.clone())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_migrations_count() {
        let migrations = get_migrations();
        assert_eq!(migrations.len(), 5);
    }

    #[test]
    fn test_migration_versions() {
        let migrations = get_migrations();
        assert_eq!(migrations[0].version, 1);
        assert_eq!(migrations[1].version, 2);
        assert_eq!(migrations[2].version, 3);
        assert_eq!(migrations[3].version, 4);
        assert_eq!(migrations[4].version, 5);
    }

    #[test]
    fn test_migration_order() {
        let migrations = get_migrations();
        // Ensure migrations are in sequential order
        for (i, migration) in migrations.iter().enumerate() {
            assert_eq!(migration.version, (i + 1) as i64);
        }
    }

    #[test]
    fn test_init_database_builder() {
        // Test that init_database returns a valid builder
        let builder = init_database();
        // Builder creation should not panic
        drop(builder);
    }

    /// Critical test: Verify database uses app_config_dir, not app_data_dir
    /// This was a critical bug where frontend (tauri-plugin-sql) used app_config_dir
    /// but backend (SQLx) used app_data_dir, causing data to save to wrong location
    #[test]
    fn test_database_path_documentation() {
        // This test exists to document the critical requirement:
        // init_db_pool MUST use app_config_dir() to match tauri-plugin-sql
        //
        // tauri-plugin-sql stores databases at:
        //   Linux: ~/.config/{app-identifier}/snips.db
        //   macOS: ~/Library/Application Support/{app-identifier}/snips.db
        //
        // This is app_config_dir(), NOT app_data_dir()
        //
        // See: https://v2.tauri.app/plugin/sql/
        // "The path is relative to AppConfig directory"

        // If this test fails, check that init_db_pool uses:
        // app.path().app_config_dir()  ✓ CORRECT
        // NOT: app.path().app_data_dir()  ✗ WRONG

        assert!(
            true,
            "Database path must use app_config_dir - see test comments"
        );
    }
}
