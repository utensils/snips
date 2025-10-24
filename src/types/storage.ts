/**
 * Database statistics
 */
export interface DatabaseStats {
  total_snippets: number;
  total_tags: number;
  total_analytics_records: number;
  database_size_bytes: number;
  last_backup: number | null;
}

/**
 * Backup metadata
 */
export interface BackupInfo {
  path: string;
  created_at: number;
  size_bytes: number;
}

/**
 * Export data structure for JSON format
 */
export interface ExportData {
  version: string;
  exported_at: number;
  snippets: SnippetExport[];
}

/**
 * Snippet with tags for export
 */
export interface SnippetExport {
  name: string;
  content: string;
  description: string | null;
  tags: string[];
  created_at: number;
  updated_at: number;
}

/**
 * Backup scheduler configuration
 */
export interface BackupConfig {
  enabled: boolean;
  interval_hours: number;
  max_backups: number;
}
