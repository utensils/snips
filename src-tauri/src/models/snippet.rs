use serde::{Deserialize, Serialize};

/// Newtype wrapper for snippet IDs to prevent type confusion
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct SnippetId(pub i64);

impl From<i64> for SnippetId {
    fn from(id: i64) -> Self {
        SnippetId(id)
    }
}

impl From<SnippetId> for i64 {
    fn from(id: SnippetId) -> Self {
        id.0
    }
}

/// Represents a text snippet stored in the database
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)] // Will be used in Task Group D (CRUD commands)
pub struct Snippet {
    pub id: SnippetId,
    pub name: String,
    pub content: String,
    pub description: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,
}

/// Input data for creating a new snippet
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)] // Will be used in Task Group D (CRUD commands)
pub struct CreateSnippetInput {
    pub name: String,
    pub content: String,
    pub description: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
}

/// Input data for updating an existing snippet
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)] // Will be used in Task Group D (CRUD commands)
pub struct UpdateSnippetInput {
    pub name: String,
    pub content: String,
    pub description: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
}

/// Search result with relevance scoring and usage statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)] // Will be used in Task Group H (Search implementation)
pub struct SearchResult {
    #[serde(flatten)]
    pub snippet: Snippet,
    pub usage_count: i64,
    pub last_used: Option<i64>,
    pub relevance_score: f64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_snippet_id_conversion() {
        let id: SnippetId = 42.into();
        assert_eq!(id.0, 42);

        let raw_id: i64 = id.into();
        assert_eq!(raw_id, 42);
    }

    #[test]
    fn test_snippet_serialization() {
        let snippet = Snippet {
            id: SnippetId(1),
            name: "test".to_string(),
            content: "content".to_string(),
            description: Some("desc".to_string()),
            created_at: 1000,
            updated_at: 2000,
            tags: Some(vec!["tag1".to_string()]),
        };

        let json = serde_json::to_string(&snippet).unwrap();
        let deserialized: Snippet = serde_json::from_str(&json).unwrap();

        assert_eq!(snippet.id, deserialized.id);
        assert_eq!(snippet.name, deserialized.name);
    }

    #[test]
    fn test_create_snippet_input() {
        let input = CreateSnippetInput {
            name: "test".to_string(),
            content: "content".to_string(),
            description: None,
            tags: vec!["tag1".to_string(), "tag2".to_string()],
        };

        assert_eq!(input.tags.len(), 2);
    }
}
