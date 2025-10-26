import { type ReactElement, type ReactNode } from 'react';

export type PanePadding = 'sm' | 'md' | 'lg';

export interface PaneProps {
  title?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  padding?: PanePadding;
  className?: string;
  subdued?: boolean;
}

const paddingClasses: Record<PanePadding, string> = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

/**
 * Libadwaita-inspired pane container with balanced padding and subtle rounding.
 */
export function Pane({
  title,
  description,
  footer,
  children,
  padding = 'md',
  className = '',
  subdued = false,
}: PaneProps): ReactElement {
  const containerClasses = [
    'rounded-2xl border border-border/60 shadow-sm',
    subdued ? 'bg-background/65' : 'bg-background/80',
    'supports-[backdrop-filter]:backdrop-blur-sm',
    paddingClasses[padding],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={containerClasses}>
      {(title || description) && (
        <header className="mb-4 flex flex-col gap-1">
          {title && (
            <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
          )}
          {description && (
            <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
          )}
        </header>
      )}

      <div className="space-y-4 text-sm text-foreground">{children}</div>

      {footer && (
        <footer className="mt-6 border-t border-border/50 pt-4 text-sm text-muted-foreground">
          {footer}
        </footer>
      )}
    </section>
  );
}
