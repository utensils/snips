import { create } from 'zustand';

import type { SearchResult } from '@/types';

/**
 * Interface for the snippet store state and actions
 */
interface SnippetStore {
  // Selected snippets for multi-select functionality
  selectedSnippets: Set<number>;
  addSelected: (id: number) => void;
  removeSelected: (id: number) => void;
  toggleSelected: (id: number) => void;
  clearSelected: () => void;
  isSelected: (id: number) => boolean;

  // Search results
  searchResults: SearchResult[];
  setSearchResults: (results: SearchResult[]) => void;
  clearSearchResults: () => void;

  // Current search query
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Loading states
  isSearching: boolean;
  setIsSearching: (loading: boolean) => void;
}

/**
 * Zustand store for managing snippet-related state
 * Handles multi-select, search results, and search query state
 */
export const useSnippetStore = create<SnippetStore>((set, get) => ({
  // Selection state
  selectedSnippets: new Set<number>(),

  addSelected: (id: number) =>
    set((state) => ({
      selectedSnippets: new Set(state.selectedSnippets).add(id),
    })),

  removeSelected: (id: number) =>
    set((state) => {
      const newSet = new Set(state.selectedSnippets);
      newSet.delete(id);
      return { selectedSnippets: newSet };
    }),

  toggleSelected: (id: number) => {
    const { selectedSnippets, addSelected, removeSelected } = get();
    if (selectedSnippets.has(id)) {
      removeSelected(id);
    } else {
      addSelected(id);
    }
  },

  clearSelected: () => set({ selectedSnippets: new Set<number>() }),

  isSelected: (id: number) => get().selectedSnippets.has(id),

  // Search results state
  searchResults: [],
  setSearchResults: (results: SearchResult[]) => set({ searchResults: results }),
  clearSearchResults: () => set({ searchResults: [] }),

  // Search query state
  searchQuery: '',
  setSearchQuery: (query: string) => set({ searchQuery: query }),

  // Loading state
  isSearching: false,
  setIsSearching: (loading: boolean) => set({ isSearching: loading }),
}));
