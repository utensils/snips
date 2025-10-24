use thiserror::Error;

/// Application error types
#[derive(Error, Debug)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Invalid input: {0}")]
    InvalidInput(String),

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("Duplicate entry: {0}")]
    Duplicate(String),

    #[error("SQL error: {0}")]
    Sqlx(#[from] sqlx::Error),

    #[error("Tauri SQL plugin error: {0}")]
    TauriSql(#[from] tauri_plugin_sql::Error),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("Tauri error: {0}")]
    TauriError(String),

    #[error("External process error: {0}")]
    External(String),

    #[error("Unsupported operation: {0}")]
    Unsupported(String),

    #[error("Unknown error: {0}")]
    Unknown(String),
}

/// Result type alias for application errors
#[allow(dead_code)]
pub type AppResult<T> = Result<T, AppError>;

/// Convert AppError to String for Tauri commands
impl From<AppError> for String {
    fn from(error: AppError) -> Self {
        error.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_display() {
        let error = AppError::NotFound("snippet".to_string());
        assert_eq!(error.to_string(), "Not found: snippet");
    }

    #[test]
    fn test_error_conversion_to_string() {
        let error = AppError::InvalidInput("empty name".to_string());
        let error_string: String = error.into();
        assert_eq!(error_string, "Invalid input: empty name");
    }
}
