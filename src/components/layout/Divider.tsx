import { type HTMLAttributes, type ReactElement } from 'react';

export interface DividerProps extends HTMLAttributes<HTMLHRElement> {
  orientation?: 'horizontal' | 'vertical';
  spacing?: 'none' | 'sm' | 'md' | 'lg';
}

const spacingClasses = {
  horizontal: {
    none: '',
    sm: 'my-2',
    md: 'my-4',
    lg: 'my-6',
  },
  vertical: {
    none: '',
    sm: 'mx-2',
    md: 'mx-4',
    lg: 'mx-6',
  },
};

/**
 * Divider component for visual separation
 */
export function Divider({
  orientation = 'horizontal',
  spacing = 'md',
  className = '',
  ...props
}: DividerProps): ReactElement {
  if (orientation === 'vertical') {
    const classes = [
      'inline-block w-px bg-gray-200 self-stretch',
      spacingClasses.vertical[spacing],
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return <div className={classes} role="separator" aria-orientation="vertical" />;
  }

  const classes = ['border-t border-gray-200', spacingClasses.horizontal[spacing], className]
    .filter(Boolean)
    .join(' ');

  return <hr className={classes} {...props} />;
}
