import { type HTMLAttributes, type ReactElement, type ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const variantClasses = {
  default: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
  outlined: 'bg-transparent border border-gray-300 dark:border-gray-600',
  elevated: 'bg-white dark:bg-gray-800 shadow-md',
};

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

/**
 * Reusable Card component for grouping content
 */
export function Card({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  ...props
}: CardProps): ReactElement {
  const classes = ['rounded-lg', variantClasses[variant], paddingClasses[padding], className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/**
 * Card header component
 */
export function CardHeader({ children, className = '', ...props }: CardHeaderProps): ReactElement {
  return (
    <div className={`mb-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

/**
 * Card title component
 */
export function CardTitle({
  children,
  as: Component = 'h3',
  className = '',
  ...props
}: CardTitleProps): ReactElement {
  return (
    <Component
      className={`text-lg font-semibold text-gray-900 dark:text-gray-100 ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/**
 * Card content component
 */
export function CardContent({
  children,
  className = '',
  ...props
}: CardContentProps): ReactElement {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/**
 * Card footer component
 */
export function CardFooter({ children, className = '', ...props }: CardFooterProps): ReactElement {
  return (
    <div className={`mt-4 ${className}`} {...props}>
      {children}
    </div>
  );
}
