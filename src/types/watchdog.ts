export interface ShortcutWatchdogSnapshot {
  enabled: boolean;
  monitor_running: boolean;
  last_method: string | null;
  last_window: string | null;
  last_invoked_at: string | null;
  last_latency_ms: number | null;
  last_within_deadline: boolean | null;
  success_count: number;
  deadline_miss_count: number;
  pending_count: number;
  average_latency_ms: number | null;
  last_error: string | null;
  notes: string[];
}
