use crate::models::settings::AppSettings;
use crate::services::window;
use crate::utils::error::AppError;
use crate::utils::time::current_timestamp;
use sqlx::SqlitePool;
use std::sync::Arc;
use tokio::sync::RwLock;

/// Settings service for managing application settings
pub struct SettingsService {
    pool: SqlitePool,
    cache: Arc<RwLock<Option<AppSettings>>>,
}

impl SettingsService {
    /// Create a new settings service
    pub fn new(pool: SqlitePool) -> Self {
        Self {
            pool,
            cache: Arc::new(RwLock::new(None)),
        }
    }

    /// Get current settings, loading from database or returning defaults
    pub async fn get_settings(&self) -> Result<AppSettings, AppError> {
        // Check cache first
        {
            let cache = self.cache.read().await;
            if let Some(settings) = cache.as_ref() {
                return Ok(settings.clone());
            }
        }

        // Load from database
        let settings = self.load_from_database().await?;

        // Update cache
        {
            let mut cache = self.cache.write().await;
            *cache = Some(settings.clone());
        }

        Ok(settings)
    }

    /// Update settings in database and cache
    pub async fn update_settings(
        &self,
        mut settings: AppSettings,
    ) -> Result<AppSettings, AppError> {
        // Validate settings
        self.validate_settings(&settings)?;

        window::update_window_chrome_settings(&settings.window_chrome);
        settings.quick_window_preferences =
            window::update_quick_window_preferences(settings.quick_window_preferences.clone());

        // Serialize to JSON
        let settings_json = serde_json::to_string(&settings)?;

        let timestamp = current_timestamp();

        // Store in database
        sqlx::query(
            r#"
            INSERT INTO settings (key, value, updated_at)
            VALUES ('app_settings', ?, ?)
            ON CONFLICT(key) DO UPDATE SET
                value = excluded.value,
                updated_at = excluded.updated_at
            "#,
        )
        .bind(&settings_json)
        .bind(timestamp)
        .execute(&self.pool)
        .await
        .map_err(|e| AppError::Database(format!("Failed to save settings: {}", e)))?;

        // Update cache
        {
            let mut cache = self.cache.write().await;
            *cache = Some(settings.clone());
        }

        Ok(settings)
    }

    /// Update a specific setting by key
    pub async fn update_setting(&self, key: &str, value: String) -> Result<(), AppError> {
        let timestamp = current_timestamp();

        sqlx::query(
            r#"
            INSERT INTO settings (key, value, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET
                value = excluded.value,
                updated_at = excluded.updated_at
            "#,
        )
        .bind(key)
        .bind(&value)
        .bind(timestamp)
        .execute(&self.pool)
        .await
        .map_err(|e| AppError::Database(format!("Failed to update setting {}: {}", key, e)))?;

        // Clear cache to force reload
        {
            let mut cache = self.cache.write().await;
            *cache = None;
        }

        Ok(())
    }

    /// Get a specific setting by key
    pub async fn get_setting(&self, key: &str) -> Result<Option<String>, AppError> {
        let row: Option<(String,)> = sqlx::query_as("SELECT value FROM settings WHERE key = ?")
            .bind(key)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| AppError::Database(format!("Failed to get setting {}: {}", key, e)))?;

        Ok(row.map(|(value,)| value))
    }

    /// Clear the settings cache
    pub async fn clear_cache(&self) {
        let mut cache = self.cache.write().await;
        *cache = None;
    }

    /// Load settings from database or return defaults
    async fn load_from_database(&self) -> Result<AppSettings, AppError> {
        let row: Option<(String,)> =
            sqlx::query_as("SELECT value FROM settings WHERE key = 'app_settings'")
                .fetch_optional(&self.pool)
                .await
                .map_err(|e| AppError::Database(format!("Failed to load settings: {}", e)))?;

        match row {
            Some((json,)) => {
                let settings: AppSettings =
                    serde_json::from_str(&json).map_err(AppError::Serialization)?;
                window::update_window_chrome_settings(&settings.window_chrome);
                let mut settings = settings;
                settings.quick_window_preferences = window::update_quick_window_preferences(
                    settings.quick_window_preferences.clone(),
                );
                Ok(settings)
            }
            None => {
                // Return default settings and save them
                let mut defaults = AppSettings::default();
                window::update_window_chrome_settings(&defaults.window_chrome);
                defaults.quick_window_preferences = window::update_quick_window_preferences(
                    defaults.quick_window_preferences.clone(),
                );
                self.save_defaults(&defaults).await?;
                Ok(defaults)
            }
        }
    }

    /// Save default settings to database
    async fn save_defaults(&self, settings: &AppSettings) -> Result<(), AppError> {
        let settings_json = serde_json::to_string(settings)?;

        let timestamp = current_timestamp();

        sqlx::query(
            r#"
            INSERT INTO settings (key, value, updated_at)
            VALUES ('app_settings', ?, ?)
            "#,
        )
        .bind(&settings_json)
        .bind(timestamp)
        .execute(&self.pool)
        .await
        .map_err(|e| AppError::Database(format!("Failed to save default settings: {}", e)))?;

        Ok(())
    }

    /// Validate settings before saving
    fn validate_settings(&self, settings: &AppSettings) -> Result<(), AppError> {
        // Validate search settings
        if settings.search_settings.max_results == 0 {
            return Err(AppError::Validation(
                "max_results must be greater than 0".to_string(),
            ));
        }

        if settings.search_settings.max_results > 1000 {
            return Err(AppError::Validation(
                "max_results cannot exceed 1000".to_string(),
            ));
        }

        // Validate weight parameters are non-negative
        if settings.search_settings.weight_text_relevance < 0.0 {
            return Err(AppError::Validation(
                "weight_text_relevance must be non-negative".to_string(),
            ));
        }

        if settings.search_settings.weight_usage_frequency < 0.0 {
            return Err(AppError::Validation(
                "weight_usage_frequency must be non-negative".to_string(),
            ));
        }

        if settings.search_settings.weight_recency < 0.0 {
            return Err(AppError::Validation(
                "weight_recency must be non-negative".to_string(),
            ));
        }

        // Ensure at least one weight is non-zero (otherwise all results would have score 0)
        if settings.search_settings.weight_text_relevance == 0.0
            && settings.search_settings.weight_usage_frequency == 0.0
            && settings.search_settings.weight_recency == 0.0
        {
            return Err(AppError::Validation(
                "At least one search weight must be greater than 0".to_string(),
            ));
        }

        // Validate cloud sync settings if present
        if let Some(cloud_settings) = &settings.cloud_sync_settings {
            if cloud_settings.sync_interval_minutes == 0 {
                return Err(AppError::Validation(
                    "sync_interval_minutes must be greater than 0".to_string(),
                ));
            }

            if cloud_settings.sync_interval_minutes > 1440 {
                // Max 24 hours
                return Err(AppError::Validation(
                    "sync_interval_minutes cannot exceed 1440 (24 hours)".to_string(),
                ));
            }
        }

        // Validate shortcuts are not empty
        if settings.global_shortcuts.quick_add.is_empty() {
            return Err(AppError::Validation(
                "quick_add shortcut cannot be empty".to_string(),
            ));
        }

        if settings.global_shortcuts.search_select.is_empty() {
            return Err(AppError::Validation(
                "search_select shortcut cannot be empty".to_string(),
            ));
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::settings::StorageType;
    use sqlx::SqlitePool;

    async fn setup_test_db() -> SqlitePool {
        let pool = SqlitePool::connect(":memory:").await.unwrap();

        // Create settings table
        sqlx::query(
            r#"
            CREATE TABLE settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at INTEGER NOT NULL
            )
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        pool
    }

    #[tokio::test]
    async fn test_get_default_settings() {
        let pool = setup_test_db().await;
        let service = SettingsService::new(pool);

        let settings = service.get_settings().await.unwrap();
        assert_eq!(settings.storage_type, StorageType::Local);
        assert_eq!(settings.search_settings.max_results, 50);
    }

    #[tokio::test]
    async fn test_update_settings() {
        let pool = setup_test_db().await;
        let service = SettingsService::new(pool);

        let mut settings = AppSettings::default();
        settings.search_settings.max_results = 100;

        service.update_settings(settings.clone()).await.unwrap();

        let loaded = service.get_settings().await.unwrap();
        assert_eq!(loaded.search_settings.max_results, 100);
    }

    #[tokio::test]
    async fn test_settings_cache() {
        let pool = setup_test_db().await;
        let service = SettingsService::new(pool);

        // First call loads from DB
        let settings1 = service.get_settings().await.unwrap();

        // Second call should use cache
        let settings2 = service.get_settings().await.unwrap();

        assert_eq!(settings1, settings2);
    }

    #[tokio::test]
    async fn test_validate_settings_max_results() {
        let pool = setup_test_db().await;
        let service = SettingsService::new(pool);

        let mut settings = AppSettings::default();
        settings.search_settings.max_results = 0;

        let result = service.update_settings(settings).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_validate_settings_max_results_upper_limit() {
        let pool = setup_test_db().await;
        let service = SettingsService::new(pool);

        let mut settings = AppSettings::default();
        settings.search_settings.max_results = 2000;

        let result = service.update_settings(settings).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_update_individual_setting() {
        let pool = setup_test_db().await;
        let service = SettingsService::new(pool);

        service
            .update_setting("custom_key", "custom_value".to_string())
            .await
            .unwrap();

        let value = service.get_setting("custom_key").await.unwrap();
        assert_eq!(value, Some("custom_value".to_string()));
    }

    #[tokio::test]
    async fn test_clear_cache() {
        let pool = setup_test_db().await;
        let service = SettingsService::new(pool);

        // Load settings to populate cache
        service.get_settings().await.unwrap();

        // Clear cache
        service.clear_cache().await;

        // Cache should be empty
        let cache = service.cache.read().await;
        assert!(cache.is_none());
    }
}
