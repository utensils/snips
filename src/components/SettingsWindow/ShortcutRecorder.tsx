import type React from 'react';
import { type ReactElement, useState, useEffect, useCallback, useRef } from 'react';

import { Button } from '@/components/ui/Button';

/**
 * ShortcutRecorder props
 */
interface ShortcutRecorderProps {
  initialValue?: string;
  onSave: (shortcut: string) => void;
  onCancel: () => void;
}

/**
 * ShortcutRecorder - Widget for capturing keyboard shortcut combinations
 *
 * This component captures key presses and builds a shortcut string in the
 * format expected by Tauri's global-shortcut plugin (e.g., "CommandOrControl+Shift+S").
 */
export function ShortcutRecorder({
  initialValue: _initialValue,
  onSave,
  onCancel,
}: ShortcutRecorderProps): ReactElement {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedKeys, setRecordedKeys] = useState<Set<string>>(new Set());
  const [displayText, setDisplayText] = useState('Click to record...');
  const inputRef = useRef<HTMLDivElement>(null);

  // Focus the recorder when mounted
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  /**
   * Convert browser KeyboardEvent to Tauri shortcut format
   */
  const buildShortcutString = useCallback((keys: Set<string>): string => {
    const modifiers: string[] = [];
    const regularKeys: string[] = [];

    keys.forEach((key) => {
      const normalized = normalizeKey(key);
      if (isModifierKey(normalized)) {
        modifiers.push(normalized);
      } else {
        regularKeys.push(normalized);
      }
    });

    // Sort modifiers in a consistent order
    const sortedModifiers = modifiers.sort((a, b) => {
      const order = ['CommandOrControl', 'Command', 'Control', 'Alt', 'Shift'];
      return order.indexOf(a) - order.indexOf(b);
    });

    // Combine modifiers and regular keys
    const parts = [...sortedModifiers, ...regularKeys];
    return parts.join('+');
  }, []);

  /**
   * Handle key down event
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>): void => {
      e.preventDefault();
      e.stopPropagation();

      if (!isRecording) return;

      const key = e.key;

      // Ignore if it's just a modifier key press without a regular key
      if (isModifierKey(key) && recordedKeys.size === 0) {
        const newKeys = new Set(recordedKeys);
        newKeys.add(key);
        setRecordedKeys(newKeys);
        setDisplayText(formatDisplay(buildShortcutString(newKeys)));
        return;
      }

      // Build the keys set from the event
      const keys = new Set<string>();

      // Add modifiers
      if (e.metaKey || e.ctrlKey) {
        keys.add('CommandOrControl');
      }
      if (e.altKey) {
        keys.add('Alt');
      }
      if (e.shiftKey) {
        keys.add('Shift');
      }

      // Add the main key if it's not a modifier
      if (!isModifierKey(key)) {
        keys.add(key);
      }

      setRecordedKeys(keys);
      const shortcutString = buildShortcutString(keys);
      setDisplayText(formatDisplay(shortcutString));

      // If we have a valid shortcut (at least one modifier + one key), stop recording
      if (keys.size >= 2 && Array.from(keys).some((k) => !isModifierKey(k))) {
        setIsRecording(false);
      }
    },
    [isRecording, recordedKeys, buildShortcutString]
  );

  /**
   * Handle key up event
   */
  const handleKeyUp = useCallback((e: React.KeyboardEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  /**
   * Start recording
   */
  const startRecording = (): void => {
    setIsRecording(true);
    setRecordedKeys(new Set());
    setDisplayText('Press your shortcut combination...');
  };

  /**
   * Handle save
   */
  const handleSave = (): void => {
    const shortcutString = buildShortcutString(recordedKeys);
    if (shortcutString && recordedKeys.size >= 2) {
      onSave(shortcutString);
    }
  };

  /**
   * Handle cancel
   */
  const handleCancel = (): void => {
    setIsRecording(false);
    setRecordedKeys(new Set());
    onCancel();
  };

  const hasValidShortcut =
    recordedKeys.size >= 2 && Array.from(recordedKeys).some((k) => !isModifierKey(k));

  return (
    <div className="flex items-center gap-2">
      <div
        ref={inputRef}
        tabIndex={0}
        role="textbox"
        aria-label="Shortcut recorder"
        className={`
          px-3 py-2 min-w-[200px] rounded-md border font-mono text-sm text-center
          focus:outline-none focus:ring-2 focus:ring-blue-500
          ${
            isRecording
              ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-300'
              : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100'
          }
        `}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onClick={startRecording}
      >
        {displayText}
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!hasValidShortcut}
          title={hasValidShortcut ? 'Save shortcut' : 'Record a valid shortcut first'}
        >
          Save
        </Button>
        <Button size="sm" variant="secondary" onClick={handleCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

/**
 * Check if a key is a modifier key
 */
function isModifierKey(key: string): boolean {
  const modifiers = [
    'Control',
    'Alt',
    'Shift',
    'Meta',
    'Command',
    'CommandOrControl',
    'Cmd',
    'Ctrl',
    'Option',
  ];
  return modifiers.includes(key);
}

/**
 * Normalize key name to Tauri format
 */
function normalizeKey(key: string): string {
  const mapping: Record<string, string> = {
    Control: 'Control',
    Meta: 'CommandOrControl',
    Alt: 'Alt',
    Shift: 'Shift',
    Command: 'Command',
    Cmd: 'Command',
    Ctrl: 'Control',
    Option: 'Alt',
  };

  // Return mapped value or uppercase the first letter of the key
  return mapping[key] || key.charAt(0).toUpperCase() + key.slice(1);
}

/**
 * Format shortcut string for display
 */
function formatDisplay(shortcut: string): string {
  if (!shortcut) return 'Press keys...';

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
