import { type ButtonHTMLAttributes, forwardRef } from 'react';

export interface ToolbarIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export const ToolbarIconButton = forwardRef<HTMLButtonElement, ToolbarIconButtonProps>(
  ({ active = false, className = '', type = 'button', ...props }, ref) => {
    const classes = [
      'inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors duration-150',
      'text-[color:hsl(var(--text-secondary))] hover:bg-[color-mix(in_srgb,hsl(var(--accent))_10%,hsl(var(--surface-subtle)))]',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--surface-raised))]',
      active
        ? 'bg-[color-mix(in_srgb,hsl(var(--accent))_18%,hsl(var(--surface-subtle)))] text-[color:hsl(var(--accent))]'
        : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return <button ref={ref} type={type} className={classes} {...props} />;
  }
);

ToolbarIconButton.displayName = 'ToolbarIconButton';
