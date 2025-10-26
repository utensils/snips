import { invoke } from '@tauri-apps/api/core';
import { type UnlistenFn } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { type FormEvent, type ReactElement, useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { createSnippet, getAllSnippets } from '@/lib/api';

const isDev = import.meta.env.DEV;

const debugLog = (...messages: unknown[]): void => {
  if (isDev) {
    console.warn('[QuickAddDialog]', ...messages);
  }
};

const errorLog = (...messages: unknown[]): void => {
  if (isDev) {
    console.error('[QuickAddDialog]', ...messages);
  }
};

interface QuickAddDialogProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

/**
 * QuickAddDialog component for quickly adding snippets from selected text.
 * Captures selected text when opened, allows user to name and tag the snippet.
 */
export function QuickAddDialog({ onSuccess, onError }: QuickAddDialogProps): ReactElement {
  const [selectedText, setSelectedText] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [tags, setTags] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [nameError, setNameError] = useState<string>('');
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState<boolean>(false);

  // Listen for selected text event from backend
  useEffect(() => {
    let unlistenText: UnlistenFn | undefined;
    let unlistenError: UnlistenFn | undefined;
    let mounted = true;

    const setupListener = async (): Promise<void> => {
      try {
        const window = getCurrentWindow();

        // Debug: Log window label to verify we're in the right window
        debugLog('window label:', window.label);

        // Small delay to ensure Tauri IPC is ready
        await new Promise((resolve) => setTimeout(resolve, 50));

        if (!mounted) return;

        // Use window-specific listen API for events sent via emit_to
        // Window-specific events are NOT triggered to global listeners
        unlistenText = await window.listen<string>('selected-text-captured', (event) => {
          debugLog('received selected-text-captured event:', event.payload.substring(0, 50));
          if (mounted) {
            setSelectedText(event.payload);
            setIsLoading(false);
          }
        });

        if (!mounted) return;

        // Listen for errors from the backend
        unlistenError = await window.listen<string>('selected-text-error', (event) => {
          errorLog('received selected-text-error event:', event.payload);
          if (mounted) {
            setError(event.payload);
            setIsLoading(false);
            onError?.(event.payload);
          }
        });

        debugLog('listeners set up successfully, waiting for events...');
      } catch (err) {
        errorLog('failed to setup listener:', err);
        if (mounted) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to setup listener';
          setError(errorMessage);
          setIsLoading(false);
          onError?.(errorMessage);
        }
      }
    };

    setupListener();

    return () => {
      mounted = false;
      unlistenText?.();
      unlistenError?.();
    };
  }, [onError]);

  // Fetch existing tags for autocomplete
  useEffect(() => {
    const fetchTags = async (): Promise<void> => {
      try {
        const snippets = await getAllSnippets();
        const allTags = new Set<string>();
        snippets.forEach((snippet) => {
          snippet.tags?.forEach((tag) => allTags.add(tag));
        });
        setExistingTags(Array.from(allTags).sort());
      } catch (err) {
        errorLog('failed to fetch existing tags:', err);
      }
    };

    fetchTags();
  }, []);

  // Filter tag suggestions based on current input
  const getTagSuggestions = useCallback((): string[] => {
    if (!tags) {
      return [];
    }

    const currentTags = tags.split(',').map((t) => t.trim().toLowerCase());
    const lastTag = currentTags[currentTags.length - 1];

    if (!lastTag) {
      return [];
    }

    return existingTags
      .filter((tag) => tag.toLowerCase().startsWith(lastTag) && !currentTags.includes(tag))
      .slice(0, 5);
  }, [tags, existingTags]);

  const tagSuggestions = getTagSuggestions();

  // Handle tag suggestion selection
  const handleTagSuggestionClick = (suggestion: string): void => {
    const currentTags = tags.split(',').map((t) => t.trim());
    currentTags[currentTags.length - 1] = suggestion;
    setTags(currentTags.join(', '));
    setShowTagSuggestions(false);
  };

  // Validate form
  const validateForm = (): boolean => {
    setNameError('');

    if (!name.trim()) {
      setNameError('Snippet name is required');
      return false;
    }

    if (name.trim().length > 255) {
      setNameError('Snippet name must be less than 255 characters');
      return false;
    }

    return true;
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      // Parse tags from comma-separated string
      const tagList = tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      // Creating snippet with parsed tags

      await createSnippet({
        name: name.trim(),
        content: selectedText,
        description: description.trim() || null,
        tags: tagList,
      });

      onSuccess?.();

      // Reset form state
      setName('');
      setDescription('');
      setTags('');
      setSelectedText('');
      setError('');
      setNameError('');

      // Hide the window (don't close it - it's pre-created)
      try {
        await invoke('hide_quick_add_window');
      } catch (err) {
        errorLog('failed to hide window:', err);
      }
    } catch (err) {
      errorLog('failed to create snippet:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create snippet';
      setError(errorMessage);
      setIsSaving(false);
      onError?.(errorMessage);
    } finally {
      // Ensure isSaving is reset even if something unexpected happens
      setIsSaving(false);
    }
  };

  // Handle cancel/close
  const handleCancel = async (): Promise<void> => {
    // Reset form state
    setName('');
    setDescription('');
    setTags('');
    setSelectedText('');
    setError('');
    setNameError('');
    setIsLoading(true); // Reset to loading state for next open

    // Hide the window (don't close it - it's pre-created)
    try {
      await invoke('hide_quick_add_window');
    } catch (err) {
      errorLog('failed to hide window on cancel:', err);
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6 bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Capturing selected text...
          </p>
        </div>
      </div>
    );
  }

  if (error && !selectedText) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">Error</h2>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">{error}</p>
          <Button onClick={handleCancel} variant="secondary" fullWidth>
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gray-50 dark:bg-gray-900 animate-fade-in">
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 animate-fade-in-scale">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          Quick Add Snippet
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Selected text (editable) */}
          <Textarea
            label="Content"
            value={selectedText}
            onChange={(e) => setSelectedText(e.target.value)}
            placeholder="Captured text will appear here - you can edit it before saving"
            fullWidth
            rows={6}
            helperText="This text was automatically captured. You can modify it before creating the snippet."
          />

          {/* Name input (required) */}
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Python async function template"
            required
            fullWidth
            error={nameError}
            autoFocus
            maxLength={255}
          />

          {/* Description input (optional) */}
          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description of this snippet"
            fullWidth
            rows={2}
          />

          {/* Tags input (optional) with autocomplete */}
          <div className="relative">
            <Input
              label="Tags"
              value={tags}
              onChange={(e) => {
                setTags(e.target.value);
                setShowTagSuggestions(true);
              }}
              onFocus={() => setShowTagSuggestions(true)}
              onBlur={() => {
                // Delay to allow clicking suggestions
                setTimeout(() => setShowTagSuggestions(false), 200);
              }}
              placeholder="e.g., python, async, template (comma-separated)"
              fullWidth
              helperText="Comma-separated list of tags"
            />

            {/* Tag suggestions dropdown */}
            {showTagSuggestions && tagSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {tagSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600 focus:bg-gray-100 dark:focus:bg-gray-600 focus:outline-none"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleTagSuggestionClick(suggestion);
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Error message */}
          {error && selectedText && (
            <div
              className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <Button type="submit" variant="primary" fullWidth disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Snippet'}
            </Button>
            <Button type="button" variant="secondary" onClick={handleCancel} fullWidth>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
