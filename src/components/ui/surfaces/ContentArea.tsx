import { Surface, type SurfaceProps } from './Surface';

export interface ContentAreaProps extends Omit<SurfaceProps, 'level'> {
  spacing?: 'sm' | 'md' | 'lg';
}

const spacingClass: Record<Required<ContentAreaProps>['spacing'], string> = {
  sm: 'space-y-3',
  md: 'space-y-4',
  lg: 'space-y-6',
};

export function ContentArea({
  spacing = 'lg',
  className = '',
  children,
  ...props
}: ContentAreaProps) {
  const classes = ['flex-1', spacingClass[spacing], className].filter(Boolean).join(' ');

  return (
    <Surface level="raised" padding="lg" className={classes} {...props}>
      {children}
    </Surface>
  );
}
