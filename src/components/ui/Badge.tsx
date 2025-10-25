import { type HTMLAttributes, type ReactElement, type ReactNode } from 'react';

export type BadgeVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
  primary: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
  secondary: 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200',
  success: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
  warning: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
  danger: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-xs',
};

/**
 * Reusable Badge component for tags and labels
 */
export function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}: BadgeProps): ReactElement {
  const classes = [
    'inline-flex items-center rounded-full font-medium',
    variantClasses[variant],
    sizeClasses[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} {...props}>
      {children}
    </span>
  );
}
