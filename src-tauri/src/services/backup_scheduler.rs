use crate::commands::storage_commands::backup_database;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::Duration;
use tauri::AppHandle;
use tokio::sync::RwLock;

/// Backup scheduler configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupConfig {
    /// Whether automatic backups are enabled
    pub enabled: bool,
    /// Interval between backups in hours
    pub interval_hours: u64,
    /// Maximum number of backups to keep (0 = unlimited)
    pub max_backups: usize,
}

impl Default for BackupConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            interval_hours: 24, // Daily by default
            max_backups: 7,     // Keep 7 backups by default
        }
    }
}

/// Backup scheduler service
pub struct BackupScheduler {
    config: Arc<RwLock<BackupConfig>>,
    app_handle: AppHandle,
}

impl BackupScheduler {
    /// Create a new backup scheduler
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            config: Arc::new(RwLock::new(BackupConfig::default())),
            app_handle,
        }
    }

    /// Start the backup scheduler
    pub async fn start(&self) {
        let config = self.config.clone();
        let app_handle = self.app_handle.clone();

        // Spawn background task
        tauri::async_runtime::spawn(async move {
            loop {
                // Read current config
                let current_config = {
                    let cfg = config.read().await;
                    cfg.clone()
                };

                if !current_config.enabled {
                    // If disabled, sleep for 1 minute and check again
                    tokio::time::sleep(Duration::from_secs(60)).await;
                    continue;
                }

                // Create backup
                match backup_database(app_handle.clone()).await {
                    Ok(backup_info) => {
                        println!(
                            "Automatic backup created: {} ({} bytes)",
                            backup_info.path, backup_info.size_bytes
                        );

                        // Clean up old backups if needed
                        if current_config.max_backups > 0 {
                            if let Err(e) =
                                Self::cleanup_old_backups(&app_handle, current_config.max_backups)
                                    .await
                            {
                                eprintln!("Failed to cleanup old backups: {}", e);
                            }
                        }
                    }
                    Err(e) => {
                        eprintln!("Failed to create automatic backup: {}", e);
                    }
                }

                // Wait for the configured interval
                let wait_duration = Duration::from_secs(current_config.interval_hours * 3600);
                tokio::time::sleep(wait_duration).await;
            }
        });
    }

    /// Update backup configuration
    pub async fn update_config(&self, new_config: BackupConfig) {
        let mut config = self.config.write().await;
        *config = new_config;
    }

    /// Get current configuration
    pub async fn get_config(&self) -> BackupConfig {
        self.config.read().await.clone()
    }

    /// Clean up old backups, keeping only the most recent max_count
    async fn cleanup_old_backups(app: &AppHandle, max_count: usize) -> Result<(), String> {
        use crate::commands::storage_commands::list_backups;

        let mut backups = list_backups(app.clone()).await?;

        if backups.len() <= max_count {
            return Ok(()); // Nothing to cleanup
        }

        // Sort by creation time, newest first
        backups.sort_by(|a, b| b.created_at.cmp(&a.created_at));

        // Delete old backups
        for backup in backups.iter().skip(max_count) {
            if let Err(e) = std::fs::remove_file(&backup.path) {
                eprintln!("Failed to delete old backup {}: {}", backup.path, e);
            } else {
                println!("Deleted old backup: {}", backup.path);
            }
        }

        Ok(())
    }
}

/// State wrapper for backup scheduler
pub struct BackupSchedulerState(pub Arc<RwLock<Option<BackupScheduler>>>);

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_backup_config_default() {
        let config = BackupConfig::default();
        assert!(!config.enabled);
        assert_eq!(config.interval_hours, 24);
        assert_eq!(config.max_backups, 7);
    }

    #[test]
    fn test_backup_config_custom() {
        let config = BackupConfig {
            enabled: true,
            interval_hours: 12,
            max_backups: 10,
        };
        assert!(config.enabled);
        assert_eq!(config.interval_hours, 12);
        assert_eq!(config.max_backups, 10);
    }
}
