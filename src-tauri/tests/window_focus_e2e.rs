//! End-to-end window diagnostics tests backed by Tauri's mock runtime.
//!
//! These tests exercise the on-demand window creation path we rely on for
//! Wayland/Hyprland builds. We verify that the diagnostic snapshots we expose
//! through `window_diagnostics` reflect the visibility/focus/always-on-top
//! expectations after each user-visible command in the usual workflow.

use snips_lib::models::settings::QuickWindowPreferences;
use snips_lib::services::window::{
    collect_window_diagnostics, hide_quick_add_window, hide_search_window, show_search_window,
    show_settings_window, toggle_search_window, update_quick_window_preferences, WindowDiagnostic,
    QUICK_ADD_WINDOW_LABEL, SEARCH_WINDOW_LABEL, SETTINGS_WINDOW_LABEL,
};

fn build_mock_app() -> tauri::App<tauri::test::MockRuntime> {
    tauri::test::mock_builder()
        .build(tauri::test::mock_context(tauri::test::noop_assets()))
        .expect("mock app build")
}

fn find_diag<'a>(diags: &'a [WindowDiagnostic], label: &str) -> &'a WindowDiagnostic {
    diags
        .iter()
        .find(|diag| diag.label == label)
        .unwrap_or_else(|| panic!("missing window diagnostic for label {label}"))
}

#[test]
fn window_sequence_reports_expected_visibility() {
    // Ensure the focus heuristics take the Hyprland code path so we exercise the
    // compositor-aware configuration (always-on-top windows).
    std::env::set_var("HYPRLAND_INSTANCE_SIGNATURE", "snips-test");
    std::env::set_var("SNIPS_ASSUME_PROFILE_TOP", "1");
    std::env::set_var("SNIPS_ASSUME_WINDOW_VISIBILITY", "1");
    std::env::set_var("SNIPS_METRICS", "1");
    snips_lib::services::window::reset_focus_metrics_for_tests();
    update_quick_window_preferences(QuickWindowPreferences::default());

    let app = build_mock_app();
    let handle = app.handle();

    // 1. Show search window and assert diagnostics.
    show_search_window(&handle).expect("show search");
    let diagnostics = collect_window_diagnostics(&handle);
    let search_diag = find_diag(&diagnostics, SEARCH_WINDOW_LABEL);
    assert_eq!(search_diag.is_visible, Some(true));
    assert_eq!(search_diag.always_on_top, true);
    assert_eq!(search_diag.always_on_top_expected, Some(true));
    assert_eq!(search_diag.focus_success_total, Some(0));
    assert!(
        matches!(search_diag.focus_failure_total, Some(val) if val >= 1),
        "expected at least one recorded focus failure for search window"
    );
    let search_attempts = search_diag
        .focus_attempts
        .expect("search window focus attempts recorded");
    assert!(
        search_attempts <= 5,
        "search window took more than five focus attempts"
    );
    assert!(
        search_diag.focus_success.is_some(),
        "search window focus result missing"
    );

    // 2. Show settings window, ensure both search and settings are tracked.
    show_settings_window(&handle).expect("show settings");
    let diagnostics = collect_window_diagnostics(&handle);
    let settings_diag = find_diag(&diagnostics, SETTINGS_WINDOW_LABEL);
    assert_eq!(settings_diag.is_visible, Some(true));
    assert!(settings_diag.focus_attempts.unwrap_or(0) <= 5);
    assert_eq!(settings_diag.always_on_top, false);
    assert_eq!(settings_diag.always_on_top_expected, Some(false));
    assert!(
        matches!(settings_diag.focus_failure_total, Some(val) if val >= 1),
        "expected at least one recorded focus failure for settings window"
    );

    // 3. Show the quick add window via the service helpers to avoid clipboard
    //    dependencies in the unit test environment.
    let quick_add = snips_lib::services::window::get_or_create_quick_add_window(&handle)
        .expect("create quick add");
    snips_lib::services::window::center_window(&quick_add).expect("center quick add");
    snips_lib::services::window::show_window(&quick_add).expect("show quick add");

    let diagnostics = collect_window_diagnostics(&handle);
    let quick_add_diag = find_diag(&diagnostics, QUICK_ADD_WINDOW_LABEL);
    assert_eq!(quick_add_diag.is_visible, Some(true));
    let quick_add_attempts = quick_add_diag
        .focus_attempts
        .expect("quick add focus attempts recorded");
    assert!(
        quick_add_attempts <= 5,
        "quick add window took more than five focus attempts"
    );
    assert!(
        quick_add_diag.focus_success.is_some(),
        "quick add window focus result missing"
    );
    assert_eq!(quick_add_diag.always_on_top_expected, Some(true));
    assert!(
        matches!(quick_add_diag.focus_failure_total, Some(val) if val >= 1),
        "expected at least one recorded focus failure for quick add window"
    );

    // 4. Hide quick add and search windows, ensure visibility flags update.
    hide_quick_add_window(&handle).expect("hide quick add");
    hide_search_window(&handle).expect("hide search");
    let diagnostics = collect_window_diagnostics(&handle);
    let quick_add_diag = find_diag(&diagnostics, QUICK_ADD_WINDOW_LABEL);
    assert_eq!(quick_add_diag.visibility_expected, Some(false));
    let search_diag = find_diag(&diagnostics, SEARCH_WINDOW_LABEL);
    assert_eq!(search_diag.visibility_expected, Some(false));

    if let Some(metrics) = snips_lib::services::metrics::gather_metrics() {
        assert!(metrics.contains("snips_window_focus_attempts_total"));
        assert!(
            metrics.contains("result=\"success\"") || metrics.contains("result=\"failure\""),
            "expected focus metrics to record at least one result variant"
        );
    }

    std::env::remove_var("HYPRLAND_INSTANCE_SIGNATURE");
    std::env::remove_var("SNIPS_ASSUME_PROFILE_TOP");
    std::env::remove_var("SNIPS_ASSUME_WINDOW_VISIBILITY");
    std::env::remove_var("SNIPS_METRICS");
}

#[test]
fn toggle_search_window_creates_and_shows_on_first_call() {
    std::env::set_var("HYPRLAND_INSTANCE_SIGNATURE", "snips-test-toggle");
    std::env::set_var("SNIPS_ASSUME_PROFILE_TOP", "1");
    std::env::set_var("SNIPS_ASSUME_WINDOW_VISIBILITY", "1");
    snips_lib::services::window::reset_focus_metrics_for_tests();

    let app = build_mock_app();
    let handle = app.handle();

    toggle_search_window(&handle).expect("toggle should create and show search window");
    let diagnostics = collect_window_diagnostics(&handle);
    let search_diag = find_diag(&diagnostics, SEARCH_WINDOW_LABEL);
    assert_eq!(search_diag.is_visible, Some(true));

    toggle_search_window(&handle).expect("toggle should hide search window");
    let diagnostics = collect_window_diagnostics(&handle);
    let search_diag = find_diag(&diagnostics, SEARCH_WINDOW_LABEL);
    assert_eq!(search_diag.is_visible, Some(false));

    std::env::remove_var("HYPRLAND_INSTANCE_SIGNATURE");
    std::env::remove_var("SNIPS_ASSUME_PROFILE_TOP");
    std::env::remove_var("SNIPS_ASSUME_WINDOW_VISIBILITY");
}

#[cfg(target_os = "linux")]
#[test]
fn show_quick_add_window_handles_empty_selection() {
    let app = build_mock_app();
    let handle = app.handle();

    let result = snips_lib::services::window::show_quick_add_window(&handle);
    assert!(
        result.is_ok(),
        "quick add window should surface error banner without failing D-Bus"
    );
}
