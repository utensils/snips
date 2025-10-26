import { type HTMLAttributes } from 'react';

export interface ToolbarProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'subtle';
}

const variantClass: Record<Required<ToolbarProps>['variant'], string> = {
  default:
    'bg-[hsl(var(--surface-raised))] border-b border-[hsl(var(--outline-soft))] text-[color:hsl(var(--text-primary))]',
  subtle:
    'bg-[hsl(var(--surface-subtle))] border-b border-[hsl(var(--outline-soft))] text-[color:hsl(var(--text-secondary))]',
};

export function Toolbar({ variant = 'default', className = '', children, ...props }: ToolbarProps) {
  const classes = [
    'flex items-center gap-3 px-4 py-3 min-h-[56px]',
    variantClass[variant],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}
