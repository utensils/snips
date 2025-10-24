use serde::{Deserialize, Serialize};

/// Newtype wrapper for analytics record IDs
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct AnalyticsId(pub i64);

impl From<i64> for AnalyticsId {
    fn from(id: i64) -> Self {
        AnalyticsId(id)
    }
}

impl From<AnalyticsId> for i64 {
    fn from(id: AnalyticsId) -> Self {
        id.0
    }
}

/// Represents a single usage event for a snippet
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)] // Will be used in Task Group M (Analytics backend)
pub struct AnalyticsRecord {
    pub id: AnalyticsId,
    pub snippet_id: i64,
    pub used_at: i64,
}

/// Analytics data for a specific snippet
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)] // Will be used in Task Group M (Analytics backend)
pub struct SnippetAnalytics {
    pub snippet_id: i64,
    pub usage_count: i64,
    pub last_used: Option<i64>,
    pub first_used: Option<i64>,
}

/// Global analytics aggregated across all snippets
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)] // Will be used in Task Group M (Analytics backend)
pub struct GlobalAnalytics {
    pub total_snippets: i64,
    pub total_usages: i64,
    pub most_used_snippets: Vec<MostUsedSnippet>,
    pub recent_activity: Vec<RecentActivity>,
}

/// Information about most frequently used snippets
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)] // Will be used in Task Group M (Analytics backend)
pub struct MostUsedSnippet {
    pub snippet_id: i64,
    pub snippet_name: String,
    pub usage_count: i64,
    pub last_used: Option<i64>,
}

/// Recent usage activity across all snippets
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)] // Will be used in Task Group M (Analytics backend)
pub struct RecentActivity {
    pub snippet_id: i64,
    pub snippet_name: String,
    pub used_at: i64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_analytics_id_conversion() {
        let id: AnalyticsId = 100.into();
        assert_eq!(id.0, 100);

        let raw_id: i64 = id.into();
        assert_eq!(raw_id, 100);
    }

    #[test]
    fn test_analytics_record_serialization() {
        let record = AnalyticsRecord {
            id: AnalyticsId(1),
            snippet_id: 42,
            used_at: 1000000,
        };

        let json = serde_json::to_string(&record).unwrap();
        let deserialized: AnalyticsRecord = serde_json::from_str(&json).unwrap();

        assert_eq!(record.id, deserialized.id);
        assert_eq!(record.snippet_id, deserialized.snippet_id);
    }

    #[test]
    fn test_snippet_analytics() {
        let analytics = SnippetAnalytics {
            snippet_id: 1,
            usage_count: 10,
            last_used: Some(2000),
            first_used: Some(1000),
        };

        assert_eq!(analytics.usage_count, 10);
        assert_eq!(analytics.last_used, Some(2000));
    }

    #[test]
    fn test_global_analytics() {
        let global = GlobalAnalytics {
            total_snippets: 50,
            total_usages: 500,
            most_used_snippets: vec![],
            recent_activity: vec![],
        };

        assert_eq!(global.total_snippets, 50);
        assert_eq!(global.total_usages, 500);
    }
}
