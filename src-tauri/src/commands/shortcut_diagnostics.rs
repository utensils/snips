#[cfg(not(target_os = "linux"))]
use serde::Serialize;

#[cfg(target_os = "linux")]
pub use crate::services::dbus_watchdog::WatchdogSnapshot;

#[cfg(not(target_os = "linux"))]
#[derive(Debug, Clone, Serialize, Default)]
pub struct WatchdogSnapshot {
    pub enabled: bool,
    pub monitor_running: bool,
    pub last_method: Option<String>,
    pub last_window: Option<String>,
    pub last_invoked_at: Option<String>,
    pub last_latency_ms: Option<u128>,
    pub last_within_deadline: Option<bool>,
    pub success_count: u64,
    pub deadline_miss_count: u64,
    pub pending_count: usize,
    pub average_latency_ms: Option<f64>,
    pub last_error: Option<String>,
    pub notes: Vec<String>,
}

#[cfg(not(target_os = "linux"))]
impl WatchdogSnapshot {
    fn disabled() -> Self {
        Self {
            enabled: false,
            notes: vec!["Hyprland shortcut watchdog is only available on Linux builds.".into()],
            ..Self::default()
        }
    }
}

/// Return the current snapshot of the Hyprland shortcut watchdog.
#[tauri::command]
pub async fn get_shortcut_watchdog() -> Result<WatchdogSnapshot, String> {
    #[cfg(target_os = "linux")]
    {
        Ok(crate::services::dbus_watchdog::diagnostics_snapshot())
    }

    #[cfg(not(target_os = "linux"))]
    {
        Ok(WatchdogSnapshot::disabled())
    }
}
