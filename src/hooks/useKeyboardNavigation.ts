import { useEffect, useState } from 'react';

interface UseKeyboardNavigationOptions {
  itemCount: number;
  onSelect?: (index: number) => void;
  onEscape?: () => void;
  onToggle?: (index: number) => void;
  onSelectAll?: () => void;
  enabled?: boolean;
}

interface UseKeyboardNavigationReturn {
  focusedIndex: number;
  setFocusedIndex: (index: number | ((prev: number) => number)) => void;
}

/**
 * Hook for keyboard navigation in lists
 *
 * Handles arrow up/down, Enter, Escape, Space, and Cmd/Ctrl+A keys
 */
export function useKeyboardNavigation({
  itemCount,
  onSelect,
  onEscape,
  onToggle,
  onSelectAll,
  enabled = true,
}: UseKeyboardNavigationOptions): UseKeyboardNavigationReturn {
  const [focusedIndex, setFocusedIndex] = useState(0);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      // Handle Cmd/Ctrl+A for select all
      if ((event.metaKey || event.ctrlKey) && event.key === 'a') {
        event.preventDefault();
        if (onSelectAll && itemCount > 0) {
          onSelectAll();
        }
        return;
      }

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setFocusedIndex((prev) => (prev + 1) % itemCount);
          break;

        case 'ArrowUp':
          event.preventDefault();
          setFocusedIndex((prev) => (prev === 0 ? itemCount - 1 : prev - 1));
          break;

        case 'Enter':
          event.preventDefault();
          if (onSelect && itemCount > 0) {
            onSelect(focusedIndex);
          }
          break;

        case ' ':
          event.preventDefault();
          if (onToggle && itemCount > 0) {
            onToggle(focusedIndex);
          }
          break;

        case 'Escape':
          event.preventDefault();
          if (onEscape) {
            onEscape();
          }
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, itemCount, focusedIndex, onSelect, onEscape, onToggle, onSelectAll]);

  return { focusedIndex, setFocusedIndex };
}
