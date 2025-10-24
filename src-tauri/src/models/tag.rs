use serde::{Deserialize, Serialize};

/// Newtype wrapper for tag IDs to prevent type confusion
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct TagId(pub i64);

impl From<i64> for TagId {
    fn from(id: i64) -> Self {
        TagId(id)
    }
}

impl From<TagId> for i64 {
    fn from(id: TagId) -> Self {
        id.0
    }
}

/// Represents a tag that can be associated with snippets
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)] // Will be used in Task Group D (CRUD commands)
pub struct Tag {
    pub id: TagId,
    pub name: String,
}

/// Association between a snippet and a tag
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)] // Will be used in Task Group D (CRUD commands)
pub struct SnippetTag {
    pub snippet_id: i64,
    pub tag_id: i64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tag_id_conversion() {
        let id: TagId = 10.into();
        assert_eq!(id.0, 10);

        let raw_id: i64 = id.into();
        assert_eq!(raw_id, 10);
    }

    #[test]
    fn test_tag_serialization() {
        let tag = Tag {
            id: TagId(1),
            name: "rust".to_string(),
        };

        let json = serde_json::to_string(&tag).unwrap();
        let deserialized: Tag = serde_json::from_str(&json).unwrap();

        assert_eq!(tag.id, deserialized.id);
        assert_eq!(tag.name, deserialized.name);
    }

    #[test]
    fn test_snippet_tag() {
        let snippet_tag = SnippetTag {
            snippet_id: 1,
            tag_id: 2,
        };

        assert_eq!(snippet_tag.snippet_id, 1);
        assert_eq!(snippet_tag.tag_id, 2);
    }
}
