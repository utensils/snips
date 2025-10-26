import React, { useState, useMemo, useEffect } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { Input } from '@/components/ui/Input';
import { updateSnippet } from '@/lib/api';
import { getTags, updateTagColor } from '@/lib/tagApi';
import type { Snippet, Tag } from '@/types';

/**
 * TagManagement Props
 */
interface TagManagementProps {
  snippets: Snippet[];
  onUpdate: () => void;
  onClose: () => void;
}

/**
 * Tag information with usage count and metadata
 */
interface TagInfo extends Tag {
  count: number;
  snippetIds: number[];
}

/**
 * TagManagement - Manage tags across all snippets
 */
export function TagManagement({
  snippets,
  onUpdate,
  onClose,
}: TagManagementProps): React.ReactElement {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingTag, setEditingTag] = useState<TagInfo | null>(null);
  const [newTagName, setNewTagName] = useState<string>('');
  const [newTagColor, setNewTagColor] = useState<string>('#EDEDED');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [allTags, setAllTags] = useState<Tag[]>([]);

  /**
   * Load all tags from database
   */
  useEffect(() => {
    const loadTags = async (): Promise<void> => {
      try {
        const tags = await getTags();
        setAllTags(tags);
      } catch (err) {
        console.error('Failed to load tags:', err);
      }
    };
    loadTags();
  }, []);

  /**
   * Extracts all unique tags from snippets with usage count and color
   */
  const tagInfos = useMemo(() => {
    const tagMap = new Map<string, { count: number; snippetIds: number[] }>();

    snippets.forEach((snippet) => {
      snippet.tags?.forEach((tag) => {
        const existing = tagMap.get(tag);
        if (existing) {
          existing.count++;
          existing.snippetIds.push(snippet.id);
        } else {
          tagMap.set(tag, { count: 1, snippetIds: [snippet.id] });
        }
      });
    });

    const tags: TagInfo[] = [];
    tagMap.forEach((value, key) => {
      const tagMeta = allTags.find((t) => t.name === key);
      tags.push({
        id: tagMeta?.id || 0,
        name: key,
        color: tagMeta?.color || '#EDEDED',
        count: value.count,
        snippetIds: value.snippetIds,
      });
    });

    // Sort by count (most used first), then alphabetically
    tags.sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.name.localeCompare(b.name);
    });

    return tags;
  }, [snippets, allTags]);

  /**
   * Filters tags based on search query
   */
  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) {
      return tagInfos;
    }
    const query = searchQuery.toLowerCase();
    return tagInfos.filter((tag) => tag.name.toLowerCase().includes(query));
  }, [tagInfos, searchQuery]);

  /**
   * Opens the edit modal for a tag
   */
  const startEdit = (tag: TagInfo): void => {
    setEditingTag(tag);
    setNewTagName(tag.name);
    setNewTagColor(tag.color);
  };

  /**
   * Cancels tag editing
   */
  const cancelEdit = (): void => {
    setEditingTag(null);
    setNewTagName('');
    setNewTagColor('#EDEDED');
  };

  /**
   * Saves the edited tag (name and/or color)
   */
  const saveEdit = async (): Promise<void> => {
    if (!editingTag) {
      return;
    }

    const nameChanged = newTagName.trim() && newTagName !== editingTag.name;
    const colorChanged = newTagColor !== editingTag.color;

    if (!nameChanged && !colorChanged) {
      cancelEdit();
      return;
    }

    setIsProcessing(true);
    try {
      // Update color if changed
      if (colorChanged) {
        await updateTagColor(editingTag.name, newTagColor);
      }

      // Update name if changed (must be done after color update)
      if (nameChanged) {
        const affectedSnippets = snippets.filter((s) => editingTag.snippetIds.includes(s.id));

        await Promise.all(
          affectedSnippets.map((snippet) => {
            const newTags = snippet.tags?.map((tag) =>
              tag === editingTag.name ? newTagName.trim() : tag
            );
            return updateSnippet(snippet.id, {
              name: snippet.name,
              content: snippet.content,
              description: snippet.description,
              tags: newTags,
            });
          })
        );
      }

      // Reload tags to get updated data
      const tags = await getTags();
      setAllTags(tags);

      cancelEdit();
      onUpdate();
    } catch (err) {
      console.error('Failed to update tag:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Deletes a tag from all snippets
   */
  const deleteTag = async (tagName: string): Promise<void> => {
    if (!confirm(`Delete tag "${tagName}" from all snippets?`)) {
      return;
    }

    setIsProcessing(true);
    try {
      const tagInfo = tagInfos.find((t) => t.name === tagName);
      if (!tagInfo) {
        return;
      }

      // Update all snippets that have this tag
      const affectedSnippets = snippets.filter((s) => tagInfo.snippetIds.includes(s.id));

      await Promise.all(
        affectedSnippets.map((snippet) => {
          const newTags = snippet.tags?.filter((tag) => tag !== tagName);
          return updateSnippet(snippet.id, {
            name: snippet.name,
            content: snippet.content,
            description: snippet.description,
            tags: newTags,
          });
        })
      );

      onUpdate();
    } catch (err) {
      console.error('Failed to delete tag:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] mx-4 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Tag Management</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Rename, change colors, or delete tags across all snippets
          </p>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <Input
            type="text"
            placeholder="Search tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search tags"
            fullWidth
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredTags.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery ? 'No tags match your search' : 'No tags found'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTags.map((tag) => (
                <Card key={tag.name}>
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge color={tag.color} size="md">
                          {tag.name}
                        </Badge>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Used in {tag.count} snippet{tag.count !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => startEdit(tag)}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          disabled={isProcessing}
                          title="Edit tag"
                          aria-label="Edit tag"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteTag(tag.name)}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded"
                          disabled={isProcessing}
                          title="Delete tag"
                          aria-label="Delete tag"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {tagInfos.length} total tag{tagInfos.length !== 1 ? 's' : ''}
          </p>
          <Button onClick={onClose} variant="secondary">
            Close
          </Button>
        </div>
      </div>

      {/* Edit Modal */}
      {editingTag && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
          onClick={cancelEdit}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Edit label</h3>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Preview */}
              <div className="flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <Badge color={newTagColor} size="md">
                  {newTagName || editingTag.name}
                </Badge>
              </div>

              {/* Name Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Name
                </label>
                <Input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      saveEdit();
                    } else if (e.key === 'Escape') {
                      cancelEdit();
                    }
                  }}
                  autoFocus
                  disabled={isProcessing}
                  aria-label="Tag name"
                  fullWidth
                />
              </div>

              {/* Color Picker */}
              <ColorPicker
                value={newTagColor}
                onChange={setNewTagColor}
                label="Color"
                disabled={isProcessing}
              />
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <Button onClick={cancelEdit} variant="secondary" size="sm" disabled={isProcessing}>
                Cancel
              </Button>
              <Button onClick={saveEdit} variant="primary" size="sm" disabled={isProcessing}>
                Save changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
