import { Surface, type SurfaceProps } from './Surface';

export interface SidebarProps extends Omit<SurfaceProps, 'level' | 'padding'> {
  width?: 'md' | 'lg';
}

const widthClass: Record<Required<SidebarProps>['width'], string> = {
  md: 'w-56',
  lg: 'w-64',
};

export function Sidebar({ width = 'md', className = '', children, ...props }: SidebarProps) {
  const classes = [
    'flex flex-col gap-3 text-[color:hsl(var(--text-secondary))]',
    widthClass[width],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Surface level="subtle" padding="lg" className={classes} {...props}>
      {children}
    </Surface>
  );
}
