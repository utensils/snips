pub mod color;
pub mod error;
pub mod time;

// Re-export for future use in commands
#[allow(unused_imports)]
pub use error::{AppError, AppResult};
