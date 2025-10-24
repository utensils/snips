import React, { useState, useMemo } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { updateSnippet } from '@/lib/api';
import type { Snippet } from '@/types';

/**
 * TagManagement Props
 */
interface TagManagementProps {
  snippets: Snippet[];
  onUpdate: () => void;
  onClose: () => void;
}

/**
 * Tag information with usage count
 */
interface TagInfo {
  name: string;
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
  const [renamingTag, setRenamingTag] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  /**
   * Extracts all unique tags from snippets with usage count
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
      tags.push({
        name: key,
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
  }, [snippets]);

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
   * Starts renaming a tag
   */
  const startRename = (tagName: string): void => {
    setRenamingTag(tagName);
    setNewTagName(tagName);
  };

  /**
   * Cancels tag rename
   */
  const cancelRename = (): void => {
    setRenamingTag(null);
    setNewTagName('');
  };

  /**
   * Renames a tag across all snippets
   */
  const confirmRename = async (oldName: string): Promise<void> => {
    if (!newTagName.trim() || newTagName === oldName) {
      cancelRename();
      return;
    }

    setIsProcessing(true);
    try {
      const tagInfo = tagInfos.find((t) => t.name === oldName);
      if (!tagInfo) {
        return;
      }

      // Update all snippets that have this tag
      const affectedSnippets = snippets.filter((s) => tagInfo.snippetIds.includes(s.id));

      await Promise.all(
        affectedSnippets.map((snippet) => {
          const newTags = snippet.tags?.map((tag) => (tag === oldName ? newTagName.trim() : tag));
          return updateSnippet(snippet.id, {
            name: snippet.name,
            content: snippet.content,
            description: snippet.description,
            tags: newTags,
          });
        })
      );

      cancelRename();
      onUpdate();
    } catch (err) {
      console.error('Failed to rename tag:', err);
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
            Rename or delete tags across all snippets
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
                    {renamingTag === tag.name ? (
                      <div className="flex items-center gap-3">
                        <Input
                          type="text"
                          value={newTagName}
                          onChange={(e) => setNewTagName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              confirmRename(tag.name);
                            } else if (e.key === 'Escape') {
                              cancelRename();
                            }
                          }}
                          autoFocus
                          disabled={isProcessing}
                          aria-label="New tag name"
                        />
                        <Button
                          onClick={() => confirmRename(tag.name)}
                          variant="primary"
                          size="sm"
                          disabled={isProcessing}
                        >
                          Save
                        </Button>
                        <Button
                          onClick={cancelRename}
                          variant="secondary"
                          size="sm"
                          disabled={isProcessing}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-gray-100">
                            {tag.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Used in {tag.count} snippet{tag.count !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => startRename(tag.name)}
                            className="px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                            disabled={isProcessing}
                          >
                            Rename
                          </button>
                          <button
                            onClick={() => deleteTag(tag.name)}
                            className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                            disabled={isProcessing}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
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
    </div>
  );
}
