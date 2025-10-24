pub mod commands;
pub mod models;
pub mod services;
pub mod utils;

use services::database::{self, DbPool};
use tauri::Manager;

// Re-export commands for use in tests and external crates
pub use commands::*;

/// Initializes the system tray with menu
fn init_system_tray(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    use tauri::{
        image::Image,
        menu::{Menu, MenuItem},
        tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    };

    // Create menu items
    let search_item = MenuItem::with_id(
        app,
        "search",
        "Search Snippets",
        true,
        Some("CmdOrCtrl+Shift+S"),
    )?;
    let quick_add_item = MenuItem::with_id(
        app,
        "quick-add",
        "Quick Add",
        true,
        Some("CmdOrCtrl+Shift+A"),
    )?;
    let management_item =
        MenuItem::with_id(app, "management", "Manage Snippets", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit", true, Some("CmdOrCtrl+Q"))?;

    // Build the menu
    let menu = Menu::with_items(
        app,
        &[&search_item, &quick_add_item, &management_item, &quit_item],
    )?;

    // Load the tray icon
    let icon_bytes = include_bytes!("../icons/icon.png");
    let icon = Image::from_bytes(icon_bytes)?;

    // Build and configure the tray icon
    let _tray = TrayIconBuilder::with_id("main-tray")
        .icon(icon)
        .menu(&menu)
        .tooltip("Snips - Snippet Manager")
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Err(e) = services::window::toggle_search_window(app) {
                    eprintln!("Failed to toggle search window: {}", e);
                }
            }
        })
        .build(app)?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(database::init_database().build())
        .setup(|app| {
            // Initialize SQLx database pool for backend queries
            let handle = app.handle().clone();
            let result = tauri::async_runtime::block_on(async move {
                match database::init_db_pool(&handle).await {
                    Ok(pool) => {
                        handle.manage(DbPool(pool));
                        Ok(())
                    }
                    Err(e) => {
                        eprintln!("Failed to initialize database pool: {}", e);
                        Err(Box::new(e) as Box<dyn std::error::Error>)
                    }
                }
            });

            // Initialize the system tray/menubar
            init_system_tray(app)?;

            // Register global shortcuts
            if let Err(e) = services::shortcuts::register_all_shortcuts(app.handle()) {
                eprintln!("Warning: Failed to register global shortcuts: {}", e);
                // Don't fail app startup if shortcuts fail to register
            }

            // Set up menu event handlers
            app.on_menu_event(move |app, event| match event.id().as_ref() {
                "search" => {
                    if let Err(e) = services::window::toggle_search_window(app) {
                        eprintln!("Failed to toggle search window: {}", e);
                    }
                }
                "quick-add" => {
                    if let Err(e) = services::window::show_quick_add_window(app) {
                        eprintln!("Failed to show quick add window: {}", e);
                    }
                }
                "management" => {
                    if let Err(e) = services::window::show_management_window(app) {
                        eprintln!("Failed to show management window: {}", e);
                    }
                }
                "quit" => {
                    app.exit(0);
                }
                _ => {}
            });

            result
        })
        .invoke_handler(tauri::generate_handler![
            commands::snippet_commands::create_snippet,
            commands::snippet_commands::get_snippet,
            commands::snippet_commands::get_all_snippets,
            commands::snippet_commands::update_snippet,
            commands::snippet_commands::delete_snippet,
            commands::search_commands::search_snippets,
            commands::window_commands::show_search_window,
            commands::window_commands::hide_search_window,
            commands::window_commands::toggle_search_window,
            commands::window_commands::show_management_window,
            commands::window_commands::show_quick_add_window,
            commands::window_commands::update_badge_count,
            commands::shortcut_commands::get_default_shortcuts,
            commands::shortcut_commands::register_custom_shortcut,
            commands::shortcut_commands::unregister_shortcut,
            commands::shortcut_commands::is_shortcut_valid,
            commands::shortcut_commands::reregister_default_shortcuts,
            commands::clipboard_commands::get_selected_text,
            commands::clipboard_commands::copy_to_clipboard
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
