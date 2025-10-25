import { invoke } from '@tauri-apps/api/core';
import React, { useState, useEffect, useMemo } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { getAllSnippets, deleteSnippet } from '@/lib/api';
import { formatUserError, logError } from '@/lib/errorHandler';
import type { Snippet } from '@/types';
import type { ExportData } from '@/types/storage';

import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { DuplicateDetection } from './DuplicateDetection';
import { SnippetDetailPanel } from './SnippetDetailPanel';
import { TagManagement } from './TagManagement';

/**
 * Sorting options for snippet list
 */
type SortOption =
  | 'name_asc'
  | 'name_desc'
  | 'created_asc'
  | 'created_desc'
  | 'updated_asc'
  | 'updated_desc';

/**
 * SnippetsTab - Complete snippet management interface
 */
export function SnippetsTab(): React.ReactElement {
  // Data state
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('updated_desc');
  const [selectedSnippetIds, setSelectedSnippetIds] = useState<Set<number>>(new Set());
  const [selectedSnippet, setSelectedSnippet] = useState<Snippet | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    isOpen: boolean;
    snippetIds: number[];
    snippetNames: string[];
  }>({ isOpen: false, snippetIds: [], snippetNames: [] });
  const [showDuplicateDetection, setShowDuplicateDetection] = useState<boolean>(false);
  const [showTagManagement, setShowTagManagement] = useState<boolean>(false);

  // Load snippets on mount
  useEffect(() => {
    loadSnippets();
  }, []);

  /**
   * Loads all snippets from the database
   */
  const loadSnippets = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getAllSnippets();
      setSnippets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load snippets');
      console.error('Failed to load snippets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Filters and sorts snippets based on current state
   */
  const filteredAndSortedSnippets = useMemo(() => {
    let result = [...snippets];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((snippet) => {
        const nameMatch = snippet.name.toLowerCase().includes(query);
        const contentMatch = snippet.content.toLowerCase().includes(query);
        const tagsMatch = snippet.tags?.some((tag) => tag.toLowerCase().includes(query));
        return nameMatch || contentMatch || tagsMatch;
      });
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        case 'created_asc':
          return a.created_at - b.created_at;
        case 'created_desc':
          return b.created_at - a.created_at;
        case 'updated_asc':
          return a.updated_at - b.updated_at;
        case 'updated_desc':
          return b.updated_at - a.updated_at;
        default:
          return 0;
      }
    });

    return result;
  }, [snippets, searchQuery, sortBy]);

  /**
   * Toggles selection of a snippet
   */
  const toggleSnippetSelection = (id: number): void => {
    const newSelection = new Set(selectedSnippetIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedSnippetIds(newSelection);
  };

  /**
   * Selects all visible snippets
   */
  const selectAll = (): void => {
    const allIds = new Set(filteredAndSortedSnippets.map((s) => s.id));
    setSelectedSnippetIds(allIds);
  };

  /**
   * Clears all selections
   */
  const clearSelection = (): void => {
    setSelectedSnippetIds(new Set());
  };

  /**
   * Opens delete confirmation dialog for selected snippets
   */
  const handleDeleteSelected = (): void => {
    const idsToDelete = Array.from(selectedSnippetIds);
    const namesToDelete = snippets.filter((s) => selectedSnippetIds.has(s.id)).map((s) => s.name);

    setDeleteConfirmDialog({
      isOpen: true,
      snippetIds: idsToDelete,
      snippetNames: namesToDelete,
    });
  };

  /**
   * Opens delete confirmation dialog for a single snippet
   */
  const handleDeleteSingle = (snippet: Snippet): void => {
    setDeleteConfirmDialog({
      isOpen: true,
      snippetIds: [snippet.id],
      snippetNames: [snippet.name],
    });
  };

  /**
   * Confirms deletion of snippets
   */
  const confirmDelete = async (): Promise<void> => {
    const count = deleteConfirmDialog.snippetIds.length;
    const context = count === 1 ? 'snippet' : `${count} snippets`;

    try {
      // Delete all snippets
      await Promise.all(deleteConfirmDialog.snippetIds.map((id) => deleteSnippet(id)));

      // Clear selection and close dialog
      setSelectedSnippetIds(new Set());
      setDeleteConfirmDialog({ isOpen: false, snippetIds: [], snippetNames: [] });

      // Close detail panel if deleted snippet was selected
      if (selectedSnippet && deleteConfirmDialog.snippetIds.includes(selectedSnippet.id)) {
        setSelectedSnippet(null);
        setIsCreating(false);
      }

      // Reload snippets
      await loadSnippets();
    } catch (err) {
      logError(err, `Delete ${context}`);
      setError(formatUserError(err, context));

      // Keep dialog open so user can see what failed
      // Don't clear selection in case they want to retry
    }
  };

  /**
   * Cancels deletion
   */
  const cancelDelete = (): void => {
    setDeleteConfirmDialog({ isOpen: false, snippetIds: [], snippetNames: [] });
  };

  /**
   * Handles merging duplicate snippets
   */
  const handleMergeDuplicates = async (_keepId: number, removeIds: number[]): Promise<void> => {
    try {
      // Delete the duplicates (keep the selected one)
      await Promise.all(removeIds.map((id) => deleteSnippet(id)));

      // Reload snippets
      await loadSnippets();
    } catch (err) {
      console.error('Failed to merge duplicates:', err);
      setError(err instanceof Error ? err.message : 'Failed to merge duplicates');
    }
  };

  /**
   * Handles deleting multiple snippets from duplicate detection
   */
  const handleDeleteDuplicates = async (snippetIds: number[]): Promise<void> => {
    try {
      // Delete all specified snippets
      await Promise.all(snippetIds.map((id) => deleteSnippet(id)));

      // Reload snippets
      await loadSnippets();
    } catch (err) {
      console.error('Failed to delete duplicates:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete duplicates');
    }
  };

  /**
   * Exports selected snippets to JSON file
   */
  const handleExportSelected = async (): Promise<void> => {
    try {
      const selectedSnippets = snippets.filter((s) => selectedSnippetIds.has(s.id));

      if (selectedSnippets.length === 0) {
        return;
      }

      // Create export data
      const exportData: ExportData = {
        version: '1.0',
        exported_at: Date.now(),
        snippets: selectedSnippets.map((s) => ({
          name: s.name,
          content: s.content,
          description: s.description,
          tags: s.tags ?? [],
          created_at: s.created_at,
          updated_at: s.updated_at,
        })),
      };

      const exportJson = JSON.stringify(exportData, null, 2);

      // Use Tauri command to save file
      await invoke('export_selected_snippets', { data: exportJson });

      // Clear selection after export
      setSelectedSnippetIds(new Set());
    } catch (err) {
      console.error('Failed to export snippets:', err);
      setError(err instanceof Error ? err.message : 'Failed to export snippets');
    }
  };

  /**
   * Opens the create new snippet panel
   */
  const handleCreateNew = (): void => {
    setSelectedSnippet(null);
    setIsCreating(true);
  };

  /**
   * Handles snippet selection for editing
   */
  const handleSnippetClick = (snippet: Snippet): void => {
    setSelectedSnippet(snippet);
    setIsCreating(false);
  };

  /**
   * Handles successful save (create or update)
   */
  const handleSaveSuccess = (): void => {
    setSelectedSnippet(null);
    setIsCreating(false);
    loadSnippets();
  };

  /**
   * Handles cancel from detail panel
   */
  const handleCancel = (): void => {
    setSelectedSnippet(null);
    setIsCreating(false);
  };

  const isDetailPanelOpen = isCreating || selectedSnippet !== null;
  const hasSelection = selectedSnippetIds.size > 0;

  return (
    <div className="flex h-full gap-6">
      {/* Left Panel - Snippet List */}
      <div className="flex-1 flex flex-col min-w-0">
        <Card className="flex-1 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Snippets</h2>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <Button onClick={() => setShowTagManagement(true)} variant="secondary" size="sm">
                  Manage Tags
                </Button>
                <Button
                  onClick={() => setShowDuplicateDetection(true)}
                  variant="secondary"
                  size="sm"
                >
                  Find Duplicates
                </Button>
                <Button onClick={handleCreateNew} variant="primary" size="sm">
                  Create New
                </Button>
              </div>
            </div>

            {/* Search and filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Search snippets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search snippets"
                />
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                aria-label="Sort by"
              >
                <option value="updated_desc">Recently Updated</option>
                <option value="updated_asc">Least Recently Updated</option>
                <option value="created_desc">Newest First</option>
                <option value="created_asc">Oldest First</option>
                <option value="name_asc">Name (A-Z)</option>
                <option value="name_desc">Name (Z-A)</option>
              </select>
            </div>

            {/* Bulk operations */}
            {hasSelection && (
              <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {selectedSnippetIds.size} selected
                </span>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={clearSelection} variant="secondary" size="sm">
                    Clear Selection
                  </Button>
                  <Button onClick={handleExportSelected} variant="secondary" size="sm">
                    Export
                  </Button>
                  <Button onClick={handleDeleteSelected} variant="danger" size="sm">
                    Delete Selected
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Snippet List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Spinner size="lg" />
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                  <Button onClick={loadSnippets} variant="secondary">
                    Retry
                  </Button>
                </div>
              </div>
            ) : filteredAndSortedSnippets.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500 dark:text-gray-400">
                  {searchQuery ? 'No snippets match your search' : 'No snippets yet'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {/* Select All */}
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={
                        filteredAndSortedSnippets.length > 0 &&
                        filteredAndSortedSnippets.every((s) => selectedSnippetIds.has(s.id))
                      }
                      onChange={(checked) => {
                        if (checked) {
                          selectAll();
                        } else {
                          clearSelection();
                        }
                      }}
                      aria-label="Select all snippets"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Select All
                    </span>
                  </label>
                </div>

                {/* Snippet items */}
                {filteredAndSortedSnippets.map((snippet) => (
                  <SnippetListItem
                    key={snippet.id}
                    snippet={snippet}
                    isSelected={selectedSnippetIds.has(snippet.id)}
                    isActive={selectedSnippet?.id === snippet.id}
                    onToggleSelect={() => toggleSnippetSelection(snippet.id)}
                    onClick={() => handleSnippetClick(snippet)}
                    onDelete={() => handleDeleteSingle(snippet)}
                  />
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Right Panel - Detail/Edit */}
      {isDetailPanelOpen && (
        <div className="w-[500px] flex-shrink-0">
          <SnippetDetailPanel
            snippet={selectedSnippet}
            isCreating={isCreating}
            onSave={handleSaveSuccess}
            onCancel={handleCancel}
          />
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={deleteConfirmDialog.isOpen}
        snippetNames={deleteConfirmDialog.snippetNames}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

      {/* Duplicate Detection */}
      {showDuplicateDetection && (
        <DuplicateDetection
          snippets={snippets}
          onMerge={handleMergeDuplicates}
          onDelete={handleDeleteDuplicates}
          onClose={() => setShowDuplicateDetection(false)}
        />
      )}

      {/* Tag Management */}
      {showTagManagement && (
        <TagManagement
          snippets={snippets}
          onUpdate={loadSnippets}
          onClose={() => setShowTagManagement(false)}
        />
      )}
    </div>
  );
}

/**
 * Individual snippet list item
 */
interface SnippetListItemProps {
  snippet: Snippet;
  isSelected: boolean;
  isActive: boolean;
  onToggleSelect: () => void;
  onClick: () => void;
  onDelete: () => void;
}

function SnippetListItem({
  snippet,
  isSelected,
  isActive,
  onToggleSelect,
  onClick,
  onDelete,
}: SnippetListItemProps): React.ReactElement {
  const handleCheckboxChange = (e: React.MouseEvent): void => {
    e.stopPropagation();
    onToggleSelect();
  };

  const handleDeleteClick = (e: React.MouseEvent): void => {
    e.stopPropagation();
    onDelete();
  };

  return (
    <div
      className={`
        p-4 cursor-pointer transition-colors
        ${isActive ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}
      `}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <div onClick={handleCheckboxChange} className="pt-1">
          <Checkbox
            checked={isSelected}
            onChange={() => {}}
            aria-label={`Select ${snippet.name}`}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">{snippet.name}</h3>
          {snippet.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
              {snippet.description}
            </p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span>Updated {formatRelativeTime(snippet.updated_at)}</span>
            {snippet.tags && snippet.tags.length > 0 && (
              <span className="truncate">Tags: {snippet.tags.join(', ')}</span>
            )}
          </div>
        </div>

        {/* Delete button */}
        <button
          onClick={handleDeleteClick}
          className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-1"
          aria-label="Delete snippet"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
  );
}

/**
 * Formats a timestamp as relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}
