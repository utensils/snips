import React, { useState, useEffect, useRef } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useTags } from '@/hooks/useTags';
import { createSnippet, updateSnippet } from '@/lib/api';
import type { Snippet, CreateSnippetInput, UpdateSnippetInput } from '@/types';

/**
 * EditSnippetOverlay Props
 */
interface EditSnippetOverlayProps {
  snippet: Snippet | null;
  isCreating: boolean;
  onSave: () => void;
  onClose: () => void;
}

/**
 * EditSnippetOverlay - Overlay modal for creating/editing snippets
 * Follows the same pattern as SearchOverlay for consistency
 */
export function EditSnippetOverlay({
  snippet,
  isCreating,
  onSave,
  onClose,
}: EditSnippetOverlayProps): React.ReactElement {
  const { getTagColor } = useTags();
  const [name, setName] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [tags, setTags] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Initialize form when snippet changes
  useEffect(() => {
    if (snippet) {
      setName(snippet.name);
      setContent(snippet.content);
      setDescription(snippet.description ?? '');
      setTags(snippet.tags?.join(', ') ?? '');
    } else {
      setName('');
      setContent('');
      setDescription('');
      setTags('');
    }
    setError(null);
  }, [snippet]);

  // Focus name input on mount
  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  /**
   * Validates the form
   */
  const validate = (): boolean => {
    if (!name.trim()) {
      setError('Name is required');
      return false;
    }
    if (!content.trim()) {
      setError('Content is required');
      return false;
    }
    return true;
  };

  /**
   * Parses tags from comma-separated string
   */
  const parseTags = (): string[] => {
    return tags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
  };

  /**
   * Handles save action
   */
  const handleSave = async (): Promise<void> => {
    if (!validate()) {
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const tagArray = parseTags();

      if (isCreating) {
        // Create new snippet
        const input: CreateSnippetInput = {
          name: name.trim(),
          content: content.trim(),
          description: description.trim() || null,
          tags: tagArray.length > 0 ? tagArray : undefined,
        };
        await createSnippet(input);
      } else if (snippet) {
        // Update existing snippet
        const input: UpdateSnippetInput = {
          name: name.trim(),
          content: content.trim(),
          description: description.trim() || null,
          tags: tagArray.length > 0 ? tagArray : undefined,
        };
        await updateSnippet(snippet.id, input);
      }

      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save snippet');
      console.error('Failed to save snippet:', err);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handles keyboard shortcuts
   */
  const handleKeyDown = (e: React.KeyboardEvent): void => {
    // Cmd+S or Ctrl+S to save
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
    // Escape to cancel
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Get parsed tags for display
  const parsedTags = parseTags();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl mx-4 bg-white dark:bg-gray-900 rounded-xl border-[3px] border-gray-400 dark:border-gray-500 shadow-2xl overflow-hidden animate-fade-in-scale"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {isCreating ? 'Create New Snippet' : 'Edit Snippet'}
            </h2>
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 max-h-[calc(100vh-200px)]">
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label
                htmlFor="snippet-name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Name *
              </label>
              <Input
                ref={nameInputRef}
                id="snippet-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter snippet name"
                fullWidth
                autoFocus
                aria-required="true"
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="snippet-description"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Description
              </label>
              <Input
                id="snippet-description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                fullWidth
              />
            </div>

            {/* Content */}
            <div>
              <label
                htmlFor="snippet-content"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Content *
              </label>
              <Textarea
                id="snippet-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter snippet content"
                rows={12}
                fullWidth
                aria-required="true"
              />
            </div>

            {/* Tags */}
            <div>
              <label
                htmlFor="snippet-tags"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Tags
              </label>
              <Input
                id="snippet-tags"
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Enter tags separated by commas"
                fullWidth
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Separate tags with commas (e.g., &quot;work, email, template&quot;)
              </p>

              {/* Tag preview */}
              {parsedTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {parsedTags.map((tag) => (
                    <Badge key={tag} size="sm" color={getTagColor(tag)}>
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Metadata (for editing) */}
            {snippet && !isCreating && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Metadata
                </h3>
                <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                  <p>Created: {new Date(snippet.created_at).toLocaleString()}</p>
                  <p>Updated: {new Date(snippet.updated_at).toLocaleString()}</p>
                  <p>ID: {snippet.id}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Press{' '}
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">
                ⌘S
              </kbd>{' '}
              to save,{' '}
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">
                Esc
              </kbd>{' '}
              to cancel
            </p>
            <div className="flex gap-3">
              <Button onClick={onClose} variant="secondary" disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSave} variant="primary" disabled={isSaving}>
                {isSaving ? 'Saving...' : isCreating ? 'Create' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
