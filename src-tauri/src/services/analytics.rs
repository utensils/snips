use crate::models::analytics::{
    GlobalAnalytics, MostUsedSnippet, RecentActivity, SnippetAnalytics,
};
use crate::utils::error::AppError;
use sqlx::SqlitePool;
use std::time::{SystemTime, UNIX_EPOCH};

/// Record a snippet usage event
///
/// # Arguments
///
/// * `pool` - Database connection pool
/// * `snippet_id` - ID of the snippet being used
///
/// # Returns
///
/// Result indicating success or database error
///
/// # Examples
///
/// ```rust,no_run
/// # use snips_lib::services::analytics::record_usage;
/// # use sqlx::SqlitePool;
/// # async fn example(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
/// record_usage(pool, 42).await?;
/// # Ok(())
/// # }
/// ```
pub async fn record_usage(pool: &SqlitePool, snippet_id: i64) -> Result<(), AppError> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| AppError::Database(format!("Failed to get current time: {}", e)))?
        .as_secs() as i64;

    sqlx::query("INSERT INTO analytics (snippet_id, used_at) VALUES (?, ?)")
        .bind(snippet_id)
        .bind(now)
        .execute(pool)
        .await
        .map_err(|e| AppError::Database(format!("Failed to record usage: {}", e)))?;

    Ok(())
}

/// Get analytics data for a specific snippet
///
/// # Arguments
///
/// * `pool` - Database connection pool
/// * `snippet_id` - ID of the snippet to get analytics for
///
/// # Returns
///
/// SnippetAnalytics containing usage count, last used, and first used timestamps
///
/// # Errors
///
/// Returns `DatabaseError` if the query fails
///
/// # Examples
///
/// ```rust,no_run
/// # use snips_lib::services::analytics::get_snippet_analytics;
/// # use sqlx::SqlitePool;
/// # async fn example(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
/// let analytics = get_snippet_analytics(pool, 42).await?;
/// println!("Usage count: {}", analytics.usage_count);
/// # Ok(())
/// # }
/// ```
pub async fn get_snippet_analytics(
    pool: &SqlitePool,
    snippet_id: i64,
) -> Result<SnippetAnalytics, AppError> {
    let result = sqlx::query_as::<_, (i64, Option<i64>, Option<i64>)>(
        r#"
        SELECT
            COUNT(*) as usage_count,
            MAX(used_at) as last_used,
            MIN(used_at) as first_used
        FROM analytics
        WHERE snippet_id = ?
        "#,
    )
    .bind(snippet_id)
    .fetch_one(pool)
    .await
    .map_err(|e| AppError::Database(format!("Failed to fetch snippet analytics: {}", e)))?;

    Ok(SnippetAnalytics {
        snippet_id,
        usage_count: result.0,
        last_used: result.1,
        first_used: result.2,
    })
}

/// Get global analytics aggregated across all snippets
///
/// # Arguments
///
/// * `pool` - Database connection pool
/// * `most_used_limit` - Maximum number of most-used snippets to return (default: 10)
/// * `recent_limit` - Maximum number of recent activities to return (default: 20)
///
/// # Returns
///
/// GlobalAnalytics containing total counts, most used snippets, and recent activity
///
/// # Errors
///
/// Returns `DatabaseError` if any query fails
///
/// # Examples
///
/// ```rust,no_run
/// # use snips_lib::services::analytics::get_global_analytics;
/// # use sqlx::SqlitePool;
/// # async fn example(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
/// let analytics = get_global_analytics(pool, 10, 20).await?;
/// println!("Total usages: {}", analytics.total_usages);
/// # Ok(())
/// # }
/// ```
pub async fn get_global_analytics(
    pool: &SqlitePool,
    most_used_limit: i64,
    recent_limit: i64,
) -> Result<GlobalAnalytics, AppError> {
    // Get total snippet count
    let total_snippets: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM snippets")
        .fetch_one(pool)
        .await
        .map_err(|e| AppError::Database(format!("Failed to count snippets: {}", e)))?;

    // Get total usage count
    let total_usages: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM analytics")
        .fetch_one(pool)
        .await
        .map_err(|e| AppError::Database(format!("Failed to count analytics: {}", e)))?;

    // Get most used snippets
    let most_used_snippets = sqlx::query_as::<_, (i64, String, i64, Option<i64>)>(
        r#"
        SELECT
            s.id as snippet_id,
            s.name as snippet_name,
            COUNT(a.id) as usage_count,
            MAX(a.used_at) as last_used
        FROM snippets s
        LEFT JOIN analytics a ON s.id = a.snippet_id
        GROUP BY s.id
        HAVING COUNT(a.id) > 0
        ORDER BY usage_count DESC, last_used DESC
        LIMIT ?
        "#,
    )
    .bind(most_used_limit)
    .fetch_all(pool)
    .await
    .map_err(|e| AppError::Database(format!("Failed to fetch most used snippets: {}", e)))?
    .into_iter()
    .map(
        |(snippet_id, snippet_name, usage_count, last_used)| MostUsedSnippet {
            snippet_id,
            snippet_name,
            usage_count,
            last_used,
        },
    )
    .collect();

    // Get recent activity
    let recent_activity = sqlx::query_as::<_, (i64, String, i64)>(
        r#"
        SELECT
            s.id as snippet_id,
            s.name as snippet_name,
            a.used_at
        FROM analytics a
        JOIN snippets s ON a.snippet_id = s.id
        ORDER BY a.used_at DESC
        LIMIT ?
        "#,
    )
    .bind(recent_limit)
    .fetch_all(pool)
    .await
    .map_err(|e| AppError::Database(format!("Failed to fetch recent activity: {}", e)))?
    .into_iter()
    .map(|(snippet_id, snippet_name, used_at)| RecentActivity {
        snippet_id,
        snippet_name,
        used_at,
    })
    .collect();

    Ok(GlobalAnalytics {
        total_snippets: total_snippets.0,
        total_usages: total_usages.0,
        most_used_snippets,
        recent_activity,
    })
}

/// Clear all analytics data
///
/// # Arguments
///
/// * `pool` - Database connection pool
///
/// # Returns
///
/// Result indicating success or database error
///
/// # Examples
///
/// ```rust,no_run
/// # use snips_lib::services::analytics::clear_all_analytics;
/// # use sqlx::SqlitePool;
/// # async fn example(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
/// clear_all_analytics(pool).await?;
/// # Ok(())
/// # }
/// ```
pub async fn clear_all_analytics(pool: &SqlitePool) -> Result<(), AppError> {
    sqlx::query("DELETE FROM analytics")
        .execute(pool)
        .await
        .map_err(|e| AppError::Database(format!("Failed to clear analytics: {}", e)))?;

    Ok(())
}

/// Clear analytics data older than a specific timestamp
///
/// # Arguments
///
/// * `pool` - Database connection pool
/// * `before_timestamp` - Unix timestamp; all analytics before this will be deleted
///
/// # Returns
///
/// Number of records deleted
///
/// # Examples
///
/// ```rust,no_run
/// # use snips_lib::services::analytics::clear_analytics_before;
/// # use sqlx::SqlitePool;
/// # use std::time::{SystemTime, UNIX_EPOCH};
/// # async fn example(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
/// let thirty_days_ago = SystemTime::now()
///     .duration_since(UNIX_EPOCH)
///     .unwrap()
///     .as_secs() as i64 - (30 * 24 * 60 * 60);
/// let deleted = clear_analytics_before(pool, thirty_days_ago).await?;
/// # Ok(())
/// # }
/// ```
pub async fn clear_analytics_before(
    pool: &SqlitePool,
    before_timestamp: i64,
) -> Result<u64, AppError> {
    let result = sqlx::query("DELETE FROM analytics WHERE used_at < ?")
        .bind(before_timestamp)
        .execute(pool)
        .await
        .map_err(|e| AppError::Database(format!("Failed to clear old analytics: {}", e)))?;

    Ok(result.rows_affected())
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePoolOptions;

    async fn setup_test_db() -> SqlitePool {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .unwrap();

        // Create tables
        sqlx::query(
            r#"
            CREATE TABLE snippets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                content TEXT NOT NULL,
                description TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            r#"
            CREATE TABLE analytics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                snippet_id INTEGER NOT NULL,
                used_at INTEGER NOT NULL,
                FOREIGN KEY (snippet_id) REFERENCES snippets(id) ON DELETE CASCADE
            )
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        // Insert test snippets
        sqlx::query(
            "INSERT INTO snippets (name, content, created_at, updated_at) VALUES (?, ?, ?, ?)",
        )
        .bind("Test Snippet 1")
        .bind("Content 1")
        .bind(1000)
        .bind(1000)
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            "INSERT INTO snippets (name, content, created_at, updated_at) VALUES (?, ?, ?, ?)",
        )
        .bind("Test Snippet 2")
        .bind("Content 2")
        .bind(1000)
        .bind(1000)
        .execute(&pool)
        .await
        .unwrap();

        pool
    }

    #[tokio::test]
    async fn test_record_usage() {
        let pool = setup_test_db().await;

        let result = record_usage(&pool, 1).await;
        assert!(result.is_ok());

        // Verify the record was inserted
        let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM analytics WHERE snippet_id = 1")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(count.0, 1);
    }

    #[tokio::test]
    async fn test_get_snippet_analytics_no_usage() {
        let pool = setup_test_db().await;

        let analytics = get_snippet_analytics(&pool, 1).await.unwrap();
        assert_eq!(analytics.snippet_id, 1);
        assert_eq!(analytics.usage_count, 0);
        assert_eq!(analytics.last_used, None);
        assert_eq!(analytics.first_used, None);
    }

    #[tokio::test]
    async fn test_get_snippet_analytics_with_usage() {
        let pool = setup_test_db().await;

        // Record some usage
        record_usage(&pool, 1).await.unwrap();
        record_usage(&pool, 1).await.unwrap();

        let analytics = get_snippet_analytics(&pool, 1).await.unwrap();
        assert_eq!(analytics.snippet_id, 1);
        assert_eq!(analytics.usage_count, 2);
        assert!(analytics.last_used.is_some());
        assert!(analytics.first_used.is_some());
    }

    #[tokio::test]
    async fn test_get_global_analytics() {
        let pool = setup_test_db().await;

        // Record usage for both snippets
        record_usage(&pool, 1).await.unwrap();
        record_usage(&pool, 1).await.unwrap();
        record_usage(&pool, 1).await.unwrap();
        record_usage(&pool, 2).await.unwrap();

        let analytics = get_global_analytics(&pool, 10, 20).await.unwrap();

        assert_eq!(analytics.total_snippets, 2);
        assert_eq!(analytics.total_usages, 4);
        assert_eq!(analytics.most_used_snippets.len(), 2);
        assert_eq!(analytics.recent_activity.len(), 4);

        // Verify most used is sorted correctly (snippet 1 should be first with 3 uses)
        assert_eq!(analytics.most_used_snippets[0].snippet_id, 1);
        assert_eq!(analytics.most_used_snippets[0].usage_count, 3);
        assert_eq!(analytics.most_used_snippets[1].snippet_id, 2);
        assert_eq!(analytics.most_used_snippets[1].usage_count, 1);
    }

    #[tokio::test]
    async fn test_get_global_analytics_with_limits() {
        let pool = setup_test_db().await;

        // Record usage for both snippets
        for _ in 0..5 {
            record_usage(&pool, 1).await.unwrap();
        }
        for _ in 0..3 {
            record_usage(&pool, 2).await.unwrap();
        }

        let analytics = get_global_analytics(&pool, 1, 3).await.unwrap();

        // Should only return 1 most used snippet
        assert_eq!(analytics.most_used_snippets.len(), 1);
        // Should only return 3 recent activities (not all 8)
        assert_eq!(analytics.recent_activity.len(), 3);
    }

    #[tokio::test]
    async fn test_get_global_analytics_empty() {
        let pool = setup_test_db().await;

        let analytics = get_global_analytics(&pool, 10, 20).await.unwrap();

        assert_eq!(analytics.total_snippets, 2);
        assert_eq!(analytics.total_usages, 0);
        assert_eq!(analytics.most_used_snippets.len(), 0);
        assert_eq!(analytics.recent_activity.len(), 0);
    }
}
