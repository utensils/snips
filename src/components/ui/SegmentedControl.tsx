import { type ButtonHTMLAttributes, type ReactNode } from 'react';

export interface SegmentedOption {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps {
  options: SegmentedOption[];
  value: string;
  onChange?: (id: string) => void;
  ariaLabel?: string;
  className?: string;
}

export function SegmentedControl({
  options,
  value,
  onChange,
  ariaLabel,
  className = '',
}: SegmentedControlProps) {
  const groupClasses = [
    'inline-flex w-full flex-wrap gap-2 rounded-xl bg-[color-mix(in_srgb,hsl(var(--surface-subtle))_90%,transparent)] p-2',
    'border border-[hsl(var(--outline-soft))]',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div role="group" aria-label={ariaLabel} className={groupClasses}>
      {options.map((option) => (
        <SegmentedButton
          key={option.id}
          active={option.id === value}
          onSelect={() => onChange?.(option.id)}
          disabled={option.disabled}
          icon={option.icon}
        >
          <span className="text-sm font-medium leading-5">{option.label}</span>
          {option.description ? (
            <span className="text-xs leading-4 text-[color:hsl(var(--text-secondary))]">
              {option.description}
            </span>
          ) : null}
        </SegmentedButton>
      ))}
    </div>
  );
}

interface SegmentedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  onSelect?: () => void;
  icon?: ReactNode;
}

function SegmentedButton({
  active = false,
  onSelect,
  icon,
  children,
  className = '',
  ...props
}: SegmentedButtonProps) {
  const baseClasses =
    'relative flex min-h-[48px] flex-1 basis-28 flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--surface-subtle))]';
  const activeClasses =
    'bg-[color-mix(in_srgb,hsl(var(--accent))_18%,hsl(var(--surface-raised)))] text-[color:hsl(var(--text-primary))] border border-[hsl(var(--outline-strong))]';
  const inactiveClasses =
    'text-[color:hsl(var(--text-secondary))] border border-transparent hover:bg-[color-mix(in_srgb,hsl(var(--accent))_8%,hsl(var(--surface-raised)))]';

  const classes = [baseClasses, active ? activeClasses : inactiveClasses, className]
    .filter(Boolean)
    .join(' ');

  return (
    <button type="button" className={classes} onClick={onSelect} {...props}>
      {icon ? <span className="text-[color:hsl(var(--text-secondary))]">{icon}</span> : null}
      {children}
    </button>
  );
}
