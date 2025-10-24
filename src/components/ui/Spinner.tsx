import { type HTMLAttributes, type ReactElement } from 'react';

export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: SpinnerSize;
}

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-3',
  lg: 'h-12 w-12 border-4',
};

/**
 * Reusable Spinner component for loading states
 */
export function Spinner({ size = 'md', className = '', ...props }: SpinnerProps): ReactElement {
  const classes = [
    'animate-spin rounded-full border-blue-600 border-t-transparent',
    sizeClasses[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div role="status" aria-label="Loading" className={classes} {...props}>
      <span className="sr-only">Loading...</span>
    </div>
  );
}
