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
      'h-4 w-4 rounded border border-[hsl(var(--outline-soft))] text-[hsl(var(--color-accent-primary))]',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-accent-primary))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--surface-subtle))]',
      'transition-colors cursor-pointer bg-[hsl(var(--surface-subtle))]',
      disabled ? 'cursor-not-allowed opacity-60' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const inputElement = (
      <input
        ref={ref}
        type="checkbox"
        id={checkboxId}
        className={checkboxClasses}
        disabled={disabled}
        {...props}
      />
    );

    if (!label) {
      return inputElement;
    }

    return (
      <label
        htmlFor={checkboxId}
        className="flex cursor-pointer items-center gap-2 text-sm text-[color:hsl(var(--text-secondary))] select-none"
      >
        {inputElement}
        <span>{label}</span>
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';
