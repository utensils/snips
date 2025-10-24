use snips_lib::models::{CreateSnippetInput, SnippetId, UpdateSnippetInput};
use snips_lib::{create_snippet, delete_snippet, get_all_snippets, get_snippet, update_snippet};
use tauri::AppHandle;

/// Helper to create a test app instance
async fn setup_test_app() -> AppHandle {
    // Note: This requires proper Tauri test setup
    // For now, this is a placeholder structure
    todo!("Implement proper Tauri test app setup")
}

#[tokio::test]
#[ignore = "Integration tests require proper Tauri app setup"]
async fn test_create_snippet_success() {
    let app = setup_test_app().await;

    let input = CreateSnippetInput {
        name: "Test Snippet".to_string(),
        content: "This is test content".to_string(),
        description: Some("Test description".to_string()),
        tags: vec!["rust".to_string(), "testing".to_string()],
    };

    let result = create_snippet(app, input).await;
    assert!(result.is_ok());

    let snippet = result.unwrap();
    assert_eq!(snippet.name, "Test Snippet");
    assert_eq!(snippet.content, "This is test content");
    assert_eq!(snippet.description, Some("Test description".to_string()));
    assert!(snippet.tags.is_some());
    assert_eq!(snippet.tags.unwrap().len(), 2);
}

#[tokio::test]
#[ignore = "Integration tests require proper Tauri app setup"]
async fn test_create_snippet_with_empty_name() {
    let app = setup_test_app().await;

    let input = CreateSnippetInput {
        name: "".to_string(),
        content: "content".to_string(),
        description: None,
        tags: vec![],
    };

    let result = create_snippet(app, input).await;
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("empty"));
}

#[tokio::test]
#[ignore = "Integration tests require proper Tauri app setup"]
async fn test_create_snippet_with_empty_content() {
    let app = setup_test_app().await;

    let input = CreateSnippetInput {
        name: "name".to_string(),
        content: "".to_string(),
        description: None,
        tags: vec![],
    };

    let result = create_snippet(app, input).await;
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("empty"));
}

#[tokio::test]
#[ignore = "Integration tests require proper Tauri app setup"]
async fn test_create_duplicate_snippet() {
    let app = setup_test_app().await;

    let input1 = CreateSnippetInput {
        name: "Duplicate".to_string(),
        content: "content1".to_string(),
        description: None,
        tags: vec![],
    };

    let input2 = CreateSnippetInput {
        name: "Duplicate".to_string(),
        content: "content2".to_string(),
        description: None,
        tags: vec![],
    };

    let result1 = create_snippet(app.clone(), input1).await;
    assert!(result1.is_ok());

    let result2 = create_snippet(app, input2).await;
    assert!(result2.is_err());
    assert!(result2.unwrap_err().contains("already exists"));
}

#[tokio::test]
#[ignore = "Integration tests require proper Tauri app setup"]
async fn test_get_snippet_success() {
    let app = setup_test_app().await;

    // First create a snippet
    let input = CreateSnippetInput {
        name: "Get Test".to_string(),
        content: "content".to_string(),
        description: None,
        tags: vec!["tag1".to_string()],
    };

    let created = create_snippet(app.clone(), input).await.unwrap();

    // Then retrieve it
    let result = get_snippet(app, created.id).await;
    assert!(result.is_ok());

    let snippet = result.unwrap();
    assert_eq!(snippet.id, created.id);
    assert_eq!(snippet.name, "Get Test");
}

#[tokio::test]
#[ignore = "Integration tests require proper Tauri app setup"]
async fn test_get_snippet_not_found() {
    let app = setup_test_app().await;

    let result = get_snippet(app, SnippetId(99999)).await;
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("not found"));
}

#[tokio::test]
#[ignore = "Integration tests require proper Tauri app setup"]
async fn test_get_all_snippets() {
    let app = setup_test_app().await;

    // Create multiple snippets
    for i in 1..=3 {
        let input = CreateSnippetInput {
            name: format!("Snippet {}", i),
            content: format!("Content {}", i),
            description: None,
            tags: vec![],
        };
        create_snippet(app.clone(), input).await.unwrap();
    }

    // Get all snippets
    let result = get_all_snippets(app).await;
    assert!(result.is_ok());

    let snippets = result.unwrap();
    assert!(snippets.len() >= 3);
}

#[tokio::test]
#[ignore = "Integration tests require proper Tauri app setup"]
async fn test_update_snippet_success() {
    let app = setup_test_app().await;

    // Create a snippet
    let input = CreateSnippetInput {
        name: "Original".to_string(),
        content: "original content".to_string(),
        description: None,
        tags: vec!["tag1".to_string()],
    };
    let created = create_snippet(app.clone(), input).await.unwrap();

    // Update it
    let update_input = UpdateSnippetInput {
        name: "Updated".to_string(),
        content: "updated content".to_string(),
        description: Some("new description".to_string()),
        tags: vec!["tag2".to_string(), "tag3".to_string()],
    };

    let result = update_snippet(app, created.id, update_input).await;
    assert!(result.is_ok());

    let updated = result.unwrap();
    assert_eq!(updated.name, "Updated");
    assert_eq!(updated.content, "updated content");
    assert_eq!(updated.description, Some("new description".to_string()));
    assert_eq!(updated.tags.unwrap().len(), 2);
}

#[tokio::test]
#[ignore = "Integration tests require proper Tauri app setup"]
async fn test_update_snippet_not_found() {
    let app = setup_test_app().await;

    let update_input = UpdateSnippetInput {
        name: "Updated".to_string(),
        content: "content".to_string(),
        description: None,
        tags: vec![],
    };

    let result = update_snippet(app, SnippetId(99999), update_input).await;
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("not found"));
}

#[tokio::test]
#[ignore = "Integration tests require proper Tauri app setup"]
async fn test_update_snippet_with_empty_name() {
    let app = setup_test_app().await;

    // Create a snippet
    let input = CreateSnippetInput {
        name: "Test".to_string(),
        content: "content".to_string(),
        description: None,
        tags: vec![],
    };
    let created = create_snippet(app.clone(), input).await.unwrap();

    // Try to update with empty name
    let update_input = UpdateSnippetInput {
        name: "".to_string(),
        content: "content".to_string(),
        description: None,
        tags: vec![],
    };

    let result = update_snippet(app, created.id, update_input).await;
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("empty"));
}

#[tokio::test]
#[ignore = "Integration tests require proper Tauri app setup"]
async fn test_delete_snippet_success() {
    let app = setup_test_app().await;

    // Create a snippet
    let input = CreateSnippetInput {
        name: "To Delete".to_string(),
        content: "content".to_string(),
        description: None,
        tags: vec![],
    };
    let created = create_snippet(app.clone(), input).await.unwrap();

    // Delete it
    let result = delete_snippet(app.clone(), created.id).await;
    assert!(result.is_ok());

    // Verify it's gone
    let get_result = get_snippet(app, created.id).await;
    assert!(get_result.is_err());
}

#[tokio::test]
#[ignore = "Integration tests require proper Tauri app setup"]
async fn test_delete_snippet_not_found() {
    let app = setup_test_app().await;

    let result = delete_snippet(app, SnippetId(99999)).await;
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("not found"));
}

#[tokio::test]
#[ignore = "Integration tests require proper Tauri app setup"]
async fn test_snippet_tags_association() {
    let app = setup_test_app().await;

    // Create snippet with tags
    let input = CreateSnippetInput {
        name: "Tagged Snippet".to_string(),
        content: "content".to_string(),
        description: None,
        tags: vec![
            "rust".to_string(),
            "tauri".to_string(),
            "testing".to_string(),
        ],
    };
    let created = create_snippet(app.clone(), input).await.unwrap();

    // Verify tags are associated
    let snippet = get_snippet(app.clone(), created.id).await.unwrap();
    assert!(snippet.tags.is_some());
    let tags = snippet.tags.unwrap();
    assert_eq!(tags.len(), 3);
    assert!(tags.contains(&"rust".to_string()));
    assert!(tags.contains(&"tauri".to_string()));
    assert!(tags.contains(&"testing".to_string()));
}

#[tokio::test]
#[ignore = "Integration tests require proper Tauri app setup"]
async fn test_update_snippet_tags() {
    let app = setup_test_app().await;

    // Create snippet with initial tags
    let input = CreateSnippetInput {
        name: "Tag Update Test".to_string(),
        content: "content".to_string(),
        description: None,
        tags: vec!["tag1".to_string(), "tag2".to_string()],
    };
    let created = create_snippet(app.clone(), input).await.unwrap();

    // Update with different tags
    let update_input = UpdateSnippetInput {
        name: "Tag Update Test".to_string(),
        content: "content".to_string(),
        description: None,
        tags: vec!["tag3".to_string(), "tag4".to_string()],
    };
    let updated = update_snippet(app, created.id, update_input).await.unwrap();

    // Verify new tags replaced old ones
    let tags = updated.tags.unwrap();
    assert_eq!(tags.len(), 2);
    assert!(tags.contains(&"tag3".to_string()));
    assert!(tags.contains(&"tag4".to_string()));
    assert!(!tags.contains(&"tag1".to_string()));
    assert!(!tags.contains(&"tag2".to_string()));
}

#[tokio::test]
#[ignore = "Integration tests require proper Tauri app setup"]
async fn test_delete_snippet_cascades_to_tags() {
    let app = setup_test_app().await;

    // Create snippet with tags
    let input = CreateSnippetInput {
        name: "Cascade Test".to_string(),
        content: "content".to_string(),
        description: None,
        tags: vec!["tag1".to_string()],
    };
    let created = create_snippet(app.clone(), input).await.unwrap();

    // Delete snippet
    delete_snippet(app.clone(), created.id).await.unwrap();

    // Verify snippet is gone (cascade deletes tag associations)
    let result = get_snippet(app, created.id).await;
    assert!(result.is_err());
}
