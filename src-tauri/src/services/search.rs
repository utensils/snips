use crate::models::{SearchResult, Snippet, SnippetId};
use crate::services::database::get_pool;
use crate::services::tags;
use crate::utils::error::AppError;
use sqlx::Row;
use tauri::AppHandle;

/// Default limit for search results
const DEFAULT_SEARCH_LIMIT: i64 = 50;

/// Maximum allowed limit to prevent performance issues
const MAX_SEARCH_LIMIT: i64 = 1000;

/// Recency thresholds for scoring (in days)
const RECENCY_RECENT_DAYS: f64 = 7.0;
const RECENCY_MEDIUM_DAYS: f64 = 30.0;
const RECENCY_OLD_DAYS: f64 = 90.0;

/// Recency score bonuses
const RECENCY_RECENT_BONUS: f64 = 2.0;
const RECENCY_MEDIUM_BONUS: f64 = 1.0;
const RECENCY_OLD_BONUS: f64 = 0.5;

/// Scoring weights for relevance calculation
const WEIGHT_TEXT_RELEVANCE: f64 = 10.0;
const WEIGHT_USAGE_FREQUENCY: f64 = 2.0;
const WEIGHT_RECENCY: f64 = 1.0;

/// Search snippets using FTS5 full-text search with relevance scoring
///
/// # Arguments
///
/// * `app` - Tauri application handle
/// * `query` - Search query string
/// * `limit` - Optional maximum number of results (defaults to 50, max 1000)
///
/// # Returns
///
/// Vector of `SearchResult` sorted by relevance score and usage frequency.
///
/// # Errors
///
/// Returns `AppError` if the query fails or database is unavailable.
pub async fn search_snippets(
    app: &AppHandle,
    query: &str,
    limit: Option<i64>,
) -> Result<Vec<SearchResult>, AppError> {
    let pool = get_pool(app)?;

    // Validate and apply limit
    let limit = limit
        .unwrap_or(DEFAULT_SEARCH_LIMIT)
        .clamp(1, MAX_SEARCH_LIMIT);

    // Sanitize query input
    let query = query.trim();
    if query.is_empty() {
        return Ok(Vec::new());
    }

    // Build FTS5 query - use simple match for now
    let fts_query = build_fts5_query(query);

    // Execute search query with relevance scoring
    // FTS5 provides bm25() ranking function for relevance
    // We also join with analytics to get usage statistics
    let results = sqlx::query(
        r#"
        SELECT
            s.id,
            s.name,
            s.content,
            s.description,
            s.created_at,
            s.updated_at,
            COALESCE(usage.count, 0) as usage_count,
            usage.last_used,
            snippets_fts.rank as fts_rank
        FROM snippets_fts
        INNER JOIN snippets s ON snippets_fts.rowid = s.id
        LEFT JOIN (
            SELECT
                snippet_id,
                COUNT(*) as count,
                MAX(used_at) as last_used
            FROM analytics
            GROUP BY snippet_id
        ) usage ON s.id = usage.snippet_id
        WHERE snippets_fts MATCH ?
        ORDER BY snippets_fts.rank
        LIMIT ?
        "#,
    )
    .bind(&fts_query)
    .bind(limit)
    .fetch_all(&pool)
    .await?;

    // Convert to SearchResult with computed relevance scores
    let mut search_results = Vec::new();
    for row in results {
        let snippet_id: i64 = row.get(0);
        let usage_count: i64 = row.get(6);
        let last_used: Option<i64> = row.get(7);
        let fts_rank: f64 = row.get(8);

        // Get tags for this snippet
        let tags = tags::get_snippet_tags(app, snippet_id).await?;

        let snippet = Snippet {
            id: SnippetId(snippet_id),
            name: row.get(1),
            content: row.get(2),
            description: row.get(3),
            created_at: row.get(4),
            updated_at: row.get(5),
            tags: Some(tags),
        };

        // Calculate relevance score combining FTS rank and usage statistics
        let relevance_score = calculate_relevance_score(fts_rank, usage_count, last_used);

        search_results.push(SearchResult {
            snippet,
            usage_count,
            last_used,
            relevance_score,
        });
    }

    // Re-sort by relevance score (combines FTS rank with usage stats)
    search_results.sort_by(|a, b| {
        b.relevance_score
            .partial_cmp(&a.relevance_score)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    Ok(search_results)
}

/// Build FTS5 query from user input
///
/// This function prepares the user's search query for FTS5.
/// Currently implements simple matching, but can be extended for:
/// - Phrase queries: "exact phrase"
/// - AND/OR operators
/// - Column-specific searches: name:searchterm
/// - Prefix matching: term*
fn build_fts5_query(query: &str) -> String {
    // For MVP, use simple token matching
    // FTS5 tokenizes the query automatically
    // We escape special FTS5 characters to prevent syntax errors
    let escaped = query.replace(['"', '*', '(', ')'], "");

    // Split into tokens and join with OR for broader matching
    let tokens: Vec<&str> = escaped.split_whitespace().collect();

    if tokens.is_empty() {
        return String::new();
    }

    // Join tokens with OR operator for more forgiving search
    // This allows matching any of the search terms
    tokens.join(" OR ")
}

/// Calculate relevance score combining FTS rank with usage statistics
///
/// The scoring algorithm considers:
/// 1. FTS5 BM25 rank (text relevance)
/// 2. Usage frequency (how often the snippet is used)
/// 3. Recency (when it was last used)
///
/// # Arguments
///
/// * `fts_rank` - FTS5 BM25 rank (negative number, closer to 0 is better)
/// * `usage_count` - Number of times snippet has been used
/// * `last_used` - Timestamp of last usage (None if never used)
///
/// # Returns
///
/// A positive score where higher is better
fn calculate_relevance_score(fts_rank: f64, usage_count: i64, last_used: Option<i64>) -> f64 {
    // FTS5 rank is negative, normalize to positive (closer to 0 = better match)
    // Convert to positive score where higher is better
    let text_score = -fts_rank;

    // Usage frequency score (logarithmic to prevent domination by highly-used snippets)
    let usage_score = if usage_count > 0 {
        (usage_count as f64).ln() + 1.0
    } else {
        0.0
    };

    // Recency score (bonus for recently used snippets)
    let recency_score = match last_used {
        Some(timestamp) => {
            let now = crate::utils::time::current_timestamp();
            let days_ago = (now - timestamp) as f64 / (24.0 * 3600.0);

            // Decay function: score decreases over time
            // Recent usage gets significant boost, older usage gets less
            if days_ago < RECENCY_RECENT_DAYS {
                RECENCY_RECENT_BONUS
            } else if days_ago < RECENCY_MEDIUM_DAYS {
                RECENCY_MEDIUM_BONUS
            } else if days_ago < RECENCY_OLD_DAYS {
                RECENCY_OLD_BONUS
            } else {
                0.0
            }
        }
        None => 0.0,
    };

    // Weighted combination of scores
    // Text relevance is most important
    // Usage frequency adds moderate boost
    // Recency adds small boost
    (text_score * WEIGHT_TEXT_RELEVANCE)
        + (usage_score * WEIGHT_USAGE_FREQUENCY)
        + (recency_score * WEIGHT_RECENCY)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_fts5_query() {
        // Test simple query
        assert_eq!(build_fts5_query("react"), "react");

        // Test multiple words
        assert_eq!(build_fts5_query("react hooks"), "react OR hooks");

        // Test with special characters (should be escaped)
        assert_eq!(build_fts5_query("test*query"), "testquery");

        // Test empty query
        assert_eq!(build_fts5_query(""), "");

        // Test whitespace only
        assert_eq!(build_fts5_query("   "), "");
    }

    #[test]
    fn test_calculate_relevance_score() {
        // Test text relevance only (unused snippet)
        let score = calculate_relevance_score(-1.0, 0, None);
        assert_eq!(score, 10.0); // text_score * 10

        // Test with usage count
        let score = calculate_relevance_score(-1.0, 10, None);
        assert!(score > 10.0); // Should be higher due to usage

        // Test with recent usage (within 7 days)
        let now = crate::utils::time::current_timestamp();
        let recent = now - (3 * 24 * 3600); // 3 days ago
        let score = calculate_relevance_score(-1.0, 0, Some(recent));
        assert_eq!(score, 12.0); // 10 (text) + 0 (no usage) + 2 (recent)

        // Test with older usage (within 30 days)
        let older = now - (20 * 24 * 3600); // 20 days ago
        let score = calculate_relevance_score(-1.0, 0, Some(older));
        assert_eq!(score, 11.0); // 10 (text) + 0 (no usage) + 1 (medium recency)
    }

    #[test]
    fn test_search_limits() {
        // Test default limit
        assert_eq!(
            DEFAULT_SEARCH_LIMIT.clamp(1, MAX_SEARCH_LIMIT),
            DEFAULT_SEARCH_LIMIT
        );

        // Test below minimum
        assert_eq!(0_i64.clamp(1, MAX_SEARCH_LIMIT), 1);

        // Test above maximum
        assert_eq!(2000_i64.clamp(1, MAX_SEARCH_LIMIT), MAX_SEARCH_LIMIT);
    }
}
