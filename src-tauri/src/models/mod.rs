pub mod analytics;
pub mod settings;
pub mod snippet;
pub mod tag;

// Re-export commonly used types
// Allow unused imports as these will be used by command handlers in Task Group D
#[allow(unused_imports)]
pub use analytics::{
    AnalyticsId, AnalyticsRecord, GlobalAnalytics, MostUsedSnippet, RecentActivity,
    SnippetAnalytics,
};
#[allow(unused_imports)]
pub use settings::{
    AppSettings, AuthToken, CloudAccountInfo, CloudSyncResult, CloudSyncSettings, CloudSyncStatus,
    ConflictInfo, ConflictResolutionStrategy, GitStatus, GitSyncResult, GlobalShortcuts,
    PrivacySettings, SearchSettings, StorageType, SyncStatus, Theme,
};
#[allow(unused_imports)]
pub use snippet::{CreateSnippetInput, SearchResult, Snippet, SnippetId, UpdateSnippetInput};
#[allow(unused_imports)]
pub use tag::{SnippetTag, Tag, TagId};
