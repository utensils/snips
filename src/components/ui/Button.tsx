import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from 'react';

/**
 * Button variants for different visual styles
 */
export type ButtonVariant = 'primary' | 'tonal' | 'ghost' | 'danger' | 'secondary';

/**
 * Button sizes
 */
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  children: ReactNode;
}

const variantClasses: Record<Exclude<ButtonVariant, 'secondary'>, string> = {
  primary:
    'bg-[hsl(var(--accent))] text-[color:hsl(var(--accent-foreground))] shadow-sm hover:bg-[color-mix(in_srgb,hsl(var(--accent))_85%,black)] focus-visible:ring-[hsl(var(--accent))] disabled:opacity-40 disabled:pointer-events-none',
  tonal:
    'bg-[color-mix(in_srgb,hsl(var(--accent))_18%,hsl(var(--surface-raised)))] text-[color:hsl(var(--text-primary))] border border-[hsl(var(--outline-soft))] hover:bg-[color-mix(in_srgb,hsl(var(--accent))_26%,hsl(var(--surface-raised)))] focus-visible:ring-[hsl(var(--accent))] disabled:opacity-40 disabled:pointer-events-none',
  ghost:
    'bg-transparent text-[color:hsl(var(--text-secondary))] hover:bg-[color-mix(in_srgb,hsl(var(--accent))_10%,hsl(var(--surface-subtle)))] focus-visible:ring-[hsl(var(--accent))] disabled:opacity-40 disabled:pointer-events-none',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 disabled:opacity-40 disabled:pointer-events-none',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-9 px-4 text-sm',
  lg: 'h-11 px-5 text-base',
};

/**
 * Reusable Button component with multiple variants and sizes
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      className = '',
      children,
      disabled = false,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseClasses =
      'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--surface-raised))] disabled:cursor-not-allowed';

    const normalizedVariant: Exclude<ButtonVariant, 'secondary'> =
      variant === 'secondary' ? 'tonal' : variant;

    const classes = [
      baseClasses,
      variantClasses[normalizedVariant],
      sizeClasses[size],
      fullWidth ? 'w-full' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button ref={ref} type={type} className={classes} disabled={disabled} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
