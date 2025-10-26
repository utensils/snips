import { type HTMLAttributes, type ReactElement, type ReactNode } from 'react';

import { Pane } from '@/components/adwaita';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

type CardPadding = NonNullable<CardProps['padding']>;
type CardVariant = NonNullable<CardProps['variant']>;

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
  const paddingMap: Record<CardPadding, 'sm' | 'md' | 'lg'> = {
    none: 'sm',
    sm: 'sm',
    md: 'md',
    lg: 'lg',
  };

  const variantClasses: Record<CardVariant, string> = {
    default: '',
    outlined: 'bg-background/50 supports-[backdrop-filter]:backdrop-blur-sm',
    elevated: 'shadow-lg shadow-black/10 dark:shadow-black/40',
  };

  const extraClasses = [variantClasses[variant], className];
  if (padding === 'none') {
    extraClasses.push('p-0');
  }

  return (
    <Pane
      padding={paddingMap[padding]}
      className={extraClasses.filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </Pane>
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
    <Component className={`text-lg font-semibold text-foreground ${className}`} {...props}>
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
