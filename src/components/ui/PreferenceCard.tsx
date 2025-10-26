import { type HTMLAttributes, type ReactNode } from 'react';

import { Surface } from './surfaces/Surface';

export interface PreferenceCardProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
}

export function PreferenceCard({
  title,
  description,
  icon,
  actions,
  className = '',
  children,
  ...props
}: PreferenceCardProps) {
  const headerClasses = 'flex items-start gap-3';
  const titleClasses = 'typography-heading text-[color:hsl(var(--text-primary))]';
  const descriptionClasses = 'typography-body text-[color:hsl(var(--text-secondary))]';

  return (
    <Surface padding="lg" className={['flex flex-col gap-4', className].join(' ')} {...props}>
      <div className={headerClasses}>
        {icon ? <div className="mt-0.5 text-[color:hsl(var(--text-secondary))]">{icon}</div> : null}
        <div className="flex-1 space-y-1">
          <h3 className={titleClasses}>{title}</h3>
          {description ? <p className={descriptionClasses}>{description}</p> : null}
        </div>
        {actions ? <div className="ml-4 shrink-0">{actions}</div> : null}
      </div>
      {children ? <div className="space-y-3">{children}</div> : null}
    </Surface>
  );
}
