import { invoke } from '@tauri-apps/api/core';
import { type CSSProperties, type ReactElement, useCallback, useEffect, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { KeyboardShortcutHint } from '@/components/ui/KeyboardShortcutsHelp';
import { Spinner } from '@/components/ui/Spinner';
import { Toast, useToast } from '@/components/ui/Toast';
import { useDebounce } from '@/hooks/useDebounce';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { useSelectionBadge } from '@/hooks/useSelectionBadge';
import { useSnippetStore } from '@/stores/snippetStore';
import type { SearchResult } from '@/types';

const ITEM_HEIGHT = 80;
const MAX_VISIBLE_ITEMS = 8;

interface SearchResultItemProps {
  result: SearchResult;
  isSelected: boolean;
  isFocused: boolean;
  onToggleSelect: () => void;
  style: CSSProperties;
}

/**
 * Individual search result item component
 */
function SearchResultItem({
  result,
  isSelected,
  isFocused,
  onToggleSelect,
  style,
}: SearchResultItemProps): ReactElement {
  // Determine background color based on selection and focus state
  const getBackgroundClass = (): string => {
    if (isSelected && isFocused) {
      return 'bg-blue-100 dark:bg-blue-900/40 border-l-4 border-l-blue-500 dark:border-l-blue-400';
    }
    if (isSelected) {
      return 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-400 dark:border-l-blue-500';
    }
    if (isFocused) {
      return 'bg-gray-100 dark:bg-gray-800';
    }
    return 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50';
  };

  return (
    <div
      style={style}
      onClick={onToggleSelect}
      className={`
        px-4 py-3 border-b border-gray-200 dark:border-gray-700 transition-all duration-150 cursor-pointer
        ${getBackgroundClass()}
      `}
      role="button"
      tabIndex={-1}
      aria-label={`${isSelected ? 'Deselect' : 'Select'} snippet: ${result.name}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-5 h-5 mt-0.5">
          {isSelected ? (
            <svg
              className="w-5 h-5 text-blue-600 dark:text-blue-400"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded-full" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3
              className={`font-medium truncate ${isSelected ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-gray-100'}`}
            >
              {result.name}
            </h3>
            {result.usage_count > 0 && (
              <Badge variant="secondary" size="sm">
                {result.usage_count}x
              </Badge>
            )}
            {result.tags && result.tags.length > 0 && (
              <>
                {result.tags.map((tag) => (
                  <Badge key={tag} size="sm">
                    {tag}
                  </Badge>
                ))}
              </>
            )}
          </div>
          <p
            className={`text-sm line-clamp-2 ${isSelected ? 'text-blue-800 dark:text-blue-200' : 'text-gray-600 dark:text-gray-300'}`}
          >
            {result.content}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * SearchOverlay component - main search interface
 *
 * Features:
 * - Real-time search with debouncing
 * - Virtualized list for performance
 * - Multi-select with checkboxes
 * - Keyboard navigation (arrows, Enter, Space, Escape)
 * - Copy selected snippets to clipboard
 */
export function SearchOverlay(): ReactElement {
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    setSearchResults,
    isSearching,
    setIsSearching,
    selectedSnippets,
    toggleSelected,
    clearSelected,
    isSelected,
  } = useSnippetStore();

  const { toast, showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<List>(null);

  const debouncedQuery = useDebounce(searchQuery, 300);

  // Update menubar badge count when selection changes
  useSelectionBadge();

  // Perform search when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const performSearch = async (): Promise<void> => {
      setIsSearching(true);
      try {
        const results = await invoke<SearchResult[]>('search_snippets', {
          query: debouncedQuery,
          limit: 50,
        });
        setSearchResults(results);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    performSearch();
  }, [debouncedQuery, setSearchResults, setIsSearching]);

  // Handle window close
  const handleClose = useCallback(async () => {
    try {
      await invoke('hide_search_window');
    } catch (error) {
      console.error('Failed to hide window:', error);
    }
  }, []);

  // Handle copy to clipboard
  const handleCopy = useCallback(async () => {
    if (selectedSnippets.size === 0) {
      showToast('No snippets selected', 'warning');
      return;
    }

    try {
      // Get selected snippets in order
      const selectedResults = searchResults.filter((r) => selectedSnippets.has(r.id));

      // Concatenate content with double newline separator (empty line between)
      const content = selectedResults.map((r) => r.content).join('\n\n');

      // Copy to clipboard using Tauri command
      await invoke('copy_to_clipboard', { text: content });

      // Show success feedback
      const count = selectedSnippets.size;
      showToast(`Copied ${count} snippet${count === 1 ? '' : 's'} to clipboard`, 'success', 2000);

      // Clear selection and close window after a brief delay
      setTimeout(async () => {
        clearSelected();
        await handleClose();
      }, 500);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      showToast('Failed to copy to clipboard', 'error');
    }
  }, [selectedSnippets, searchResults, clearSelected, handleClose, showToast]);

  // Keyboard navigation
  const { focusedIndex } = useKeyboardNavigation({
    itemCount: searchResults.length,
    onSelect: (index) => {
      const result = searchResults[index];
      if (result) {
        toggleSelected(result.id);
      }
    },
    onToggle: (index) => {
      const result = searchResults[index];
      if (result) {
        toggleSelected(result.id);
      }
    },
    onEscape: handleClose,
    enabled: searchResults.length > 0,
  });

  // Scroll to focused item
  useEffect(() => {
    if (listRef.current && searchResults.length > 0) {
      listRef.current.scrollToItem(focusedIndex, 'smart');
    }
  }, [focusedIndex, searchResults.length]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const hasResults = searchResults.length > 0;
  const showEmpty = !isSearching && debouncedQuery.trim() && !hasResults;
  const showResults = !isSearching && hasResults;
  const listHeight = Math.min(searchResults.length, MAX_VISIBLE_ITEMS) * ITEM_HEIGHT;

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900 animate-fade-in-scale">
      {/* Header */}
      <div
        className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 animate-slide-down"
        data-tauri-drag-region
      >
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search snippets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              fullWidth
              autoFocus
              aria-label="Search snippets"
            />
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose} aria-label="Close">
            Esc
          </Button>
        </div>

        {/* Selected count indicator */}
        {selectedSnippets.size > 0 && (
          <div className="mt-3 flex items-center justify-between animate-slide-down">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {selectedSnippets.size} snippet{selectedSnippets.size === 1 ? '' : 's'} selected
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => clearSelected()}>
                Clear
              </Button>
              <Button size="sm" onClick={handleCopy}>
                Copy All
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {/* Loading state */}
        {isSearching && (
          <div className="flex items-center justify-center h-32">
            <Spinner size="lg" />
          </div>
        )}

        {/* Empty state */}
        {showEmpty && (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-gray-400">
            <p className="text-lg font-medium">No snippets found</p>
            <p className="text-sm mt-1">Try a different search term</p>
          </div>
        )}

        {/* Results list */}
        {showResults && (
          <List
            ref={listRef}
            height={listHeight}
            itemCount={searchResults.length}
            itemSize={ITEM_HEIGHT}
            width="100%"
            overscanCount={3}
          >
            {({ index, style }: { index: number; style: CSSProperties }) => {
              const result = searchResults[index];
              if (!result) {
                return null;
              }
              return (
                <SearchResultItem
                  result={result}
                  isSelected={isSelected(result.id)}
                  isFocused={index === focusedIndex}
                  onToggleSelect={() => toggleSelected(result.id)}
                  style={style}
                />
              );
            }}
          </List>
        )}

        {/* Initial state with keyboard shortcuts help */}
        {!isSearching && !debouncedQuery.trim() && (
          <div className="flex flex-col items-center justify-center p-8 text-gray-500 dark:text-gray-400">
            <p className="text-lg mb-4">Start typing to search snippets</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <KeyboardShortcutHint keys={['↑', '↓']} />
                <span>Navigate results</span>
              </div>
              <div className="flex items-center gap-2">
                <KeyboardShortcutHint keys={['Space']} />
                <span>Toggle selection</span>
              </div>
              <div className="flex items-center gap-2">
                <KeyboardShortcutHint keys={['Enter']} />
                <span>Copy selected</span>
              </div>
              <div className="flex items-center gap-2">
                <KeyboardShortcutHint keys={['Esc']} />
                <span>Close window</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast notification */}
      {toast && <Toast {...toast} />}
    </div>
  );
}
