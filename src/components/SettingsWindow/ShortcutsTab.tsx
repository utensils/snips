import { invoke } from '@tauri-apps/api/core';
import { type ReactElement, useState, useEffect, useCallback } from 'react';

import { Stack } from '@/components/layout/Stack';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { AppSettings, GlobalShortcuts } from '@/types/settings';

import { ShortcutRecorder } from './ShortcutRecorder';

/**
 * Shortcut information for display
 */
interface ShortcutAction {
  id: keyof GlobalShortcuts;
  label: string;
  description: string;
}

/**
 * Available shortcut actions
 */
const SHORTCUT_ACTIONS: ShortcutAction[] = [
  {
    id: 'search_select',
    label: 'Search/Select Snippets',
    description: 'Open the search overlay to find and select snippets',
  },
  {
    id: 'quick_add',
    label: 'Quick Add Snippet',
    description: 'Quickly capture selected text as a new snippet',
  },
];

/**
 * Default shortcuts
 */
const DEFAULT_SHORTCUTS: GlobalShortcuts = {
  search_select: 'CommandOrControl+Shift+S',
  quick_add: 'CommandOrControl+Shift+A',
};

/**
 * ShortcutsTab - Keyboard shortcuts customization settings
 */
export function ShortcutsTab(): ReactElement {
  const [shortcuts, setShortcuts] = useState<GlobalShortcuts>(DEFAULT_SHORTCUTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingShortcut, setEditingShortcut] = useState<keyof GlobalShortcuts | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [conflicts, setConflicts] = useState<Map<keyof GlobalShortcuts, string>>(new Map());

  // Load current shortcuts from settings
  useEffect(() => {
    loadShortcuts();
  }, []);

  const loadShortcuts = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const settings = await invoke<AppSettings>('get_settings');
      setShortcuts(settings.global_shortcuts);
    } catch (err) {
      setError(`Failed to load shortcuts: ${err}`);
      console.error('Error loading shortcuts:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Validate a shortcut string
   */
  const validateShortcut = async (shortcut: string): Promise<boolean> => {
    try {
      return await invoke<boolean>('is_shortcut_valid', { shortcut });
    } catch (err) {
      console.error('Error validating shortcut:', err);
      return false;
    }
  };

  /**
   * Check for conflicts between shortcuts
   */
  const checkConflicts = useCallback(
    (newShortcuts: GlobalShortcuts): Map<keyof GlobalShortcuts, string> => {
      const conflictMap = new Map<keyof GlobalShortcuts, string>();
      const shortcutValues = Object.entries(newShortcuts);

      // Check for duplicate shortcuts
      shortcutValues.forEach(([key, value]) => {
        const duplicates = shortcutValues.filter(([k, v]) => k !== key && v === value);
        if (duplicates.length > 0) {
          conflictMap.set(
            key as keyof GlobalShortcuts,
            `Conflicts with ${duplicates.map(([k]) => k).join(', ')}`
          );
        }
      });

      return conflictMap;
    },
    []
  );

  /**
   * Handle shortcut change
   */
  const handleShortcutChange = async (
    actionId: keyof GlobalShortcuts,
    newShortcut: string
  ): Promise<void> => {
    // Validate the shortcut format
    const isValid = await validateShortcut(newShortcut);
    if (!isValid) {
      setError('Invalid shortcut format');
      return;
    }

    // Update shortcuts
    const updatedShortcuts = {
      ...shortcuts,
      [actionId]: newShortcut,
    };

    setShortcuts(updatedShortcuts);
    setEditingShortcut(null);
    setHasChanges(true);
    setError(null);

    // Check for conflicts
    const newConflicts = checkConflicts(updatedShortcuts);
    setConflicts(newConflicts);
  };

  /**
   * Save shortcuts to settings
   */
  const handleSave = async (): Promise<void> => {
    try {
      setSaving(true);
      setError(null);

      // Check for conflicts before saving
      if (conflicts.size > 0) {
        setError('Please resolve shortcut conflicts before saving');
        return;
      }

      // Load current settings
      const settings = await invoke<AppSettings>('get_settings');

      // Update with new shortcuts
      const updatedSettings: AppSettings = {
        ...settings,
        global_shortcuts: shortcuts,
      };

      // Save settings
      await invoke('update_settings', { settings: updatedSettings });

      // Re-register shortcuts
      await invoke('reregister_default_shortcuts');

      setHasChanges(false);
      setError(null);
    } catch (err) {
      setError(`Failed to save shortcuts: ${err}`);
      console.error('Error saving shortcuts:', err);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Reset shortcuts to defaults
   */
  const handleReset = async (): Promise<void> => {
    setShortcuts(DEFAULT_SHORTCUTS);
    setHasChanges(true);
    setConflicts(new Map());
    setError(null);
  };

  /**
   * Cancel editing
   */
  const handleCancel = (): void => {
    setEditingShortcut(null);
    setError(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-600 dark:text-gray-400">Loading shortcuts...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Stack spacing="lg">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Keyboard Shortcuts
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Customize global keyboard shortcuts for quick access to Snips features.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
            <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
          </Card>
        )}

        {/* Shortcuts list */}
        <Stack spacing="md">
          {SHORTCUT_ACTIONS.map((action) => {
            const currentShortcut = shortcuts[action.id];
            const conflict = conflicts.get(action.id);
            const isEditing = editingShortcut === action.id;

            return (
              <Card key={action.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      {action.label}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{action.description}</p>
                    {conflict && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-2">⚠️ {conflict}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {isEditing ? (
                      <ShortcutRecorder
                        initialValue={currentShortcut}
                        onSave={(newShortcut) => handleShortcutChange(action.id, newShortcut)}
                        onCancel={handleCancel}
                      />
                    ) : (
                      <>
                        <kbd
                          className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600
                                   rounded-md font-mono text-sm text-gray-900 dark:text-gray-100 min-w-[200px] text-center"
                        >
                          {formatShortcut(currentShortcut)}
                        </kbd>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setEditingShortcut(action.id)}
                        >
                          Edit
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </Stack>

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="secondary"
            onClick={handleReset}
            disabled={saving || editingShortcut !== null}
          >
            Reset to Defaults
          </Button>

          <div className="flex items-center gap-3">
            {hasChanges && (
              <span className="text-sm text-gray-600 dark:text-gray-400">Unsaved changes</span>
            )}
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving || editingShortcut !== null || conflicts.size > 0}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Help text */}
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <div className="text-sm text-blue-900 dark:text-blue-300">
            <p className="font-semibold mb-2">Tips:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Click &quot;Edit&quot; to record a new shortcut combination</li>
              <li>Press the desired key combination while recording</li>
              <li>Shortcuts must be unique - conflicts will be highlighted</li>
              <li>Changes take effect immediately after saving</li>
              <li>
                Use modifier keys (Cmd/Ctrl, Shift, Alt) for global shortcuts to avoid conflicts
              </li>
            </ul>
          </div>
        </Card>
      </Stack>
    </div>
  );
}

/**
 * Format shortcut string for display
 */
function formatShortcut(shortcut: string): string {
  return shortcut
    .replace(/CommandOrControl/g, '⌘/Ctrl')
    .replace(/Command/g, '⌘')
    .replace(/Cmd/g, '⌘')
    .replace(/Control/g, 'Ctrl')
    .replace(/Shift/g, '⇧')
    .replace(/Alt/g, '⌥')
    .replace(/Option/g, '⌥')
    .replace(/\+/g, ' + ');
}
