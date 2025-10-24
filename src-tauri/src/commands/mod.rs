pub mod clipboard_commands;
pub mod search_commands;
pub mod shortcut_commands;
pub mod snippet_commands;
pub mod window_commands;

// Re-export clipboard commands
pub use clipboard_commands::{copy_to_clipboard, get_selected_text};

// Re-export search commands
pub use search_commands::search_snippets;

// Re-export shortcut commands
pub use shortcut_commands::{
    get_default_shortcuts, is_shortcut_valid, register_custom_shortcut,
    reregister_default_shortcuts, unregister_shortcut,
};

// Re-export snippet commands
pub use snippet_commands::{
    create_snippet, delete_snippet, get_all_snippets, get_snippet, update_snippet,
};

// Re-export window commands
pub use window_commands::{
    hide_search_window, show_management_window, show_quick_add_window, show_search_window,
    toggle_search_window, update_badge_count,
};
