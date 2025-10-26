import { type TextareaHTMLAttributes, forwardRef } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

/**
 * Reusable Textarea component with label, error, and helper text support
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      helperText,
      fullWidth = false,
      resize = 'vertical',
      className = '',
      id,
      disabled = false,
      required = false,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    const resizeClasses: Record<Required<TextareaProps>['resize'], string> = {
      none: 'resize-none',
      vertical: 'resize-y',
      horizontal: 'resize-x',
      both: 'resize',
    };

    const baseClasses =
      'px-3 py-2 rounded-md border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-accent-primary))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--surface-raised))] placeholder:text-[color:hsl(var(--text-secondary))]';
    const stateClasses = error
      ? 'border-red-500 focus-visible:ring-red-500 text-red-600'
      : 'border-[hsl(var(--outline-soft))] hover:border-[hsl(var(--outline-strong))] text-[color:hsl(var(--text-primary))]';
    const surfaceClasses = disabled
      ? 'bg-[color-mix(in_srgb,hsl(var(--surface-subtle))_70%,transparent)] cursor-not-allowed opacity-70'
      : 'bg-[hsl(var(--surface-subtle))]';

    const textareaClasses = [
      baseClasses,
      stateClasses,
      surfaceClasses,
      resizeClasses[resize],
      fullWidth ? 'w-full' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label
            htmlFor={textareaId}
            className="mb-1 block text-sm font-medium text-[color:hsl(var(--text-secondary))]"
          >
            {label}
            {required && (
              <span className="ml-1 text-red-500" aria-label="required">
                *
              </span>
            )}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={textareaClasses}
          disabled={disabled}
          required={required}
          rows={rows}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined
          }
          {...props}
        />
        {error ? (
          <p id={`${textareaId}-error`} className="mt-1 text-sm text-red-500" role="alert">
            {error}
          </p>
        ) : helperText ? (
          <p
            id={`${textareaId}-helper`}
            className="mt-1 text-sm text-[color:hsl(var(--text-secondary))]"
          >
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
