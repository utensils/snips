import { getCurrentWindow } from '@tauri-apps/api/window';
import { type FormEvent, type ReactElement, useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { createSnippet, getAllSnippets, getSelectedText } from '@/lib/api';

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

  // Fetch selected text when component mounts
  useEffect(() => {
    const fetchSelectedText = async (): Promise<void> => {
      try {
        const text = await getSelectedText();
        setSelectedText(text);
        setIsLoading(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to capture selected text';
        setError(errorMessage);
        setIsLoading(false);
        onError?.(errorMessage);
      }
    };

    fetchSelectedText();
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
        console.error('Failed to fetch existing tags:', err);
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

      await createSnippet({
        name: name.trim(),
        content: selectedText,
        description: description.trim() || null,
        tags: tagList,
      });

      onSuccess?.();

      // Close the window
      const window = getCurrentWindow();
      await window.close();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create snippet';
      setError(errorMessage);
      setIsSaving(false);
      onError?.(errorMessage);
    }
  };

  // Handle cancel/close
  const handleCancel = async (): Promise<void> => {
    const window = getCurrentWindow();
    await window.close();
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
      <div className="flex items-center justify-center min-h-screen p-6 bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-sm text-gray-600">Capturing selected text...</p>
        </div>
      </div>
    );
  }

  if (error && !selectedText) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6 bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-red-600 mb-2">Error</h2>
          <p className="text-sm text-gray-700 mb-4">{error}</p>
          <Button onClick={handleCancel} variant="secondary" fullWidth>
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Quick Add Snippet</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Selected text preview (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Selected Text</label>
            <div className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-700 max-h-32 overflow-y-auto">
              {selectedText}
            </div>
          </div>

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
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {tagSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
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
              className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
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
            <Button
              type="button"
              variant="secondary"
              onClick={handleCancel}
              disabled={isSaving}
              fullWidth
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
