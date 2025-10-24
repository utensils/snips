import React, { useState, useEffect } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { createSnippet, updateSnippet } from '@/lib/api';
import type { Snippet, CreateSnippetInput, UpdateSnippetInput } from '@/types';

/**
 * SnippetDetailPanel Props
 */
interface SnippetDetailPanelProps {
  snippet: Snippet | null;
  isCreating: boolean;
  onSave: () => void;
  onCancel: () => void;
}

/**
 * SnippetDetailPanel - Form for creating/editing snippets
 */
export function SnippetDetailPanel({
  snippet,
  isCreating,
  onSave,
  onCancel,
}: SnippetDetailPanelProps): React.ReactElement {
  const [name, setName] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [tags, setTags] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
      onCancel();
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {isCreating ? 'Create New Snippet' : 'Edit Snippet'}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4" onKeyDown={handleKeyDown}>
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
              id="snippet-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter snippet name"
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
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Separate tags with commas (e.g., &quot;work, email, template&quot;)
            </p>
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

      {/* Actions */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
        <Button onClick={onCancel} variant="secondary" disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="primary" disabled={isSaving}>
          {isSaving ? 'Saving...' : isCreating ? 'Create' : 'Save'}
        </Button>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="px-4 pb-3">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Press{' '}
          <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">
            ⌘S
          </kbd>{' '}
          to save,{' '}
          <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">
            Esc
          </kbd>{' '}
          to cancel
        </p>
      </div>
    </Card>
  );
}
