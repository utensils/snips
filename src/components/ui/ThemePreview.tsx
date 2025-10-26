import { type CSSProperties, type ReactElement } from 'react';

export type ThemePreviewVariant = 'light' | 'dark';

export interface ThemePreviewProps {
  variant: ThemePreviewVariant;
  isActive?: boolean;
  badge?: string;
}

const PREVIEW_TOKENS: Record<ThemePreviewVariant, Record<string, string>> = {
  light: {
    '--preview-neutral-0': '210 20% 98%',
    '--preview-neutral-2': '210 16% 90%',
    '--preview-text': '218 15% 24%',
    '--preview-muted': '215 12% 68%',
    '--preview-accent': '216 92% 60%',
    '--preview-accent-foreground': '210 40% 98%',
    '--preview-outline-soft': '214 31% 86%',
  },
  dark: {
    '--preview-neutral-0': '220 15% 16%',
    '--preview-neutral-2': '220 12% 26%',
    '--preview-text': '210 40% 96%',
    '--preview-muted': '215 18% 56%',
    '--preview-accent': '216 85% 66%',
    '--preview-accent-foreground': '220 15% 14%',
    '--preview-outline-soft': '217 28% 23%',
  },
};

export function ThemePreview({
  variant,
  isActive = false,
  badge,
}: ThemePreviewProps): ReactElement {
  const style = PREVIEW_TOKENS[variant] as CSSProperties;

  const baseClasses =
    'relative h-24 w-full overflow-hidden rounded-lg border transition-transform duration-200 motion-reduce:transition-none';
  const borderClass = isActive
    ? 'border-[hsl(var(--preview-accent))] motion-safe:scale-[1.02] motion-reduce:scale-100 shadow-[0_0_0_2px_color-mix(in_srgb,hsl(var(--preview-accent))_30%,transparent)]'
    : 'border-[hsl(var(--preview-outline-soft))]';

  return (
    <div
      aria-hidden="true"
      className={`${baseClasses} ${borderClass}`}
      data-theme-preview={variant}
      style={style}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--preview-neutral-0))] to-[hsl(var(--preview-neutral-2))] motion-safe:animate-fade-in motion-reduce:animate-none" />
      <div className="absolute inset-0 flex flex-col gap-2 p-3 text-xs">
        <div className="flex gap-2">
          <div className="h-3 flex-1 rounded bg-[hsl(var(--preview-muted))]/50" />
          <div className="h-3 w-8 rounded bg-[hsl(var(--preview-muted))]/30" />
        </div>
        <div className="flex gap-2">
          <div className="h-3 flex-1 rounded bg-[hsl(var(--preview-muted))]/45" />
          <div className="h-3 w-10 rounded bg-[hsl(var(--preview-muted))]/20" />
        </div>
        <div className="mt-auto flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-[hsl(var(--preview-accent))]/70" />
          <div className="h-3 flex-1 rounded bg-[hsl(var(--preview-muted))]/25" />
        </div>
      </div>
      {badge ? (
        <span
          data-testid={`theme-preview-badge-${variant}`}
          className="absolute left-2 top-2 rounded-full bg-[hsl(var(--preview-accent))] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--preview-accent-foreground))]"
        >
          {badge}
        </span>
      ) : null}
    </div>
  );
}
