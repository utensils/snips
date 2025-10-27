import { invoke } from '@tauri-apps/api/core';

import type {
  Snippet,
  CreateSnippetInput,
  UpdateSnippetInput,
  SearchResult,
  SnippetAnalytics,
  GlobalAnalytics,
} from '@/types';
import type { AppSettings, StorageType } from '@/types/settings';
import type { BackupConfig, BackupInfo, DatabaseStats } from '@/types/storage';

/**
 * API client wrapper for Tauri commands
 * Provides type-safe interfaces for all backend operations
 */

// ============================================================================
// Snippet Management Commands
// ============================================================================

/**
 * Creates a new snippet
 * @param input - Snippet creation data
 * @returns The created snippet
 */
export async function createSnippet(input: CreateSnippetInput): Promise<Snippet> {
  return await invoke<Snippet>('create_snippet', { input });
}

/**
 * Retrieves a single snippet by ID
 * @param id - Snippet ID
 * @returns The requested snippet
 */
export async function getSnippet(id: number): Promise<Snippet> {
  return await invoke<Snippet>('get_snippet', { id });
}

/**
 * Retrieves all snippets
 * @returns Array of all snippets
 */
export async function getAllSnippets(): Promise<Snippet[]> {
  return await invoke<Snippet[]>('get_all_snippets');
}

/**
 * Updates an existing snippet
 * @param id - Snippet ID
 * @param input - Updated snippet data
 * @returns The updated snippet
 */
export async function updateSnippet(id: number, input: UpdateSnippetInput): Promise<Snippet> {
  return await invoke<Snippet>('update_snippet', { id, input });
}

/**
 * Deletes a snippet
 * @param id - Snippet ID
 */
export async function deleteSnippet(id: number): Promise<void> {
  await invoke<void>('delete_snippet', { id });
}

// ============================================================================
// Search Commands
// ============================================================================

/**
 * Searches snippets using full-text search
 * @param query - Search query string
 * @param limit - Optional maximum number of results
 * @returns Array of search results with relevance scoring
 */
export async function searchSnippets(query: string, limit?: number): Promise<SearchResult[]> {
  return await invoke<SearchResult[]>('search_snippets', {
    query,
    limit: limit ?? null,
  });
}

// ============================================================================
// Analytics Commands
// ============================================================================

/**
 * Records usage of a snippet for analytics
 * @param snippetId - ID of the snippet that was used
 */
export async function recordSnippetUsage(snippetId: number): Promise<void> {
  await invoke<void>('record_snippet_usage', { snippetId });
}

/**
 * Retrieves analytics for a specific snippet
 * @param snippetId - Snippet ID
 * @returns Analytics data for the snippet
 */
export async function getSnippetAnalytics(snippetId: number): Promise<SnippetAnalytics> {
  return await invoke<SnippetAnalytics>('get_snippet_analytics', { snippetId });
}

/**
 * Retrieves global analytics across all snippets
 * @param mostUsedLimit - Optional maximum number of most-used snippets to return (default: 10)
 * @param recentLimit - Optional maximum number of recent activities to return (default: 20)
 * @returns Global analytics data
 */
export async function getGlobalAnalytics(
  mostUsedLimit?: number,
  recentLimit?: number
): Promise<GlobalAnalytics> {
  return await invoke<GlobalAnalytics>('get_global_analytics', {
    mostUsedLimit: mostUsedLimit ?? null,
    recentLimit: recentLimit ?? null,
  });
}

/**
 * Copies snippets to clipboard and records usage analytics
 * This combines the copy operation with automatic usage tracking
 * The backend fetches snippet content and concatenates it before copying
 * @param snippetIds - Array of snippet IDs being copied (in desired order)
 */
export async function copySnippetsWithAnalytics(snippetIds: number[]): Promise<void> {
  await invoke<void>('copy_snippets_with_analytics', { snippetIds });
}

/**
 * Clear all analytics data
 */
export async function clearAllAnalytics(): Promise<void> {
  await invoke<void>('clear_all_analytics');
}

/**
 * Clear analytics data older than a specific timestamp
 * @param beforeTimestamp - Unix timestamp in seconds; all analytics before this will be deleted
 * @returns Number of records deleted
 */
export async function clearAnalyticsBefore(beforeTimestamp: number): Promise<number> {
  return await invoke<number>('clear_analytics_before', { beforeTimestamp });
}

/**
 * Export analytics data to JSON format
 * @returns JSON string containing all analytics data
 */
export async function exportAnalyticsToJson(): Promise<string> {
  return await invoke<string>('export_analytics_to_json');
}

// ============================================================================
// Settings Commands
// ============================================================================

/**
 * Retrieves current application settings
 * @returns Current application settings
 */
export async function getSettings(): Promise<AppSettings> {
  return await invoke<AppSettings>('get_settings');
}

/**
 * Updates application settings
 * @param settings - New settings to apply
 */
export async function updateSettings(settings: AppSettings): Promise<void> {
  await invoke<void>('update_settings', { settings });
}

/**
 * Gets the current storage type
 * @returns Current storage type
 */
export async function getStorageType(): Promise<StorageType> {
  return await invoke<StorageType>('get_storage_type');
}

/**
 * Sets the storage type
 * @param storageType - Storage type to set
 */
export async function setStorageType(storageType: StorageType): Promise<void> {
  await invoke<void>('set_storage_type', { storageType });
}

// ============================================================================
// Storage Commands
// ============================================================================

/**
 * Creates a backup of the database
 * @returns Information about the created backup
 */
export async function backupDatabase(): Promise<BackupInfo> {
  return await invoke<BackupInfo>('backup_database');
}

/**
 * Restores database from a backup file
 * @param backupPath - Path to the backup file
 */
export async function restoreDatabase(backupPath: string): Promise<void> {
  await invoke<void>('restore_database', { backupPath });
}

/**
 * Gets database statistics
 * @returns Database statistics including snippet count, size, etc.
 */
export async function getDatabaseStats(): Promise<DatabaseStats> {
  return await invoke<DatabaseStats>('get_database_stats');
}

/**
 * Exports database to JSON format
 * @param exportPath - Path where the export file should be saved
 */
export async function exportToJson(exportPath: string): Promise<void> {
  await invoke<void>('export_to_json', { exportPath });
}

/**
 * Imports snippets from JSON file
 * @param importPath - Path to the import file
 * @returns Number of snippets imported
 */
export async function importFromJson(importPath: string): Promise<number> {
  return await invoke<number>('import_from_json', { importPath });
}

/**
 * Lists all available database backups
 * @returns Array of backup information
 */
export async function listBackups(): Promise<BackupInfo[]> {
  return await invoke<BackupInfo[]>('list_backups');
}

/**
 * Gets the current backup scheduler configuration
 * @returns Backup scheduler configuration
 */
export async function getBackupConfig(): Promise<BackupConfig> {
  return await invoke<BackupConfig>('get_backup_config');
}

/**
 * Updates the backup scheduler configuration
 * @param config - New backup configuration
 */
export async function updateBackupConfig(config: BackupConfig): Promise<void> {
  await invoke<void>('update_backup_config', { config });
}

// ============================================================================
// Clipboard Commands
// ============================================================================

/**
 * Copies text to the system clipboard
 * @param text - Text to copy
 */
export async function copyToClipboard(text: string): Promise<void> {
  await invoke<void>('copy_to_clipboard', { text });
}
