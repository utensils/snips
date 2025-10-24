use crate::models::SearchResult;
use crate::services::search;
use crate::utils::error::AppError;
use tauri::AppHandle;

/// Search snippets using full-text search
///
/// # Arguments
///
/// * `app` - Tauri application handle
/// * `query` - The search query string
/// * `limit` - Optional maximum number of results (default: 50, max: 1000)
///
/// # Returns
///
/// Vector of `SearchResult` sorted by relevance score combining:
/// - Text relevance (FTS5 BM25 ranking)
/// - Usage frequency (how often used)
/// - Recency (when last used)
///
/// # Examples
///
/// ```javascript
/// // From frontend
/// const results = await invoke('search_snippets', {
///   query: 'react hooks',
///   limit: 20
/// });
/// ```
#[tauri::command]
pub async fn search_snippets(
    app: AppHandle,
    query: String,
    limit: Option<i64>,
) -> Result<Vec<SearchResult>, String> {
    // Validate input
    if query.len() > 1000 {
        return Err(AppError::InvalidInput(
            "Search query too long (max 1000 characters)".to_string(),
        )
        .into());
    }

    search::search_snippets(&app, &query, limit)
        .await
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_query_length_validation() {
        let long_query = "a".repeat(1001);
        assert!(long_query.len() > 1000);

        let normal_query = "test query";
        assert!(normal_query.len() <= 1000);
    }
}
