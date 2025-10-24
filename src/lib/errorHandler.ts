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
