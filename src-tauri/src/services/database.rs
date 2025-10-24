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
    ]
}

/// Initialize the database plugin with migrations
pub fn init_database() -> tauri_plugin_sql::Builder {
    tauri_plugin_sql::Builder::default().add_migrations("sqlite:snips.db", get_migrations())
}

/// Initialize SQLx connection pool for backend queries
pub async fn init_db_pool(app: &AppHandle) -> Result<SqlitePool, AppError> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Database(format!("Failed to get app data dir: {}", e)))?;

    // Ensure the directory exists
    std::fs::create_dir_all(&app_dir)
        .map_err(|e| AppError::Database(format!("Failed to create app data dir: {}", e)))?;

    let db_path = app_dir.join("snips.db");
    let db_url = format!("sqlite://{}", db_path.display());

    let options = SqliteConnectOptions::from_str(&db_url)
        .map_err(|e| AppError::Database(format!("Invalid database URL: {}", e)))?
        .create_if_missing(true);

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await
        .map_err(|e| AppError::Database(format!("Failed to connect to database: {}", e)))?;

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
        assert_eq!(migrations.len(), 4);
    }

    #[test]
    fn test_migration_versions() {
        let migrations = get_migrations();
        assert_eq!(migrations[0].version, 1);
        assert_eq!(migrations[1].version, 2);
        assert_eq!(migrations[2].version, 3);
        assert_eq!(migrations[3].version, 4);
    }
}
