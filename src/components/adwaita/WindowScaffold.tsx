import { type ReactElement, type ReactNode } from 'react';

type WindowScaffoldVariant = 'pane' | 'overlay';
type WindowScaffoldSize = 'narrow' | 'medium' | 'wide';

export interface WindowScaffoldProps {
  children: ReactNode;
  variant?: WindowScaffoldVariant;
  size?: WindowScaffoldSize;
  className?: string;
  contentClassName?: string;
  fullHeight?: boolean;
}

const SIZE_CLASS: Record<WindowScaffoldSize, string> = {
  narrow: 'max-w-2xl',
  medium: 'max-w-3xl',
  wide: 'max-w-5xl',
};

const VARIANT_CLASS: Record<WindowScaffoldVariant, string> = {
  pane: 'bg-surface-0 text-foreground',
  overlay:
    'bg-surface-0/95 text-foreground shadow-lg shadow-black/5 supports-[backdrop-filter]:bg-surface-0/80 supports-[backdrop-filter]:backdrop-blur-2xl',
};

function joinClassNames(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Shared container for Linux windows using Libadwaita-inspired spacing and surfaces.
 */
export function WindowScaffold({
  children,
  variant = 'pane',
  size = 'medium',
  className,
  contentClassName,
  fullHeight = false,
}: WindowScaffoldProps): ReactElement {
  const outerClasses = joinClassNames(
    'w-full min-h-screen px-4 py-6 md:px-6 transition-colors duration-150',
    fullHeight && 'h-screen',
    VARIANT_CLASS[variant],
    className
  );

  const innerClasses = joinClassNames(
    'mx-auto flex w-full flex-col gap-4',
    SIZE_CLASS[size],
    contentClassName
  );

  return (
    <div className={outerClasses}>
      <div className={innerClasses}>{children}</div>
    </div>
  );
}
