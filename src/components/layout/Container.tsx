import { type HTMLAttributes, type ReactElement, type ReactNode } from 'react';

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  centerContent?: boolean;
}

const maxWidthClasses = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  '2xl': 'max-w-screen-2xl',
  full: 'max-w-full',
};

/**
 * Container component for consistent content width and centering
 */
export function Container({
  children,
  maxWidth = 'lg',
  centerContent = true,
  className = '',
  ...props
}: ContainerProps): ReactElement {
  const classes = [
    'w-full',
    maxWidthClasses[maxWidth],
    centerContent ? 'mx-auto px-4' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}
