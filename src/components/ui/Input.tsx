import { type InputHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

/**
 * Reusable Input component with label, error, and helper text support
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      fullWidth = false,
      className = '',
      id,
      disabled = false,
      required = false,
      ...props
    },
    ref
  ) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    const baseClasses =
      'px-3 py-2 rounded-md border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-accent-primary))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--surface-raised))] placeholder:text-[color:hsl(var(--text-secondary))]';
    const stateClasses = error
      ? 'border-red-500 focus-visible:ring-red-500 text-red-600'
      : 'border-[hsl(var(--outline-soft))] hover:border-[hsl(var(--outline-strong))] text-[color:hsl(var(--text-primary))]';
    const surfaceClasses = disabled
      ? 'bg-[color-mix(in_srgb,hsl(var(--surface-subtle))_70%,transparent)] cursor-not-allowed opacity-70'
      : 'bg-[color-mix(in_srgb,hsl(var(--surface-subtle))_85%,hsl(var(--surface-raised)))]';

    const inputClasses = [
      baseClasses,
      stateClasses,
      surfaceClasses,
      fullWidth ? 'w-full' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label
            htmlFor={inputId}
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
        <input
          ref={ref}
          id={inputId}
          className={inputClasses}
          disabled={disabled}
          required={required}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
          }
          {...props}
        />
        {error ? (
          <p id={`${inputId}-error`} className="mt-1 text-sm text-red-500" role="alert">
            {error}
          </p>
        ) : helperText ? (
          <p
            id={`${inputId}-helper`}
            className="mt-1 text-sm text-[color:hsl(var(--text-secondary))]"
          >
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
