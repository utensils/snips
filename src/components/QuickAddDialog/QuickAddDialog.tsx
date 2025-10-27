import { invoke } from '@tauri-apps/api/core';
import { type UnlistenFn } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { type FormEvent, type ReactElement, useCallback, useEffect, useState } from 'react';

import { CloseSymbolic, WindowScaffold } from '@/components/adwaita';
import { Surface, Toolbar, ToolbarIconButton } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
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
  clipboardWarning?: string | null;
}

/**
 * QuickAddDialog component for quickly adding snippets from selected text.
 * Captures selected text when opened, allows user to name and tag the snippet.
 */
export function QuickAddDialog({
  onSuccess,
  onError,
  clipboardWarning,
}: QuickAddDialogProps): ReactElement {
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

  // Pull any pre-captured text from the backend in case the event fired
  // before the listeners finished registering (common on first launch).
  useEffect(() => {
    if (!isLoading) return;

    let cancelled = false;

    const hydrateFromCache = async (): Promise<void> => {
      try {
        const cached = await invoke<string | null>('get_latest_quick_add_capture');
        if (!cancelled && cached != null) {
          setSelectedText(cached);
          setIsLoading(false);
        }
      } catch (err) {
        errorLog('failed to hydrate quick add capture cache:', err);
      }
    };

    void hydrateFromCache();

    return () => {
      cancelled = true;
    };
  }, [isLoading]);

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

  const renderBody = (): ReactElement => {
    if (isLoading) {
      return (
        <Surface
          padding="lg"
          outline="none"
          elevation="md"
          className="flex min-h-[240px] items-center justify-center bg-[color-mix(in_srgb,hsl(var(--surface-raised))_88%,transparent)]"
        >
          <div className="flex flex-col items-center gap-3 text-[color:hsl(var(--text-secondary))]">
            <Spinner />
            <span className="typography-body">Capturing selected text…</span>
          </div>
        </Surface>
      );
    }

    if (error && !selectedText) {
      return (
        <Surface
          padding="lg"
          outline="soft"
          elevation="sm"
          className="space-y-4 bg-[color-mix(in_srgb,hsl(var(--surface-raised))_96%,transparent)]"
        >
          <div className="space-y-1">
            <h2 className="typography-heading text-red-500 dark:text-red-300">
              Something went wrong
            </h2>
            <p className="typography-body text-[color:hsl(var(--text-secondary))]">{error}</p>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleCancel} variant="tonal">
              Close
            </Button>
          </div>
        </Surface>
      );
    }

    return (
      <Surface
        padding="lg"
        outline="none"
        elevation="md"
        className="space-y-5 bg-[color-mix(in_srgb,hsl(var(--surface-raised))_94%,transparent)]"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
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
              <div className="absolute z-20 mt-2 w-full max-h-40 overflow-y-auto rounded-[9px] border border-[hsl(var(--outline-soft))] bg-[hsl(var(--surface-raised))] shadow-lg shadow-black/10 supports-[backdrop-filter]:backdrop-blur">
                {tagSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm text-[color:hsl(var(--text-primary))] transition-colors hover:bg-[color-mix(in_srgb,hsl(var(--accent))_10%,hsl(var(--surface-raised)))] focus:bg-[color-mix(in_srgb,hsl(var(--accent))_12%,hsl(var(--surface-raised)))] focus:outline-none"
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
              className="rounded-[9px] border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-200"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button type="submit" variant="primary" fullWidth disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Snippet'}
            </Button>
            <Button type="button" variant="tonal" onClick={handleCancel} fullWidth>
              Cancel
            </Button>
          </div>
        </form>
      </Surface>
    );
  };

  const headerSubtitle =
    isLoading && !selectedText
      ? 'Capturing selection…'
      : selectedText
        ? `${selectedText.length} characters captured`
        : undefined;

  return (
    <WindowScaffold size="medium" contentClassName="flex h-full flex-col gap-3">
      <Toolbar className="rounded-t-[16px] border-b border-transparent bg-[color-mix(in_srgb,hsl(var(--surface-raised))_95%,transparent)]/95 backdrop-blur-md shadow-[0_12px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_16px_36px_rgba(0,0,0,0.38)] items-center justify-between">
        <div className="flex flex-col">
          <span className="typography-caption uppercase tracking-[0.18em] text-[color:hsl(var(--text-secondary))]">
            Quick Add
          </span>
          <span className="typography-heading text-[color:hsl(var(--text-primary))]">Snippet</span>
        </div>
        <div className="flex items-center gap-3">
          {headerSubtitle ? (
            <span className="typography-caption text-[color:hsl(var(--text-secondary))]">
              {headerSubtitle}
            </span>
          ) : null}
          <ToolbarIconButton aria-label="Close quick add" onClick={handleCancel}>
            <CloseSymbolic size={12} />
          </ToolbarIconButton>
        </div>
      </Toolbar>

      {clipboardWarning && !isLoading && (
        <Surface
          level="subtle"
          padding="md"
          outline="soft"
          elevation="none"
          className="border border-amber-500/25 bg-amber-500/12 text-[color:hsl(var(--text-primary))]"
        >
          <span className="typography-body text-amber-900 dark:text-amber-200">
            {clipboardWarning}
          </span>
        </Surface>
      )}

      {renderBody()}
    </WindowScaffold>
  );
}
