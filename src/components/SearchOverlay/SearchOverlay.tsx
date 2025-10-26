import { invoke } from '@tauri-apps/api/core';
import { type CSSProperties, type ReactElement, useCallback, useEffect, useRef } from 'react';
import { List, type ListImperativeAPI } from 'react-window';

import { CheckSymbolic, CloseSymbolic, WindowScaffold } from '@/components/adwaita';
import { ContentArea, Surface, Toolbar, ToolbarIconButton } from '@/components/ui';
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

interface VirtualizedRowCustomProps {
  searchResults: SearchResult[];
  isSelected: (id: number) => boolean;
  toggleSelected: (id: number) => void;
  focusedIndex: number;
}

interface VirtualizedRowProps extends VirtualizedRowCustomProps {
  index: number;
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
      return 'bg-[color-mix(in_srgb,hsl(var(--accent))_24%,hsl(var(--surface-raised)))] border-l-2 border-[hsl(var(--accent))]';
    }
    if (isSelected) {
      return 'bg-[color-mix(in_srgb,hsl(var(--accent))_18%,hsl(var(--surface-raised)))] border-l-2 border-[color-mix(in_srgb,hsl(var(--accent))_85%,transparent)]';
    }
    if (isFocused) {
      return 'bg-[color-mix(in_srgb,hsl(var(--accent))_12%,hsl(var(--surface-raised)))]';
    }
    return 'hover:bg-[color-mix(in_srgb,hsl(var(--accent))_6%,hsl(var(--surface-raised)))]';
  };

  return (
    <div
      style={style}
      onClick={onToggleSelect}
      className={`
        cursor-pointer border-b border-[hsl(var(--outline-soft))] px-4 py-3 transition-colors duration-150
        ${getBackgroundClass()}
      `}
      role="button"
      tabIndex={-1}
      aria-label={`${isSelected ? 'Deselect' : 'Select'} snippet: ${result.name}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-5 w-5 items-center justify-center">
          {isSelected ? (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[hsl(var(--color-accent-primary))] text-[hsl(var(--color-accent-foreground))]">
              <CheckSymbolic size={11} />
            </span>
          ) : (
            <span className="h-5 w-5 rounded-full border-2 border-[hsl(var(--outline-soft))]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h3
              className={`truncate font-medium ${
                isSelected
                  ? 'text-[color:hsl(var(--accent-foreground))]'
                  : 'text-[color:hsl(var(--text-primary))]'
              }`}
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
            className={`line-clamp-2 text-sm ${
              isSelected
                ? 'text-[color:hsl(var(--accent-foreground))]'
                : 'text-[color:hsl(var(--text-secondary))]'
            }`}
          >
            {result.content}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Wrapper component for virtualized row
 */
function VirtualizedRow({
  index,
  style,
  searchResults,
  isSelected,
  toggleSelected,
  focusedIndex,
}: VirtualizedRowProps): ReactElement | null {
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
  const listRef = useRef<ListImperativeAPI>(null);

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

  // Handle select all snippets
  const handleSelectAll = useCallback(() => {
    if (searchResults.length === 0) {
      return;
    }

    // Check if all are already selected
    const allSelected = searchResults.every((r) => selectedSnippets.has(r.id));

    if (allSelected) {
      // Deselect all
      clearSelected();
    } else {
      // Select all visible search results
      searchResults.forEach((r) => {
        if (!selectedSnippets.has(r.id)) {
          toggleSelected(r.id);
        }
      });
    }
  }, [searchResults, selectedSnippets, clearSelected, toggleSelected]);

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
    onSelectAll: handleSelectAll,
    onEscape: handleClose,
    enabled: searchResults.length > 0,
  });

  // Scroll to focused item
  useEffect(() => {
    if (listRef.current && searchResults.length > 0) {
      listRef.current.scrollToRow({ index: focusedIndex, align: 'smart' });
    }
  }, [focusedIndex, searchResults.length]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Global Escape key handler (works even when no results)
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [handleClose]);

  const hasResults = searchResults.length > 0;
  const showEmpty = !isSearching && debouncedQuery.trim() && !hasResults;
  const showResults = !isSearching && hasResults;
  const listHeight = Math.min(searchResults.length, MAX_VISIBLE_ITEMS) * ITEM_HEIGHT;
  const allSelected = hasResults && searchResults.every((r) => selectedSnippets.has(r.id));

  return (
    <WindowScaffold
      variant="overlay"
      size="wide"
      fullHeight
      contentClassName="flex h-full flex-col gap-3 motion-safe:animate-fade-in-scale"
    >
      <Toolbar
        className="rounded-t-[16px] flex-col gap-3 border border-transparent bg-[hsl(var(--surface-raised))] md:flex-row md:items-center md:justify-between"
        data-tauri-drag-region
      >
        <div className="flex w-full items-center gap-3">
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
        <ToolbarIconButton aria-label="Close search" onClick={handleClose}>
          <CloseSymbolic size={14} />
        </ToolbarIconButton>
      </Toolbar>

      <ContentArea className="flex flex-1 flex-col overflow-hidden" spacing="md">
        {hasResults && (
          <Surface
            level="subtle"
            padding="md"
            className="flex flex-col gap-2 text-[color:hsl(var(--text-primary))] md:flex-row md:items-center md:justify-between"
          >
            <span className="typography-body text-[color:hsl(var(--text-secondary))]">
              {selectedSnippets.size > 0
                ? `${selectedSnippets.size} of ${searchResults.length} selected`
                : `${searchResults.length} result${searchResults.length === 1 ? '' : 's'}`}
            </span>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="ghost" onClick={handleSelectAll}>
                {allSelected ? 'Deselect All' : 'Select All'}
              </Button>
              {selectedSnippets.size > 0 && (
                <>
                  <Button size="sm" variant="ghost" onClick={() => clearSelected()}>
                    Clear
                  </Button>
                  <Button size="sm" onClick={handleCopy}>
                    Copy ({selectedSnippets.size})
                  </Button>
                </>
              )}
            </div>
          </Surface>
        )}

        <Surface level="raised" padding="none" className="flex flex-1 flex-col overflow-hidden">
          {isSearching && (
            <div className="flex h-32 items-center justify-center text-[color:hsl(var(--text-secondary))]">
              <Spinner size="lg" />
            </div>
          )}

          {showEmpty && (
            <div className="flex h-32 flex-col items-center justify-center text-[color:hsl(var(--text-secondary))]">
              <p className="typography-heading">No snippets found</p>
              <p className="typography-body mt-1">Try a different search term</p>
            </div>
          )}

          {showResults && (
            <List<VirtualizedRowCustomProps>
              listRef={listRef}
              defaultHeight={listHeight}
              rowCount={searchResults.length}
              rowHeight={ITEM_HEIGHT}
              overscanCount={3}
              rowComponent={VirtualizedRow}
              rowProps={{
                searchResults,
                isSelected,
                toggleSelected,
                focusedIndex,
              }}
            />
          )}

          {!isSearching && !debouncedQuery.trim() && (
            <div className="flex flex-col items-center justify-center p-8 text-[color:hsl(var(--text-secondary))]">
              <p className="mb-4 text-lg font-medium text-[color:hsl(var(--text-primary))]">
                Start typing to search snippets
              </p>
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
                  <KeyboardShortcutHint keys={['⌘/Ctrl', 'A']} />
                  <span>Select all</span>
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
        </Surface>
      </ContentArea>

      {toast && <Toast {...toast} />}
    </WindowScaffold>
  );
}
