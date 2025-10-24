import React, { useEffect } from 'react';

import { Button } from '@/components/ui/Button';

/**
 * DeleteConfirmDialog Props
 */
interface DeleteConfirmDialogProps {
  isOpen: boolean;
  snippetNames: string[];
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * DeleteConfirmDialog - Confirmation dialog for deleting snippets
 */
export function DeleteConfirmDialog({
  isOpen,
  snippetNames,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps): React.ReactElement | null {
  // Handle escape key
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  const count = snippetNames.length;
  const isMultiple = count > 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4">
          <h2
            id="delete-dialog-title"
            className="text-xl font-semibold text-gray-900 dark:text-gray-100"
          >
            Delete {isMultiple ? `${count} Snippets` : 'Snippet'}?
          </h2>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            {isMultiple
              ? `Are you sure you want to delete ${count} snippets? This action cannot be undone.`
              : 'Are you sure you want to delete this snippet? This action cannot be undone.'}
          </p>

          {/* List of snippet names */}
          {count <= 5 ? (
            <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
              {snippetNames.map((name, index) => (
                <li key={index} className="truncate">
                  {name}
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <ul className="list-disc list-inside space-y-1 mb-2">
                {snippetNames.slice(0, 4).map((name, index) => (
                  <li key={index} className="truncate">
                    {name}
                  </li>
                ))}
              </ul>
              <p className="italic">...and {count - 4} more</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 rounded-b-lg flex justify-end gap-3">
          <Button onClick={onCancel} variant="secondary">
            Cancel
          </Button>
          <Button onClick={onConfirm} variant="danger">
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
