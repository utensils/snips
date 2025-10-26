import { type HTMLAttributes, type ReactElement, type ReactNode } from 'react';

import { getTextColor } from '@/lib/color';

export type BadgeVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  /**
   * Custom background color (hex). When provided, automatically calculates text color for contrast.
   * Overrides variant prop.
   */
  color?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-800',
  primary: 'bg-blue-100 text-blue-800',
  secondary: 'bg-gray-200 text-gray-700',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  danger: 'bg-red-100 text-red-800',
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
  color,
  className = '',
  style,
  ...props
}: BadgeProps): ReactElement {
  // If custom color is provided, use inline styles
  if (color) {
    const textColor = getTextColor(color);
    const classes = [
      'inline-flex items-center rounded-full font-medium',
      sizeClasses[size],
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <span
        className={classes}
        style={{
          backgroundColor: color,
          color: textColor,
          ...style,
        }}
        {...props}
      >
        {children}
      </span>
    );
  }

  // Default behavior with variant classes
  const classes = [
    'inline-flex items-center rounded-full font-medium',
    variantClasses[variant],
    sizeClasses[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} style={style} {...props}>
      {children}
    </span>
  );
}
