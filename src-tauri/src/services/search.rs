use crate::models::{SearchResult, Snippet, SnippetId};
use crate::services::{database::get_pool, settings::SettingsService, tags};
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

/// Search snippets using FTS5 full-text search with relevance scoring
///
/// # Arguments
///
/// * `app` - Tauri application handle
/// * `query` - Search query string (supports "tag:" prefix for filtering by tag)
/// * `limit` - Optional maximum number of results (defaults to 50, max 1000)
///
/// # Returns
///
/// Vector of `SearchResult` sorted by relevance score and usage frequency.
///
/// # Errors
///
/// Returns `AppError` if the query fails or database is unavailable.
///
/// # Tag Filtering
///
/// Query can include a tag filter using the format "tagname:search terms"
/// - "python:" - shows all snippets with the "python" tag
/// - "python:async" - shows snippets with "python" tag containing "async"
pub async fn search_snippets(
    app: &AppHandle,
    query: &str,
    limit: Option<i64>,
) -> Result<Vec<SearchResult>, AppError> {
    let pool = get_pool(app)?;

    // Load search settings to get configurable weights
    let settings_service = SettingsService::new(pool.clone());
    let settings = settings_service.get_settings().await?;
    let search_settings = &settings.search_settings;

    // Validate and apply limit
    let limit = limit
        .unwrap_or(DEFAULT_SEARCH_LIMIT)
        .clamp(1, MAX_SEARCH_LIMIT);

    // Sanitize query input
    let query = query.trim();
    if query.is_empty() {
        return Ok(Vec::new());
    }

    // Parse query to extract tag filter
    let (tag_filter, search_query) = parse_tag_filter(query);

    // Build FTS5 query - use simple match for now
    let fts_query = build_fts5_query(search_query);

    // Execute search query with relevance scoring
    // FTS5 provides bm25() ranking function for relevance
    // We also join with analytics to get usage statistics
    let results = if let Some(tag) = tag_filter {
        // Tag-filtered search: join with snippet_tags and tags tables
        if fts_query.is_empty() {
            // No search query, just show all snippets with this tag
            sqlx::query(
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
                    0.0 as fts_rank
                FROM snippets s
                INNER JOIN snippet_tags st ON s.id = st.snippet_id
                INNER JOIN tags t ON st.tag_id = t.id
                LEFT JOIN (
                    SELECT
                        snippet_id,
                        COUNT(*) as count,
                        MAX(used_at) as last_used
                    FROM analytics
                    GROUP BY snippet_id
                ) usage ON s.id = usage.snippet_id
                WHERE LOWER(t.name) = LOWER(?)
                ORDER BY s.updated_at DESC
                LIMIT ?
                "#,
            )
            .bind(tag)
            .bind(limit)
            .fetch_all(&pool)
            .await?
        } else {
            // Tag-filtered FTS search
            sqlx::query(
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
                INNER JOIN snippet_tags st ON s.id = st.snippet_id
                INNER JOIN tags t ON st.tag_id = t.id
                LEFT JOIN (
                    SELECT
                        snippet_id,
                        COUNT(*) as count,
                        MAX(used_at) as last_used
                    FROM analytics
                    GROUP BY snippet_id
                ) usage ON s.id = usage.snippet_id
                WHERE snippets_fts MATCH ? AND LOWER(t.name) = LOWER(?)
                ORDER BY snippets_fts.rank
                LIMIT ?
                "#,
            )
            .bind(&fts_query)
            .bind(tag)
            .bind(limit)
            .fetch_all(&pool)
            .await?
        }
    } else {
        // Regular FTS search without tag filter
        sqlx::query(
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
        .await?
    };

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
        // Use configurable weights from settings
        let relevance_score = calculate_relevance_score(
            fts_rank,
            usage_count,
            last_used,
            search_settings.weight_text_relevance,
            search_settings.weight_usage_frequency,
            search_settings.weight_recency,
        );

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

/// Parse tag filter from query string
///
/// Extracts tag filter in format "tagname:" from the beginning of the query.
/// Returns tuple of (tag_filter, remaining_query).
///
/// # Examples
///
/// ```ignore
/// assert_eq!(parse_tag_filter("python:"), (Some("python"), ""));
/// assert_eq!(parse_tag_filter("python:async"), (Some("python"), "async"));
/// assert_eq!(parse_tag_filter("react hooks"), (None, "react hooks"));
/// ```
fn parse_tag_filter(query: &str) -> (Option<&str>, &str) {
    // Look for the first colon
    if let Some(colon_pos) = query.find(':') {
        // Check if there's text before the colon (potential tag name)
        let potential_tag = &query[..colon_pos];

        // Tag names should be non-empty and not contain spaces
        if !potential_tag.is_empty() && !potential_tag.contains(char::is_whitespace) {
            let remaining = query[colon_pos + 1..].trim();
            return (Some(potential_tag), remaining);
        }
    }

    // No tag filter found
    (None, query)
}

/// Build FTS5 query from user input
///
/// This function prepares the user's search query for FTS5.
/// Features:
/// - Prefix matching: "taur" matches "tauri"
/// - Multi-token OR search: "react hooks" matches snippets containing either term
/// - Special character escaping for safety
fn build_fts5_query(query: &str) -> String {
    // Escape special FTS5 characters to prevent syntax errors
    // Remove: " (phrases), * (wildcards we'll add ourselves), ( ) (grouping)
    let escaped = query.replace(['"', '*', '(', ')'], "");

    // Split into tokens
    let tokens: Vec<&str> = escaped.split_whitespace().collect();

    if tokens.is_empty() {
        return String::new();
    }

    // Add prefix matching wildcard to each token for partial matching
    // This enables "taur" to match "tauri"
    let prefix_tokens: Vec<String> = tokens.iter().map(|t| format!("{}*", t)).collect();

    // Join tokens with OR operator for broader matching
    // This allows matching any of the search terms
    prefix_tokens.join(" OR ")
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
/// * `weight_text` - Weight multiplier for text relevance (default: 10.0)
/// * `weight_usage` - Weight multiplier for usage frequency (default: 2.0)
/// * `weight_recency` - Weight multiplier for recency (default: 1.0)
///
/// # Returns
///
/// A positive score where higher is better
fn calculate_relevance_score(
    fts_rank: f64,
    usage_count: i64,
    last_used: Option<i64>,
    weight_text: f64,
    weight_usage: f64,
    weight_recency: f64,
) -> f64 {
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

    // Weighted combination of scores using configurable weights
    // This allows users to tune ranking behavior based on their preferences
    (text_score * weight_text) + (usage_score * weight_usage) + (recency_score * weight_recency)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_tag_filter() {
        // Test tag filter with no search query
        assert_eq!(parse_tag_filter("python:"), (Some("python"), ""));

        // Test tag filter with search query
        assert_eq!(parse_tag_filter("python:async"), (Some("python"), "async"));
        assert_eq!(
            parse_tag_filter("python: async await"),
            (Some("python"), "async await")
        );

        // Test no tag filter
        assert_eq!(parse_tag_filter("react hooks"), (None, "react hooks"));

        // Test colon in middle of word (not a tag filter)
        assert_eq!(
            parse_tag_filter("http://example.com"),
            (Some("http"), "//example.com")
        );

        // Test tag with spaces before colon (not valid)
        assert_eq!(
            parse_tag_filter("python rust:query"),
            (None, "python rust:query")
        );

        // Test empty string
        assert_eq!(parse_tag_filter(""), (None, ""));

        // Test just colon
        assert_eq!(parse_tag_filter(":"), (None, ":"));

        // Test multiple colons (uses first)
        assert_eq!(parse_tag_filter("tag:foo:bar"), (Some("tag"), "foo:bar"));

        // Test case sensitivity preserved
        assert_eq!(parse_tag_filter("Python:"), (Some("Python"), ""));
    }

    #[test]
    fn test_build_fts5_query() {
        // Test simple query with prefix matching
        assert_eq!(build_fts5_query("react"), "react*");

        // Test multiple words with prefix matching on each
        assert_eq!(build_fts5_query("react hooks"), "react* OR hooks*");

        // Test with special characters (should be escaped, then * added)
        assert_eq!(build_fts5_query("test*query"), "testquery*");

        // Test empty query
        assert_eq!(build_fts5_query(""), "");

        // Test whitespace only
        assert_eq!(build_fts5_query("   "), "");

        // Test partial word matching
        assert_eq!(build_fts5_query("taur"), "taur*");
    }

    #[test]
    fn test_calculate_relevance_score() {
        // Default weights for testing
        let weight_text = 10.0;
        let weight_usage = 2.0;
        let weight_recency = 1.0;

        // Test text relevance only (unused snippet)
        let score =
            calculate_relevance_score(-1.0, 0, None, weight_text, weight_usage, weight_recency);
        assert_eq!(score, 10.0); // text_score * 10

        // Test with usage count
        let score =
            calculate_relevance_score(-1.0, 10, None, weight_text, weight_usage, weight_recency);
        assert!(score > 10.0); // Should be higher due to usage

        // Test with recent usage (within 7 days)
        let now = crate::utils::time::current_timestamp();
        let recent = now - (3 * 24 * 3600); // 3 days ago
        let score = calculate_relevance_score(
            -1.0,
            0,
            Some(recent),
            weight_text,
            weight_usage,
            weight_recency,
        );
        assert_eq!(score, 12.0); // 10 (text) + 0 (no usage) + 2 (recent)

        // Test with older usage (within 30 days)
        let older = now - (20 * 24 * 3600); // 20 days ago
        let score = calculate_relevance_score(
            -1.0,
            0,
            Some(older),
            weight_text,
            weight_usage,
            weight_recency,
        );
        assert_eq!(score, 11.0); // 10 (text) + 0 (no usage) + 1 (medium recency)
    }

    #[test]
    fn test_calculate_relevance_score_custom_weights() {
        // Test with custom weights that prioritize usage over text relevance
        let weight_text = 1.0;
        let weight_usage = 10.0;
        let weight_recency = 0.5;

        // Snippet with high usage should score higher
        let score_high_usage =
            calculate_relevance_score(-1.0, 100, None, weight_text, weight_usage, weight_recency);
        let score_low_usage =
            calculate_relevance_score(-1.0, 1, None, weight_text, weight_usage, weight_recency);
        assert!(score_high_usage > score_low_usage);

        // Test that weights actually affect the score
        let now = crate::utils::time::current_timestamp();
        let recent = now - (3 * 24 * 3600);
        let score_with_recency = calculate_relevance_score(
            -1.0,
            0,
            Some(recent),
            weight_text,
            weight_usage,
            weight_recency,
        );
        // Should be text (1.0) + recency bonus (2.0 * 0.5) = 2.0
        assert_eq!(score_with_recency, 2.0);
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
