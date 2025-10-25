/**
 * Centralized error handling utilities for consistent error messages and logging
 */

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AppError {
  message: string;
  code?: string;
  severity: ErrorSeverity;
  details?: unknown;
}

/**
 * Custom error class for application-specific errors
 */
export class SnipsError extends Error {
  code?: string;
  severity: ErrorSeverity;
  details?: unknown;

  constructor(
    message: string,
    severity: ErrorSeverity = 'error',
    code?: string,
    details?: unknown
  ) {
    super(message);
    this.name = 'SnipsError';
    this.severity = severity;
    this.code = code;
    this.details = details;
  }
}

/**
 * Parse an unknown error into a user-friendly message
 */
export function parseError(error: unknown): AppError {
  // Handle SnipsError instances
  if (error instanceof SnipsError) {
    return {
      message: error.message,
      code: error.code,
      severity: error.severity,
      details: error.details,
    };
  }

  // Handle standard Error instances
  if (error instanceof Error) {
    return {
      message: error.message,
      severity: 'error',
    };
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      message: error,
      severity: 'error',
    };
  }

  // Handle unknown error types
  return {
    message: 'An unexpected error occurred',
    severity: 'error',
    details: error,
  };
}

/**
 * Get a user-friendly error message from a Tauri error
 */
export function getTauriErrorMessage(error: unknown): string {
  const parsed = parseError(error);

  // Check for common Tauri error patterns
  if (parsed.message.includes('Permission denied')) {
    return 'Permission denied. Please check your system permissions.';
  }

  if (parsed.message.includes('not found')) {
    return 'The requested resource was not found.';
  }

  if (parsed.message.includes('timeout')) {
    return 'The operation timed out. Please try again.';
  }

  if (parsed.message.includes('network')) {
    return 'Network error. Please check your connection.';
  }

  return parsed.message || 'An unexpected error occurred';
}

/**
 * Log an error with appropriate severity
 */
export function logError(error: unknown, context?: string): void {
  const parsed = parseError(error);
  const prefix = context ? `[${context}]` : '';

  switch (parsed.severity) {
    case 'info':
      console.warn(`${prefix} Info:`, parsed.message, parsed.details);
      break;
    case 'warning':
      console.warn(`${prefix} Warning:`, parsed.message, parsed.details);
      break;
    case 'error':
      console.error(`${prefix} Error:`, parsed.message, parsed.details);
      break;
    case 'critical':
      console.error(`${prefix} CRITICAL:`, parsed.message, parsed.details);
      break;
  }
}

/**
 * Handle an error with logging and optional user notification
 */
export function handleError(
  error: unknown,
  context?: string,
  options?: {
    showToUser?: boolean;
    onError?: (error: AppError) => void;
  }
): AppError {
  const parsed = parseError(error);
  logError(error, context);

  if (options?.showToUser && options?.onError) {
    options.onError(parsed);
  }

  return parsed;
}

/**
 * Converts technical errors into user-friendly messages
 *
 * @param error - The error object or string
 * @param context - Optional context about what was being done (e.g., "snippet", "2 snippets")
 * @returns User-friendly error message
 */
export function formatUserError(error: unknown, context?: string): string {
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Database-specific errors
  if (errorMessage.includes('no such column') || errorMessage.includes('no such table')) {
    return 'There was a problem with the database structure. Please restart the application. If the problem persists, check the application logs or reset your database.';
  }

  if (errorMessage.includes('UNIQUE constraint failed')) {
    if (errorMessage.includes('snippets.name')) {
      return 'A snippet with this name already exists. Please choose a different name.';
    }
    return 'This item already exists. Please choose a different name or identifier.';
  }

  if (errorMessage.includes('database is locked')) {
    return 'The database is currently locked. Please close any other instances of the application and try again.';
  }

  if (errorMessage.includes('readonly database') || errorMessage.includes('attempt to write')) {
    return 'The database is read-only. Please check file permissions and ensure the application has write access.';
  }

  if (errorMessage.includes('FOREIGN KEY constraint failed')) {
    return 'Cannot complete this operation because it would break data relationships. Please try again or contact support.';
  }

  if (errorMessage.includes('NOT NULL constraint failed')) {
    const fieldMatch = errorMessage.match(/snippets\.(\w+)/);
    if (fieldMatch) {
      const field = fieldMatch[1];
      return `The ${field} field is required and cannot be empty.`;
    }
    return 'A required field is missing. Please fill in all required information.';
  }

  // Network/IPC errors
  if (errorMessage.includes('Failed to invoke') || errorMessage.includes('IPC')) {
    return 'Communication with the application failed. Please restart the application and try again.';
  }

  // Permission errors
  if (errorMessage.includes('permission denied') || errorMessage.includes('EACCES')) {
    return 'Permission denied. Please check that you have the necessary permissions to perform this action.';
  }

  // File system errors
  if (errorMessage.includes('ENOENT') || errorMessage.includes('no such file')) {
    return 'A required file was not found. Please restart the application.';
  }

  if (errorMessage.includes('ENOSPC')) {
    return 'Not enough disk space. Please free up some space and try again.';
  }

  // Context-specific messages with actionable advice
  if (context) {
    const isDelete =
      errorMessage.toLowerCase().includes('delete') || context.toLowerCase().includes('delet');
    const isCreate =
      errorMessage.toLowerCase().includes('create') || context.toLowerCase().includes('creat');
    const isUpdate =
      errorMessage.toLowerCase().includes('update') || context.toLowerCase().includes('updat');

    const action = isDelete ? 'delete' : isCreate ? 'create' : isUpdate ? 'update' : 'modify';
    const advice = getActionableAdvice(errorMessage);

    return `Failed to ${action} ${context}. ${advice}`;
  }

  // Fallback to original message if it's reasonably user-friendly
  if (
    errorMessage.length < 150 &&
    !errorMessage.includes('Error:') &&
    !errorMessage.includes('at ')
  ) {
    return errorMessage;
  }

  // Last resort generic message
  return `An unexpected error occurred${context ? ` while working with ${context}` : ''}. Please try again or restart the application.`;
}

/**
 * Provides actionable advice based on error type
 */
function getActionableAdvice(errorMessage: string): string {
  if (errorMessage.includes('database') || errorMessage.includes('SQL')) {
    return 'Try restarting the application.';
  }
  if (errorMessage.includes('permission') || errorMessage.includes('access')) {
    return 'Check file permissions.';
  }
  if (errorMessage.includes('space') || errorMessage.includes('ENOSPC')) {
    return 'Free up disk space and try again.';
  }
  if (errorMessage.includes('locked')) {
    return 'Close other instances of the application.';
  }
  return 'Please try again.';
}
