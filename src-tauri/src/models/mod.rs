pub mod analytics;
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
pub use snippet::{CreateSnippetInput, SearchResult, Snippet, SnippetId, UpdateSnippetInput};
#[allow(unused_imports)]
pub use tag::{SnippetTag, Tag, TagId};
