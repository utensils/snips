/// D-Bus service for IPC communication with Snips
///
/// Provides a D-Bus interface for external applications (like Hyprland keybinds)
/// to trigger Snips actions such as showing the Quick Add window.
///
/// This is Linux-only and will not panic if D-Bus is unavailable.
#[cfg(target_os = "linux")]
use tauri::AppHandle;
#[cfg(target_os = "linux")]
use zbus::{interface, ConnectionBuilder};

#[cfg(target_os = "linux")]
use tauri::Emitter;

#[cfg(target_os = "linux")]
use crate::services::window;

/// D-Bus interface for Snips
///
/// Exposed at: io.utensils.snips
/// Object path: /io/utensils/snips
#[cfg(target_os = "linux")]
struct SnipsDBusInterface {
    app: AppHandle,
}

#[cfg(target_os = "linux")]
#[interface(name = "io.utensils.snips")]
impl SnipsDBusInterface {
    /// Show the Quick Add Snippet window
    ///
    /// This captures selected text from the PRIMARY selection and displays
    /// the Quick Add dialog.
    ///
    /// Can be called via:
    /// ```bash
    /// dbus-send --session --type=method_call \
    ///   --dest=io.utensils.snips \
    ///   /io/utensils/snips \
    ///   io.utensils.snips.ShowQuickAdd
    /// ```
    async fn show_quick_add(&self) -> zbus::fdo::Result<()> {
        eprintln!("[DEBUG] [dbus_service] ShowQuickAdd method called via D-Bus");

        match window::show_quick_add_window(&self.app) {
            Ok(()) => {
                eprintln!("[DEBUG] [dbus_service] ShowQuickAdd succeeded");
                Ok(())
            }
            Err(e) => {
                eprintln!("[ERROR] [dbus_service] ShowQuickAdd failed: {}", e);
                Err(zbus::fdo::Error::Failed(format!(
                    "Failed to show Quick Add window: {}",
                    e
                )))
            }
        }
    }

    /// Show the Search window
    async fn show_search(&self) -> zbus::fdo::Result<()> {
        eprintln!("[DEBUG] [dbus_service] ShowSearch method called via D-Bus");

        match window::show_search_window(&self.app) {
            Ok(()) => {
                eprintln!("[DEBUG] [dbus_service] ShowSearch succeeded");
                Ok(())
            }
            Err(e) => {
                eprintln!("[ERROR] [dbus_service] ShowSearch failed: {}", e);
                Err(zbus::fdo::Error::Failed(format!(
                    "Failed to show Search window: {}",
                    e
                )))
            }
        }
    }

    /// Toggle the Search window visibility
    async fn toggle_search(&self) -> zbus::fdo::Result<()> {
        eprintln!("[DEBUG] [dbus_service] ToggleSearch method called via D-Bus");

        match window::toggle_search_window(&self.app) {
            Ok(()) => {
                eprintln!("[DEBUG] [dbus_service] ToggleSearch succeeded");
                Ok(())
            }
            Err(e) => {
                eprintln!("[ERROR] [dbus_service] ToggleSearch failed: {}", e);
                Err(zbus::fdo::Error::Failed(format!(
                    "Failed to toggle Search window: {}",
                    e
                )))
            }
        }
    }

    /// Show the Management window
    async fn show_management(&self) -> zbus::fdo::Result<()> {
        eprintln!("[DEBUG] [dbus_service] ShowManagement method called via D-Bus");

        match window::show_management_window(&self.app) {
            Ok(()) => {
                eprintln!("[DEBUG] [dbus_service] ShowManagement succeeded");
                Ok(())
            }
            Err(e) => {
                eprintln!("[ERROR] [dbus_service] ShowManagement failed: {}", e);
                Err(zbus::fdo::Error::Failed(format!(
                    "Failed to show Management window: {}",
                    e
                )))
            }
        }
    }

    /// Reload the current Omarchy palette and notify all windows
    async fn reload_theme(&self) -> zbus::fdo::Result<()> {
        eprintln!("[DEBUG] [dbus_service] ReloadTheme method called via D-Bus");

        match crate::services::theme::load_omarchy_theme_palette() {
            Ok(palette) => {
                if let Err(err) = self.app.emit("appearance-updated", &palette) {
                    eprintln!(
                        "[ERROR] [dbus_service] Failed to emit appearance update: {}",
                        err
                    );
                    return Err(zbus::fdo::Error::Failed(format!(
                        "Failed to notify windows about new theme: {}",
                        err
                    )));
                }

                Ok(())
            }
            Err(e) => {
                eprintln!("[ERROR] [dbus_service] ReloadTheme failed: {}", e);
                Err(zbus::fdo::Error::Failed(format!(
                    "Failed to reload Omarchy theme: {}",
                    e
                )))
            }
        }
    }
}

/// Initialize the D-Bus service
///
/// This is safe to call - if D-Bus registration fails, the error is logged
/// but the application continues normally.
///
/// # Arguments
///
/// * `app` - The Tauri application handle
#[cfg(target_os = "linux")]
pub async fn init_dbus_service(app: AppHandle) {
    eprintln!("[DEBUG] [dbus_service] Initializing D-Bus service");

    let interface = SnipsDBusInterface { app: app.clone() };

    // Build the connection step by step, handling async properly
    let connection_result = async {
        let builder = ConnectionBuilder::session()
            .map_err(|e| format!("Failed to create session builder: {}", e))?;

        let builder = builder
            .name("io.utensils.snips")
            .map_err(|e| format!("Failed to set D-Bus name: {}", e))?;

        let builder = builder
            .serve_at("/io/utensils/snips", interface)
            .map_err(|e| format!("Failed to serve interface: {}", e))?;

        let connection = builder
            .build()
            .await
            .map_err(|e| format!("Failed to build connection: {}", e))?;

        Ok::<_, String>(connection)
    }
    .await;

    match connection_result {
        Ok(connection) => {
            eprintln!("[INFO] [dbus_service] D-Bus service registered successfully");
            eprintln!("[INFO] [dbus_service] Available at: io.utensils.snips");
            eprintln!("[INFO] [dbus_service] Object path: /io/utensils/snips");
            eprintln!(
                "[INFO] [dbus_service] Methods: ShowQuickAdd, ShowSearch, ToggleSearch, ShowManagement, ReloadTheme"
            );

            // Keep the connection alive indefinitely in a background task
            // zbus requires the connection to stay alive to process D-Bus messages
            tokio::spawn(async move {
                // Hold the connection and wait forever
                // This keeps the D-Bus service active
                std::future::pending::<()>().await;
                drop(connection); // Never reached, but explicit for clarity
            });
        }
        Err(e) => {
            eprintln!(
                "[WARN] [dbus_service] Failed to register D-Bus service: {}",
                e
            );
            eprintln!("[WARN] [dbus_service] The app will continue without D-Bus support");
            eprintln!("[WARN] [dbus_service] Global shortcuts will still work");
        }
    }
}

/// No-op for non-Linux platforms
#[cfg(not(target_os = "linux"))]
pub async fn init_dbus_service(_app: tauri::AppHandle) {
    // D-Bus is Linux-only
}
