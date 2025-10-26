use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Storage type for snippets
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum StorageType {
    Local,
    Git,
    Cloud,
}

impl Default for StorageType {
    fn default() -> Self {
        Self::Local
    }
}

/// Application theme
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    Light,
    Dark,
    System,
}

impl Default for Theme {
    fn default() -> Self {
        Self::System
    }
}

/// Window chrome preference per platform
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WindowChrome {
    Native,
    Frameless,
    FramelessShadow,
}

impl Default for WindowChrome {
    fn default() -> Self {
        Self::Native
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct WindowChromeSettings {
    #[serde(default)]
    pub macos: WindowChrome,
    #[serde(default)]
    pub linux: WindowChrome,
    #[serde(default)]
    pub windows: WindowChrome,
}

impl Default for WindowChromeSettings {
    fn default() -> Self {
        Self {
            macos: WindowChrome::FramelessShadow,
            linux: WindowChrome::Frameless,
            windows: WindowChrome::Native,
        }
    }
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct QuickWindowPreferences {
    #[serde(default = "default_true")]
    pub float_on_tiling: bool,
    #[serde(default)]
    pub per_wm_overrides: HashMap<String, bool>,
}

impl Default for QuickWindowPreferences {
    fn default() -> Self {
        Self {
            float_on_tiling: true,
            per_wm_overrides: HashMap::new(),
        }
    }
}

/// Conflict resolution strategy for sync operations
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ConflictResolutionStrategy {
    LastWriteWins,
    KeepBoth,
    AskUser,
}

impl Default for ConflictResolutionStrategy {
    fn default() -> Self {
        Self::AskUser
    }
}

/// Global keyboard shortcuts configuration
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct GlobalShortcuts {
    pub quick_add: String,
    pub search_select: String,
}

impl Default for GlobalShortcuts {
    fn default() -> Self {
        Self {
            quick_add: "CommandOrControl+Shift+A".to_string(),
            search_select: "CommandOrControl+Shift+S".to_string(),
        }
    }
}

/// Search settings configuration
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SearchSettings {
    pub max_results: u32,
    pub enable_fuzzy_search: bool,
    pub search_in_tags: bool,
    /// Weight for text relevance in search ranking (default: 10.0)
    pub weight_text_relevance: f64,
    /// Weight for usage frequency in search ranking (default: 2.0)
    pub weight_usage_frequency: f64,
    /// Weight for recency in search ranking (default: 1.0)
    pub weight_recency: f64,
}

impl Default for SearchSettings {
    fn default() -> Self {
        Self {
            max_results: 50,
            enable_fuzzy_search: true,
            search_in_tags: true,
            weight_text_relevance: 10.0,
            weight_usage_frequency: 2.0,
            weight_recency: 1.0,
        }
    }
}

/// Privacy settings configuration
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PrivacySettings {
    pub enable_analytics: bool,
    pub track_usage: bool,
}

impl Default for PrivacySettings {
    fn default() -> Self {
        Self {
            enable_analytics: true,
            track_usage: true,
        }
    }
}

/// Cloud sync settings configuration
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CloudSyncSettings {
    pub auto_sync_enabled: bool,
    pub sync_interval_minutes: u32,
    pub conflict_resolution: ConflictResolutionStrategy,
}

impl Default for CloudSyncSettings {
    fn default() -> Self {
        Self {
            auto_sync_enabled: false,
            sync_interval_minutes: 15,
            conflict_resolution: ConflictResolutionStrategy::default(),
        }
    }
}

/// Application settings
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Default)]
pub struct AppSettings {
    #[serde(default)]
    pub storage_type: StorageType,
    #[serde(default)]
    pub theme: Theme,
    #[serde(default)]
    pub global_shortcuts: GlobalShortcuts,
    #[serde(default)]
    pub search_settings: SearchSettings,
    #[serde(default)]
    pub privacy_settings: PrivacySettings,
    #[serde(default)]
    pub window_chrome: WindowChromeSettings,
    #[serde(default)]
    pub quick_window_preferences: QuickWindowPreferences,
    #[serde(default)]
    pub cloud_sync_settings: Option<CloudSyncSettings>,
}

/// Sync status information
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SyncStatus {
    #[serde(default)]
    pub is_syncing: bool,
    #[serde(default)]
    pub last_sync_at: Option<i64>,
    #[serde(default)]
    pub error: Option<String>,
}

/// Git sync result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitSyncResult {
    pub success: bool,
    pub commits_pulled: usize,
    pub commits_pushed: usize,
    pub conflicts: Vec<String>,
    pub timestamp: i64,
}

/// Git status information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitStatus {
    pub is_initialized: bool,
    pub branch: Option<String>,
    pub has_uncommitted_changes: bool,
    pub ahead: usize,
    pub behind: usize,
}

/// Cloud sync result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloudSyncResult {
    pub pushed: usize,
    pub pulled: usize,
    pub conflicts: Vec<ConflictInfo>,
    pub timestamp: i64,
}

/// Conflict information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConflictInfo {
    pub snippet_id: i64,
    pub snippet_name: String,
    pub conflict_type: String,
}

/// Cloud sync status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloudSyncStatus {
    pub is_authenticated: bool,
    pub last_sync: Option<i64>,
    pub pending_changes: usize,
    pub sync_enabled: bool,
}

/// Cloud account information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloudAccountInfo {
    pub email: String,
    pub created_at: i64,
    pub total_snippets: usize,
    pub storage_used_bytes: u64,
}

/// Authentication token
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthToken {
    pub token: String,
    pub expires_at: i64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_app_settings() {
        let settings = AppSettings::default();
        assert_eq!(settings.storage_type, StorageType::Local);
        assert_eq!(settings.theme, Theme::System);
        assert_eq!(
            settings.global_shortcuts.quick_add,
            "CommandOrControl+Shift+A"
        );
        assert_eq!(
            settings.global_shortcuts.search_select,
            "CommandOrControl+Shift+S"
        );
        assert_eq!(settings.search_settings.max_results, 50);
        assert!(settings.search_settings.enable_fuzzy_search);
        assert!(settings.privacy_settings.enable_analytics);
        assert!(settings.cloud_sync_settings.is_none());
    }

    #[test]
    fn test_storage_type_serialization() {
        let local = StorageType::Local;
        let json = serde_json::to_string(&local).unwrap();
        assert_eq!(json, r#""local""#);

        let deserialized: StorageType = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, StorageType::Local);
    }

    #[test]
    fn test_theme_serialization() {
        let system = Theme::System;
        let json = serde_json::to_string(&system).unwrap();
        assert_eq!(json, r#""system""#);
    }

    #[test]
    fn test_cloud_sync_settings_default() {
        let settings = CloudSyncSettings::default();
        assert!(!settings.auto_sync_enabled);
        assert_eq!(settings.sync_interval_minutes, 15);
        assert_eq!(
            settings.conflict_resolution,
            ConflictResolutionStrategy::AskUser
        );
    }
}
