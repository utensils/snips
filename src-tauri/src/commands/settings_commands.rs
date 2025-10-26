use crate::models::settings::{AppSettings, StorageType};
use crate::services::database::get_pool;
use crate::services::settings::SettingsService;
use crate::services::window;
use crate::utils::error::AppError;
use tauri::{AppHandle, Emitter, State};
use tokio::sync::Mutex;

/// State wrapper for SettingsService
pub struct SettingsServiceState(pub Mutex<Option<SettingsService>>);

/// Initialize the settings service
pub async fn init_settings_service(app: &AppHandle) -> Result<SettingsService, AppError> {
    let pool = get_pool(app)?;
    Ok(SettingsService::new(pool))
}

/// Get current application settings
#[tauri::command]
pub async fn get_settings(
    app: AppHandle,
    settings_state: State<'_, SettingsServiceState>,
) -> Result<AppSettings, String> {
    // Get or initialize settings service
    let mut service_guard = settings_state.0.lock().await;

    if service_guard.is_none() {
        let service = init_settings_service(&app)
            .await
            .map_err(|e| e.to_string())?;
        *service_guard = Some(service);
    }

    let service = service_guard.as_ref().unwrap();

    service
        .get_settings()
        .await
        .map_err(|e| format!("Failed to get settings: {}", e))
}

/// Update application settings
#[tauri::command]
pub async fn update_settings(
    app: AppHandle,
    settings: AppSettings,
    settings_state: State<'_, SettingsServiceState>,
) -> Result<(), String> {
    // Get or initialize settings service
    let mut service_guard = settings_state.0.lock().await;

    if service_guard.is_none() {
        let service = init_settings_service(&app)
            .await
            .map_err(|e| e.to_string())?;
        *service_guard = Some(service);
    }

    let service = service_guard.as_ref().unwrap();

    let updated_settings = service
        .update_settings(settings)
        .await
        .map_err(|e| format!("Failed to update settings: {}", e))?;

    window::apply_quick_window_preferences_runtime(&app);
    // Emit settings change event for live updates
    app.emit("settings-changed", &updated_settings)
        .map_err(|e| format!("Failed to emit settings change event: {}", e))?;

    Ok(())
}

/// Get storage type
#[tauri::command]
pub async fn get_storage_type(
    app: AppHandle,
    settings_state: State<'_, SettingsServiceState>,
) -> Result<StorageType, String> {
    let settings = get_settings(app, settings_state).await?;
    Ok(settings.storage_type)
}

/// Set storage type
#[tauri::command]
pub async fn set_storage_type(
    app: AppHandle,
    storage_type: StorageType,
    settings_state: State<'_, SettingsServiceState>,
) -> Result<(), String> {
    // Get current settings
    let mut settings = get_settings(app.clone(), settings_state.clone()).await?;

    // Update storage type
    settings.storage_type = storage_type;

    // Save updated settings
    update_settings(app, settings, settings_state).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::settings::Theme;

    #[test]
    fn test_storage_type_values() {
        let local = StorageType::Local;
        let git = StorageType::Git;
        let cloud = StorageType::Cloud;

        assert_ne!(local, git);
        assert_ne!(git, cloud);
        assert_ne!(local, cloud);
    }

    #[test]
    fn test_app_settings_modification() {
        let mut settings = AppSettings::default();
        assert_eq!(settings.theme, Theme::System);

        settings.theme = Theme::Dark;
        assert_eq!(settings.theme, Theme::Dark);
    }
}
