import { type HTMLAttributes } from 'react';

export type SurfaceLevel = 'window' | 'raised' | 'subtle';
export type SurfacePadding = 'none' | 'sm' | 'md' | 'lg';

export interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  level?: SurfaceLevel;
  padding?: SurfacePadding;
  bleed?: boolean;
}

const levelClass: Record<SurfaceLevel, string> = {
  window: 'bg-[hsl(var(--surface-window))] border border-[hsl(var(--outline-soft))] shadow-none',
  raised:
    'bg-[hsl(var(--surface-raised))] border border-[hsl(var(--outline-soft))] shadow-[0_8px_24px_rgba(0,0,0,0.24)] dark:shadow-[0_8px_28px_rgba(0,0,0,0.4)]',
  subtle: 'bg-[hsl(var(--surface-subtle))] border border-[hsl(var(--outline-soft))]',
};

const paddingClass: Record<SurfacePadding, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export function Surface({
  level = 'raised',
  padding = 'md',
  bleed = false,
  className = '',
  children,
  ...props
}: SurfaceProps) {
  const base =
    'relative rounded-[9px] text-[color:hsl(var(--text-primary))] transition-colors duration-150 ease-out';
  const bleedClass = bleed ? 'overflow-visible' : 'overflow-hidden';
  const classes = [base, levelClass[level], paddingClass[padding], bleedClass, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}
