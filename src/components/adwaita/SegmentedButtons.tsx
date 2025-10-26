import { type ReactElement, type ReactNode } from 'react';

export type SegmentedButtonSize = 'sm' | 'md';

export interface SegmentedButtonOption<T extends string | number> {
  id: T;
  label: string;
  icon?: ReactNode;
  tooltip?: string;
  disabled?: boolean;
}

export interface SegmentedButtonsProps<T extends string | number> {
  options: Array<SegmentedButtonOption<T>>;
  value: T;
  onChange: (value: T) => void;
  size?: SegmentedButtonSize;
  ariaLabel?: string;
  className?: string;
  fullWidth?: boolean;
}

const sizeMap: Record<SegmentedButtonSize, string> = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-3.5 py-1.5 text-sm',
};

const radiusClasses = (index: number, lastIndex: number): string => {
  if (index === 0 && index === lastIndex) {
    return 'rounded-xl';
  }
  if (index === 0) {
    return 'rounded-l-xl';
  }
  if (index === lastIndex) {
    return 'rounded-r-xl';
  }
  return '';
};

/**
 * Accessible segmented button group styled to mimic Libadwaita controls.
 */
export function SegmentedButtons<T extends string | number>({
  options,
  value,
  onChange,
  size = 'md',
  ariaLabel,
  className = '',
  fullWidth = false,
}: SegmentedButtonsProps<T>): ReactElement {
  const containerClasses = [
    'inline-flex overflow-hidden rounded-2xl border border-border/60 bg-background/70 supports-[backdrop-filter]:backdrop-blur-sm p-1',
    fullWidth ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div role="group" aria-label={ariaLabel} className={containerClasses}>
      {options.map((option, index) => {
        const isActive = option.id === value;
        const lastIndex = options.length - 1;
        const buttonClasses = [
          'relative inline-flex items-center gap-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60',
          sizeMap[size],
          radiusClasses(index, lastIndex),
          isActive
            ? 'bg-background text-foreground shadow-sm border border-border/60'
            : 'text-muted-foreground hover:bg-background/60',
          fullWidth ? 'flex-1 justify-center' : 'justify-center',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <button
            key={String(option.id)}
            type="button"
            className={buttonClasses}
            disabled={option.disabled}
            aria-pressed={isActive}
            title={option.tooltip}
            onClick={() => {
              if (!option.disabled && option.id !== value) {
                onChange(option.id);
              }
            }}
          >
            {option.icon && <span className="text-base">{option.icon}</span>}
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
