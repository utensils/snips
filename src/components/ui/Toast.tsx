import { type ReactElement } from 'react';
import { useEffect, useState } from 'react';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
  message: string;
  variant?: ToastVariant;
  duration?: number;
  onClose?: () => void;
}

const variantClasses: Record<ToastVariant, string> = {
  success:
    'bg-green-100 dark:bg-green-900/40 border-green-400 dark:border-green-600 text-green-800 dark:text-green-200',
  error:
    'bg-red-100 dark:bg-red-900/40 border-red-400 dark:border-red-600 text-red-800 dark:text-red-200',
  info: 'bg-blue-100 dark:bg-blue-900/40 border-blue-400 dark:border-blue-600 text-blue-800 dark:text-blue-200',
  warning:
    'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-400 dark:border-yellow-600 text-yellow-800 dark:text-yellow-200',
};

const variantIcons: Record<ToastVariant, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠',
};

/**
 * Toast notification component
 *
 * Displays a temporary notification message that auto-dismisses after a duration
 */
export function Toast({
  message,
  variant = 'info',
  duration = 3000,
  onClose,
}: ToastProps): ReactElement | null {
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

  return (
    <div
      className={`
        fixed bottom-4 right-4 z-50
        flex items-center gap-2
        px-4 py-3 rounded-lg border-2
        shadow-lg
        animate-slide-up
        ${variantClasses[variant]}
      `}
      role="alert"
      aria-live="polite"
    >
      <span className="text-lg font-bold">{variantIcons[variant]}</span>
      <span className="font-medium">{message}</span>
      <button
        onClick={() => {
          setIsVisible(false);
          onClose?.();
        }}
        className="ml-2 text-xl leading-none opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
}

/**
 * Hook for managing toast notifications
 */
export function useToast(): {
  toast: ToastProps | null;
  showToast: (message: string, variant?: ToastVariant, duration?: number) => void;
  hideToast: () => void;
} {
  const [toast, setToast] = useState<ToastProps | null>(null);

  const showToast = (message: string, variant: ToastVariant = 'info', duration = 3000): void => {
    setToast({ message, variant, duration, onClose: () => setToast(null) });
  };

  const hideToast = (): void => {
    setToast(null);
  };

  return {
    toast,
    showToast,
    hideToast,
  };
}
