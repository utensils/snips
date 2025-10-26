pub mod analytics_commands;
pub mod clipboard_commands;
pub mod search_commands;
pub mod settings_commands;
pub mod shortcut_commands;
pub mod snippet_commands;
pub mod storage_commands;
pub mod tag_commands;
pub mod window_commands;

// Re-export analytics commands
pub use analytics_commands::{
    copy_snippets_with_analytics, get_global_analytics, get_snippet_analytics, record_snippet_usage,
};

// Re-export clipboard commands
pub use clipboard_commands::{copy_to_clipboard, get_selected_text};

// Re-export search commands
pub use search_commands::search_snippets;

// Re-export settings commands
pub use settings_commands::{
    get_settings, get_storage_type, set_storage_type, update_settings, SettingsServiceState,
};

// Re-export shortcut commands
pub use shortcut_commands::{
    get_default_shortcuts, is_shortcut_valid, register_custom_shortcut,
    reregister_default_shortcuts, unregister_shortcut,
};

// Re-export snippet commands
pub use snippet_commands::{
    create_snippet, delete_snippet, get_all_snippets, get_snippet, update_snippet,
};

// Re-export storage commands
pub use storage_commands::{
    backup_database, export_to_json, get_backup_config, get_database_stats, import_from_json,
    list_backups, restore_database, update_backup_config,
};

// Re-export tag commands
pub use tag_commands::{get_tags, update_tag_color_cmd};

// Re-export window commands
pub use window_commands::{
    hide_search_window, show_management_window, show_quick_add_window, show_search_window,
    toggle_search_window, update_badge_count,
};
