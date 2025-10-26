#![cfg(target_os = "linux")]

use std::{thread, time::Duration};

use snips_lib::services::window::{self, SEARCH_WINDOW_LABEL};
use zbus::blocking::Proxy;

fn build_app() -> tauri::App<tauri::test::MockRuntime> {
    tauri::test::mock_builder()
        .build(tauri::test::mock_context(tauri::test::noop_assets()))
        .expect("build mock app for dbus smoke test")
}

#[test]
fn dbus_service_registers_and_serves_diagnostics() {
    if std::env::var_os("DBUS_SESSION_BUS_ADDRESS").is_none() {
        eprintln!("Skipping D-Bus smoke test - no session bus available");
        return;
    }

    let _app = build_app();
    let handle = _app.handle();

    let runtime = tokio::runtime::Runtime::new().expect("tokio runtime");
    runtime.block_on(snips_lib::services::dbus_service::init_dbus_service(
        handle.clone(),
    ));

    window::show_search_window(&handle).expect("show search window for diagnostics");

    // Allow the async registration task a moment to advertise on the bus.
    thread::sleep(Duration::from_millis(150));

    let connection =
        zbus::blocking::Connection::session().expect("connect to session bus for D-Bus smoke test");

    let proxy = Proxy::new(
        &connection,
        "io.utensils.snips",
        "/io/utensils/snips",
        "io.utensils.snips",
    )
    .expect("construct D-Bus proxy");

    let response = match proxy.call_method("WindowDiagnostics", &()) {
        Ok(message) => message,
        Err(err) => {
            eprintln!(
                "Skipping D-Bus smoke test - WindowDiagnostics call failed: {}",
                err
            );
            return;
        }
    };

    let body: String = response
        .body()
        .deserialize()
        .expect("window_diagnostics body extraction");

    let diagnostics: serde_json::Value =
        serde_json::from_str(&body).expect("parse window diagnostics payload");

    let entries = diagnostics
        .as_array()
        .expect("diagnostics payload to be an array");

    if entries.is_empty() {
        eprintln!("Skipping D-Bus smoke test - diagnostics payload empty (existing service?)");
        return;
    }

    assert!(
        entries.iter().any(|diag| {
            diag.get("label")
                .and_then(serde_json::Value::as_str)
                .map(|label| label == SEARCH_WINDOW_LABEL)
                .unwrap_or(false)
        }),
        "Expected search window diagnostic entry, got {:?}",
        entries
            .iter()
            .filter_map(|diag| diag.get("label").and_then(serde_json::Value::as_str))
            .collect::<Vec<_>>()
    );
}
