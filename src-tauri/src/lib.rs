pub mod commands;
pub mod models;
pub mod services;
pub mod utils;

use services::database::{self, DbPool};
use tauri::Manager;

// Re-export commands for use in tests and external crates
pub use commands::*;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(database::init_database().build())
        .setup(|app| {
            // Initialize SQLx database pool for backend queries
            let handle = app.handle().clone();
            tauri::async_runtime::block_on(async move {
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
            })
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::snippet_commands::create_snippet,
            commands::snippet_commands::get_snippet,
            commands::snippet_commands::get_all_snippets,
            commands::snippet_commands::update_snippet,
            commands::snippet_commands::delete_snippet
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
