/**
 * Storage type for snippets
 */
export type StorageType = 'local' | 'git' | 'cloud';

/**
 * Application theme
 */
export type Theme = 'light' | 'dark' | 'system';

/**
 * Window chrome preference
 */
export type WindowChromePreference = 'native' | 'frameless' | 'frameless_shadow';

export interface WindowChromeSettings {
  macos: WindowChromePreference;
  linux: WindowChromePreference;
  windows: WindowChromePreference;
}

export interface QuickWindowPreferences {
  float_on_tiling: boolean;
  per_wm_overrides: Record<string, boolean>;
}

/**
 * Conflict resolution strategy for sync operations
 */
export type ConflictResolutionStrategy = 'last_write_wins' | 'keep_both' | 'ask_user';

/**
 * Global keyboard shortcuts configuration
 */
export interface GlobalShortcuts {
  quick_add: string;
  search_select: string;
}

/**
 * Search settings configuration
 */
export interface SearchSettings {
  max_results: number;
  enable_fuzzy_search: boolean;
  search_in_tags: boolean;
  /** Weight for text relevance in search ranking (default: 10.0) */
  weight_text_relevance: number;
  /** Weight for usage frequency in search ranking (default: 2.0) */
  weight_usage_frequency: number;
  /** Weight for recency in search ranking (default: 1.0) */
  weight_recency: number;
}

/**
 * Privacy settings configuration
 */
export interface PrivacySettings {
  enable_analytics: boolean;
  track_usage: boolean;
}

/**
 * Cloud sync settings configuration
 */
export interface CloudSyncSettings {
  auto_sync_enabled: boolean;
  sync_interval_minutes: number;
  conflict_resolution: ConflictResolutionStrategy;
}

/**
 * Application settings
 */
export interface AppSettings {
  storage_type: StorageType;
  theme: Theme;
  global_shortcuts: GlobalShortcuts;
  search_settings: SearchSettings;
  privacy_settings: PrivacySettings;
  window_chrome: WindowChromeSettings;
  quick_window_preferences: QuickWindowPreferences;
  cloud_sync_settings?: CloudSyncSettings;
}

/**
 * Sync status information
 */
export interface SyncStatus {
  is_syncing: boolean;
  last_sync_at?: number;
  error?: string;
}

/**
 * Git sync result
 */
export interface GitSyncResult {
  success: boolean;
  commits_pulled: number;
  commits_pushed: number;
  conflicts: string[];
  timestamp: number;
}

/**
 * Git status information
 */
export interface GitStatus {
  is_initialized: boolean;
  branch?: string;
  has_uncommitted_changes: boolean;
  ahead: number;
  behind: number;
}

/**
 * Conflict information
 */
export interface ConflictInfo {
  snippet_id: number;
  snippet_name: string;
  conflict_type: string;
}

/**
 * Cloud sync result
 */
export interface CloudSyncResult {
  pushed: number;
  pulled: number;
  conflicts: ConflictInfo[];
  timestamp: number;
}

/**
 * Cloud sync status
 */
export interface CloudSyncStatus {
  is_authenticated: boolean;
  last_sync?: number;
  pending_changes: number;
  sync_enabled: boolean;
}

/**
 * Cloud account information
 */
export interface CloudAccountInfo {
  email: string;
  created_at: number;
  total_snippets: number;
  storage_used_bytes: number;
}

/**
 * Authentication token
 */
export interface AuthToken {
  token: string;
  expires_at: number;
}
