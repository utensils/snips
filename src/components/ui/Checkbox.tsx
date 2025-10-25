import { type InputHTMLAttributes, forwardRef } from 'react';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

/**
 * Reusable Checkbox component
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className = '', id, disabled = false, ...props }, ref) => {
    const checkboxId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    const checkboxClasses = [
      'h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-500',
      'focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'transition-colors cursor-pointer',
      'dark:bg-gray-700',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    if (!label) {
      return (
        <input
          ref={ref}
          type="checkbox"
          id={checkboxId}
          className={checkboxClasses}
          disabled={disabled}
          {...props}
        />
      );
    }

    return (
      <div className="flex items-center">
        <input
          ref={ref}
          type="checkbox"
          id={checkboxId}
          className={checkboxClasses}
          disabled={disabled}
          {...props}
        />
        <label
          htmlFor={checkboxId}
          className="ml-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none"
        >
          {label}
        </label>
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
