import { type ReactElement } from 'react';

export interface ShortcutItem {
  keys: string[];
  description: string;
  category?: string;
}

export interface KeyboardShortcutsHelpProps {
  shortcuts: ShortcutItem[];
  title?: string;
  className?: string;
}

/**
 * Component to display keyboard shortcuts in a formatted table
 */
export function KeyboardShortcutsHelp({
  shortcuts,
  title = 'Keyboard Shortcuts',
  className = '',
}: KeyboardShortcutsHelpProps): ReactElement {
  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce(
    (acc, shortcut) => {
      const category = shortcut.category || 'General';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(shortcut);
      return acc;
    },
    {} as Record<string, ShortcutItem[]>
  );

  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>

      {Object.entries(groupedShortcuts).map(([category, items]) => (
        <div key={category} className="space-y-2">
          {Object.keys(groupedShortcuts).length > 1 && (
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">{category}</h4>
          )}

          <div className="space-y-1">
            {items.map((shortcut, index) => (
              <div
                key={`${category}-${index}`}
                className="flex items-center justify-between py-2 px-3 rounded-md bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {shortcut.description}
                </span>
                <div className="flex gap-1">
                  {shortcut.keys.map((key, keyIndex) => (
                    <kbd
                      key={keyIndex}
                      className="px-2 py-1 text-xs font-semibold text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-sm"
                    >
                      {key}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Inline keyboard shortcut hint component
 */
export function KeyboardShortcutHint({
  keys,
  className = '',
}: {
  keys: string[];
  className?: string;
}): ReactElement {
  return (
    <span className={`inline-flex gap-1 items-center ${className}`}>
      {keys.map((key, index) => (
        <kbd
          key={index}
          className="px-1.5 py-0.5 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"
        >
          {key}
        </kbd>
      ))}
    </span>
  );
}
