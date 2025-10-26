//! Hyprland D-Bus watchdog for validating compositor-triggered shortcuts.
//!
//! This module is Linux-only and activates when we detect a Hyprland session.
//! It spawns a lightweight `dbus-monitor` process that listens for method calls
//! to the Snips D-Bus interface and measures the latency between the external
//! invocation and the moment our window focus loop reports success.
//!
//! The collected metrics are surfaced through the `get_shortcut_watchdog`
//! Tauri command so that the Settings UI can display diagnostic information.

use once_cell::sync::OnceCell;
use serde::Serialize;
use std::{
    collections::{HashMap, VecDeque},
    process::Stdio,
    sync::RwLock,
    time::{Duration, Instant},
};
use tauri::AppHandle;
use time::{format_description::well_known::Rfc3339, OffsetDateTime};
use tokio::{
    io::{AsyncBufReadExt, BufReader},
    process::Command,
};

use super::window::{
    MANAGEMENT_WINDOW_LABEL, QUICK_ADD_WINDOW_LABEL, SEARCH_WINDOW_LABEL, SETTINGS_WINDOW_LABEL,
};

const DEADLINE: Duration = Duration::from_millis(200);
const MAX_SAMPLES: usize = 50;

#[derive(Debug, Default)]
struct WatchdogState {
    enabled: bool,
    monitor_running: bool,
    last_error: Option<String>,
    last_method: Option<String>,
    last_window: Option<String>,
    last_invoked_at: Option<OffsetDateTime>,
    last_latency_ms: Option<u128>,
    last_within_deadline: Option<bool>,
    success_count: u64,
    deadline_miss_count: u64,
    pending: HashMap<String, Instant>,
    latencies: VecDeque<u128>,
    notes: Vec<String>,
}

static STATE: OnceCell<RwLock<WatchdogState>> = OnceCell::new();

fn state_handle() -> &'static RwLock<WatchdogState> {
    STATE.get_or_init(|| RwLock::new(WatchdogState::default()))
}

fn method_to_window(method: &str) -> Option<&'static str> {
    match method {
        "ShowQuickAdd" => Some(QUICK_ADD_WINDOW_LABEL),
        "ShowSearch" | "ToggleSearch" => Some(SEARCH_WINDOW_LABEL),
        "ShowManagement" => Some(MANAGEMENT_WINDOW_LABEL),
        "ReloadTheme" => Some(SETTINGS_WINDOW_LABEL),
        _ => None,
    }
}

fn should_enable_watchdog() -> bool {
    if std::env::var_os("SNIPS_DISABLE_DBUS_WATCHDOG").is_some() {
        return false;
    }

    if std::env::var_os("HYPRLAND_INSTANCE_SIGNATURE").is_none() {
        return false;
    }

    true
}

fn record_note(note: String) {
    if let Ok(mut guard) = state_handle().write() {
        guard.notes.push(note);
        while guard.notes.len() > 10 {
            guard.notes.remove(0);
        }
    }
}

/// Attempt to spawn `dbus-monitor` and monitor Hyprland keybind latency.
pub fn start_watchdog(app: &AppHandle) {
    if !should_enable_watchdog() {
        let mut guard = state_handle()
            .write()
            .expect("watchdog state lock poisoned");
        guard.enabled = false;
        guard
            .notes
            .push("Hyprland D-Bus watchdog disabled (environment did not request it)".into());
        return;
    }

    {
        let mut guard = state_handle()
            .write()
            .expect("watchdog state lock poisoned");
        guard.enabled = true;
        guard.last_error = None;
    }

    // Ensure `dbus-monitor` exists up-front so we can provide a friendly note.
    if std::process::Command::new("dbus-monitor")
        .arg("--version")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .is_err()
    {
        let mut guard = state_handle()
            .write()
            .expect("watchdog state lock poisoned");
        guard.last_error =
            Some("dbus-monitor not available on PATH; Hyprland shortcut watchdog disabled".into());
        guard.monitor_running = false;
        return;
    }

    tauri::async_runtime::spawn(async move {
        if let Err(err) = run_monitor_loop().await {
            let mut guard = state_handle()
                .write()
                .expect("watchdog state lock poisoned");
            guard.last_error = Some(format!("dbus-monitor exited: {}", err));
            guard.monitor_running = false;
        }
    });

    record_note("Hyprland shortcut watchdog initialized; monitoring dbus-monitor stream".into());

    // Keep the application handle alive in this scope.
    let _ = app;
}

async fn run_monitor_loop() -> Result<(), String> {
    let mut command = Command::new("dbus-monitor");
    command
        .arg("--session")
        .arg("type='method_call',destination='io.utensils.snips'")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = command
        .spawn()
        .map_err(|err| format!("failed to spawn dbus-monitor: {}", err))?;

    {
        let mut guard = state_handle()
            .write()
            .map_err(|_| "state lock poisoned".to_string())?;
        guard.monitor_running = true;
        guard.last_error = None;
    }

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "dbus-monitor stdout unavailable".to_string())?;

    let mut reader = BufReader::new(stdout).lines();
    while let Some(line) = reader
        .next_line()
        .await
        .map_err(|err| format!("dbus-monitor read error: {}", err))?
    {
        if let Some(method_name) = extract_method(&line) {
            if let Some(label) = method_to_window(method_name) {
                let mut guard = state_handle()
                    .write()
                    .map_err(|_| "state lock poisoned".to_string())?;
                guard.last_method = Some(method_name.to_string());
                guard.last_window = Some(label.to_string());
                guard.last_invoked_at = Some(OffsetDateTime::now_utc());
                guard.pending.insert(label.to_string(), Instant::now());
            }
        }
    }

    let status = child
        .wait()
        .await
        .map_err(|err| format!("failed to wait for dbus-monitor: {}", err))?;

    {
        let mut guard = state_handle()
            .write()
            .map_err(|_| "state lock poisoned".to_string())?;
        guard.monitor_running = false;
        if !status.success() {
            guard.last_error = Some(format!(
                "dbus-monitor exited with status: {}",
                status.code().unwrap_or(-1)
            ));
        }
    }

    Ok(())
}

fn extract_method(line: &str) -> Option<&str> {
    if !line.starts_with("method call") {
        return None;
    }

    line.split_whitespace()
        .find_map(|token| token.strip_prefix("member="))
        .map(|member| member.trim_matches(|c| c == '"' || c == '\'' || c == ';'))
}

/// Notify the watchdog that a window focus attempt has completed.
pub fn record_focus_outcome(label: &str, success: bool) {
    let now = Instant::now();
    let mut guard = state_handle()
        .write()
        .expect("watchdog state lock poisoned");

    if !guard.enabled {
        return;
    }

    if let Some(start) = guard.pending.remove(label) {
        let latency = now.saturating_duration_since(start).as_millis();
        let within_deadline = latency <= DEADLINE.as_millis() && success;

        guard.last_latency_ms = Some(latency);
        guard.last_within_deadline = Some(within_deadline);
        guard.last_window = Some(label.to_string());
        guard.last_invoked_at = Some(OffsetDateTime::now_utc());

        if within_deadline {
            guard.success_count = guard.success_count.saturating_add(1);
        } else {
            guard.deadline_miss_count = guard.deadline_miss_count.saturating_add(1);
        }

        guard.latencies.push_back(latency);
        if guard.latencies.len() > MAX_SAMPLES {
            guard.latencies.pop_front();
        }
    }
}

/// Snapshot of the current watchdog diagnostics for Settings UI consumption.
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

pub fn diagnostics_snapshot() -> WatchdogSnapshot {
    let guard = state_handle().read().expect("watchdog state lock poisoned");

    if !guard.enabled {
        return WatchdogSnapshot {
            enabled: false,
            notes: guard.notes.clone(),
            last_error: guard.last_error.clone(),
            ..WatchdogSnapshot::default()
        };
    }

    let average = if guard.latencies.is_empty() {
        None
    } else {
        let sum: u128 = guard.latencies.iter().copied().sum();
        let avg = sum as f64 / guard.latencies.len() as f64;
        Some(avg)
    };

    WatchdogSnapshot {
        enabled: true,
        monitor_running: guard.monitor_running,
        last_method: guard.last_method.clone(),
        last_window: guard.last_window.clone(),
        last_invoked_at: guard
            .last_invoked_at
            .map(|dt| dt.format(&Rfc3339).unwrap_or_else(|_| dt.to_string())),
        last_latency_ms: guard.last_latency_ms,
        last_within_deadline: guard.last_within_deadline,
        success_count: guard.success_count,
        deadline_miss_count: guard.deadline_miss_count,
        pending_count: guard.pending.len(),
        average_latency_ms: average,
        last_error: guard.last_error.clone(),
        notes: guard.notes.clone(),
    }
}
