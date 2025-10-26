import { type ReactElement, type ReactNode } from 'react';

export interface HeaderBarProps {
  /**
   * Optional leading content (back button, breadcrumbs, etc.).
   */
  start?: ReactNode;
  /**
   * Primary title rendered when no custom children are supplied.
   */
  title?: ReactNode;
  /**
   * Optional subtitle rendered beneath the title.
   */
  subtitle?: ReactNode;
  /**
   * Optional trailing actions (segmented buttons, search field, etc.).
   */
  end?: ReactNode;
  /**
   * Additional class names for the header container.
   */
  className?: string;
  /**
   * Hide the subtle bottom border/shadow.
   */
  borderless?: boolean;
  /**
   * Reduce vertical padding (useful inside panes/dialogs).
   */
  compact?: boolean;
  /**
   * Custom center content. When provided, `title`/`subtitle` are ignored.
   */
  children?: ReactNode;
}

/**
 * Libadwaita-inspired header bar with translucent background and balanced spacing.
 */
export function HeaderBar({
  start,
  title,
  subtitle,
  end,
  className = '',
  borderless = false,
  compact = false,
  children,
}: HeaderBarProps): ReactElement {
  const baseClasses = [
    'flex items-center gap-3 px-4',
    compact ? 'py-2 h-12' : 'py-3 h-[3.25rem]',
    'bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70',
    borderless ? '' : 'border-b border-border/60 shadow-sm',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const centerContent =
    children ??
    (title || subtitle ? (
      <div className="flex min-w-0 flex-col items-center text-center">
        {title && (
          <span className="truncate text-sm font-semibold tracking-tight text-foreground">
            {title}
          </span>
        )}
        {subtitle && <span className="truncate text-xs text-muted-foreground">{subtitle}</span>}
      </div>
    ) : null);

  return (
    <header className={baseClasses}>
      <div className="flex min-w-[3rem] shrink-0 items-center gap-2">{start}</div>

      <div className="flex min-w-0 flex-1 justify-center">{centerContent}</div>

      <div className="flex min-w-[3rem] shrink-0 items-center gap-2 justify-end">{end}</div>
    </header>
  );
}
