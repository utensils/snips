import { useEffect, useState, type ReactElement } from 'react';

import {
  type ToastProps as BaseToastProps,
  type ToastVariant,
  useToast as useBaseToast,
} from '@/components/ui/Toast';

export type AdwaitaToastProps = BaseToastProps;

const variantStyles: Record<ToastVariant, { icon: string; classes: string }> = {
  success: {
    icon: '✓',
    classes: 'bg-green-500/15 border-green-500/40 text-green-900 dark:text-green-100',
  },
  error: {
    icon: '⨯',
    classes: 'bg-red-500/15 border-red-500/40 text-red-900 dark:text-red-100',
  },
  info: {
    icon: 'ℹ',
    classes: 'bg-blue-500/15 border-blue-500/40 text-blue-900 dark:text-blue-100',
  },
  warning: {
    icon: '⚠',
    classes: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-900 dark:text-yellow-50',
  },
};

/**
 * GNOME/Libadwaita-styled toast with soft translucency and centered layout.
 */
export function AdwaitaToast({
  message,
  variant = 'info',
  duration = 3000,
  onClose,
}: AdwaitaToastProps): ReactElement | null {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) {
    return null;
  }

  const variantStyle = variantStyles[variant];

  return (
    <div
      className={`
        pointer-events-auto fixed bottom-6 left-1/2 z-50 w-[min(400px,90vw)] -translate-x-1/2
        rounded-2xl border px-5 py-3 shadow-lg shadow-black/10 dark:shadow-black/40
        backdrop-blur supports-[backdrop-filter]:bg-background/75
        flex items-center gap-3
        ${variantStyle.classes}
      `}
      role="status"
      aria-live="polite"
    >
      <span className="text-lg font-semibold" aria-hidden>
        {variantStyle.icon}
      </span>
      <span className="flex-1 text-sm font-medium leading-relaxed text-foreground">{message}</span>
      <button
        type="button"
        onClick={() => {
          setIsVisible(false);
          onClose?.();
        }}
        className="rounded-full px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-muted/40"
        aria-label="Dismiss notification"
      >
        Close
      </button>
    </div>
  );
}

export const useAdwaitaToast = useBaseToast;
