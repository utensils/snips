use crate::models::analytics::{GlobalAnalytics, SnippetAnalytics};
use crate::services::analytics;
use crate::services::database::get_pool;
use tauri::AppHandle;

/// Record a snippet usage event (M1)
///
/// # Arguments
///
/// * `app` - Application handle for accessing database pool
/// * `snippet_id` - ID of the snippet being used
///
/// # Returns
///
/// Result indicating success or error message
///
/// # Examples
///
/// ```typescript
/// await invoke('record_snippet_usage', { snippetId: 42 });
/// ```
#[tauri::command]
pub async fn record_snippet_usage(app: AppHandle, snippet_id: i64) -> Result<(), String> {
    let pool = get_pool(&app).map_err(|e| e.to_string())?;
    analytics::record_usage(&pool, snippet_id)
        .await
        .map_err(|e| e.to_string())
}

/// Get analytics data for a specific snippet (M2)
///
/// # Arguments
///
/// * `app` - Application handle for accessing database pool
/// * `snippet_id` - ID of the snippet to get analytics for
///
/// # Returns
///
/// SnippetAnalytics containing usage count, last used, and first used timestamps
///
/// # Examples
///
/// ```typescript
/// const analytics = await invoke('get_snippet_analytics', { snippetId: 42 });
/// console.log(`Usage count: ${analytics.usage_count}`);
/// ```
#[tauri::command]
pub async fn get_snippet_analytics(
    app: AppHandle,
    snippet_id: i64,
) -> Result<SnippetAnalytics, String> {
    let pool = get_pool(&app).map_err(|e| e.to_string())?;
    analytics::get_snippet_analytics(&pool, snippet_id)
        .await
        .map_err(|e| e.to_string())
}

/// Get global analytics aggregated across all snippets (M3)
///
/// # Arguments
///
/// * `app` - Application handle for accessing database pool
/// * `most_used_limit` - Optional maximum number of most-used snippets to return (default: 10)
/// * `recent_limit` - Optional maximum number of recent activities to return (default: 20)
///
/// # Returns
///
/// GlobalAnalytics containing total counts, most used snippets, and recent activity
///
/// # Examples
///
/// ```typescript
/// const analytics = await invoke('get_global_analytics', {
///   mostUsedLimit: 5,
///   recentLimit: 10
/// });
/// console.log(`Total usages: ${analytics.total_usages}`);
/// ```
#[tauri::command]
pub async fn get_global_analytics(
    app: AppHandle,
    most_used_limit: Option<i64>,
    recent_limit: Option<i64>,
) -> Result<GlobalAnalytics, String> {
    let pool = get_pool(&app).map_err(|e| e.to_string())?;
    let most_used = most_used_limit.unwrap_or(10);
    let recent = recent_limit.unwrap_or(20);

    analytics::get_global_analytics(&pool, most_used, recent)
        .await
        .map_err(|e| e.to_string())
}

/// Copy snippets to clipboard and record usage analytics (M4)
///
/// This command combines clipboard operations with usage tracking.
/// It records analytics for each snippet being copied.
///
/// # Arguments
///
/// * `app` - Application handle for accessing database pool
/// * `snippet_ids` - Vector of snippet IDs being copied
/// * `text` - The concatenated text to copy to clipboard
///
/// # Returns
///
/// Result indicating success or error message
///
/// # Examples
///
/// ```typescript
/// await invoke('copy_snippets_with_analytics', {
///   snippetIds: [1, 2, 3],
///   text: 'combined snippet content'
/// });
/// ```
#[tauri::command]
pub async fn copy_snippets_with_analytics(
    app: AppHandle,
    snippet_ids: Vec<i64>,
    text: String,
) -> Result<(), String> {
    // First copy to clipboard
    use crate::commands::clipboard_commands::copy_to_clipboard;
    copy_to_clipboard(app.clone(), text).await?;

    // Then record analytics for each snippet
    let pool = get_pool(&app).map_err(|e| e.to_string())?;
    for snippet_id in snippet_ids {
        // Continue recording even if one fails
        if let Err(e) = analytics::record_usage(&pool, snippet_id).await {
            eprintln!(
                "Warning: Failed to record usage for snippet {}: {}",
                snippet_id, e
            );
        }
    }

    Ok(())
}

/// Clear all analytics data (Z8)
///
/// # Arguments
///
/// * `app` - Application handle for accessing database pool
///
/// # Returns
///
/// Result indicating success or error message
///
/// # Examples
///
/// ```typescript
/// await invoke('clear_all_analytics');
/// ```
#[tauri::command]
pub async fn clear_all_analytics(app: AppHandle) -> Result<(), String> {
    let pool = get_pool(&app).map_err(|e| e.to_string())?;
    analytics::clear_all_analytics(&pool)
        .await
        .map_err(|e| e.to_string())
}

/// Clear analytics data older than a specific timestamp (Z8)
///
/// # Arguments
///
/// * `app` - Application handle for accessing database pool
/// * `before_timestamp` - Unix timestamp; all analytics before this will be deleted
///
/// # Returns
///
/// Number of records deleted
///
/// # Examples
///
/// ```typescript
/// const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
/// const deleted = await invoke('clear_analytics_before', {
///   beforeTimestamp: Math.floor(thirtyDaysAgo / 1000)
/// });
/// ```
#[tauri::command]
pub async fn clear_analytics_before(app: AppHandle, before_timestamp: i64) -> Result<u64, String> {
    let pool = get_pool(&app).map_err(|e| e.to_string())?;
    analytics::clear_analytics_before(&pool, before_timestamp)
        .await
        .map_err(|e| e.to_string())
}

/// Export analytics data to JSON format (Z7)
///
/// # Arguments
///
/// * `app` - Application handle for accessing database pool
///
/// # Returns
///
/// JSON string containing all analytics data
///
/// # Examples
///
/// ```typescript
/// const analyticsJson = await invoke('export_analytics_to_json');
/// ```
#[tauri::command]
pub async fn export_analytics_to_json(app: AppHandle) -> Result<String, String> {
    let pool = get_pool(&app).map_err(|e| e.to_string())?;

    // Fetch all analytics records
    let records = sqlx::query_as::<_, (i64, i64, i64)>(
        "SELECT id, snippet_id, used_at FROM analytics ORDER BY used_at DESC",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| format!("Failed to fetch analytics: {}", e))?;

    // Convert to JSON
    let json_records: Vec<serde_json::Value> = records
        .into_iter()
        .map(|(id, snippet_id, used_at)| {
            serde_json::json!({
                "id": id,
                "snippet_id": snippet_id,
                "used_at": used_at
            })
        })
        .collect();

    serde_json::to_string_pretty(&json_records).map_err(|e| format!("Failed to serialize: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;

    // Note: Integration tests would require a full Tauri app context
    // Unit tests for the underlying service functions are in services/analytics.rs
    // These command functions are thin wrappers that handle app state and error conversion

    #[test]
    fn test_command_exports() {
        // Verify command functions are properly exported
        // This is a compile-time check
        let _f1: fn(AppHandle, i64) -> _ = record_snippet_usage;
        let _f2: fn(AppHandle, i64) -> _ = get_snippet_analytics;
        let _f3: fn(AppHandle, Option<i64>, Option<i64>) -> _ = get_global_analytics;
    }
}
