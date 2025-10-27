import { type HTMLAttributes } from 'react';

export type SurfaceLevel = 'window' | 'raised' | 'subtle';
export type SurfacePadding = 'none' | 'sm' | 'md' | 'lg';
export type SurfaceOutline = 'none' | 'soft' | 'strong';
export type SurfaceElevation = 'none' | 'sm' | 'md';

export interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  level?: SurfaceLevel;
  padding?: SurfacePadding;
  outline?: SurfaceOutline;
  elevation?: SurfaceElevation;
  bleed?: boolean;
}

const levelClass: Record<SurfaceLevel, string> = {
  window: 'bg-[hsl(var(--surface-window))]',
  raised: 'bg-[hsl(var(--surface-raised))]',
  subtle: 'bg-[hsl(var(--surface-subtle))]',
};

const outlineClass: Record<SurfaceOutline, string> = {
  none: 'border border-transparent',
  soft: 'border border-[hsl(var(--outline-soft))]',
  strong: 'border border-[hsl(var(--outline-strong))]',
};

const elevationClass: Record<SurfaceElevation, string> = {
  none: 'shadow-none',
  sm: 'shadow-[0_6px_16px_rgba(0,0,0,0.12)] dark:shadow-[0_6px_18px_rgba(0,0,0,0.35)]',
  md: 'shadow-[0_12px_32px_rgba(0,0,0,0.18)] dark:shadow-[0_16px_36px_rgba(0,0,0,0.45)]',
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
  outline = 'soft',
  elevation = 'sm',
  bleed = false,
  className = '',
  children,
  ...props
}: SurfaceProps) {
  const base =
    'relative rounded-[12px] text-[color:hsl(var(--text-primary))] transition-colors duration-150 ease-out';
  const bleedClass = bleed ? 'overflow-visible' : 'overflow-hidden';
  const classes = [
    base,
    levelClass[level],
    outlineClass[outline],
    elevationClass[elevation],
    paddingClass[padding],
    bleedClass,
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
