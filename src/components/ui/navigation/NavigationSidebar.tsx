import { type HTMLAttributes, type ReactNode } from 'react';

export interface NavigationItem {
  id: string;
  label: string;
  icon?: ReactNode;
  active?: boolean;
  badge?: ReactNode;
  disabled?: boolean;
}

export interface NavigationSidebarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  items: NavigationItem[];
  onSelect?: (id: string) => void;
}

export function NavigationSidebar({
  items,
  onSelect,
  className = '',
  ...props
}: NavigationSidebarProps) {
  const containerClasses = [
    'flex flex-col gap-1',
    'bg-[hsl(var(--surface-subtle))]',
    'border border-[hsl(var(--outline-soft))]',
    'rounded-[9px] p-3',
    'text-[color:hsl(var(--text-secondary))]',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <nav className={containerClasses} {...props}>
      <ul className="flex flex-col gap-1">
        {items.map((item) => {
          const { id, label, icon, active, badge, disabled } = item;
          const baseItemClasses =
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[hsl(var(--accent))] focus-visible:ring-offset-[hsl(var(--surface-subtle))]';
          const stateClasses = active
            ? 'bg-[color-mix(in_srgb,hsl(var(--accent))_16%,hsl(var(--surface-subtle)))] text-[color:hsl(var(--text-primary))] border border-[hsl(var(--outline-strong))]'
            : 'text-[color:hsl(var(--text-secondary))] hover:bg-[color-mix(in_srgb,hsl(var(--accent))_8%,hsl(var(--surface-subtle)))]';
          const disabledClasses = disabled
            ? 'opacity-50 cursor-not-allowed hover:bg-transparent'
            : '';
          const itemClasses = [baseItemClasses, stateClasses, disabledClasses]
            .filter(Boolean)
            .join(' ');

          return (
            <li key={id}>
              <button
                type="button"
                className={itemClasses}
                disabled={disabled}
                onClick={() => onSelect?.(id)}
              >
                {icon ? (
                  <span className="h-4 w-4 text-[color:hsl(var(--text-secondary))]">{icon}</span>
                ) : null}
                <span className="flex-1 text-left">{label}</span>
                {badge ? <span>{badge}</span> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
