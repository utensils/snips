/**
 * Represents a single usage event for a snippet
 */
export interface AnalyticsRecord {
  id: number;
  snippet_id: number;
  used_at: number;
}

/**
 * Analytics data for a specific snippet
 */
export interface SnippetAnalytics {
  snippet_id: number;
  usage_count: number;
  last_used: number | null;
  first_used: number | null;
}

/**
 * Information about most frequently used snippets
 */
export interface MostUsedSnippet {
  snippet_id: number;
  snippet_name: string;
  usage_count: number;
  last_used: number | null;
}

/**
 * Recent usage activity across all snippets
 */
export interface RecentActivity {
  snippet_id: number;
  snippet_name: string;
  used_at: number;
}

/**
 * Global analytics aggregated across all snippets
 */
export interface GlobalAnalytics {
  total_snippets: number;
  total_usages: number;
  most_used_snippets: MostUsedSnippet[];
  recent_activity: RecentActivity[];
}
