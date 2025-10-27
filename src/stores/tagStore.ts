import { create } from 'zustand';

import { getTags } from '@/lib/tagApi';
import type { Tag } from '@/types/tag';

/**
 * Interface for the tag store state and actions
 */
interface TagStore {
  // Tags state
  tags: Tag[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadTags: () => Promise<void>;
  getTagColor: (tagName: string) => string;
}

/**
 * Zustand store for managing tag-related state
 * Provides a single source of truth for tags across the application
 */
export const useTagStore = create<TagStore>((set, get) => ({
  // Initial state
  tags: [],
  isLoading: false,
  error: null,

  // Load tags from the database
  loadTags: async () => {
    try {
      set({ isLoading: true, error: null });
      const loadedTags = await getTags();
      set({ tags: loadedTags, isLoading: false });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to load tags';
      console.error('Failed to load tags:', err);
      set({ error, isLoading: false });
    }
  },

  // Get the color for a tag name
  getTagColor: (tagName: string) => {
    const tag = get().tags.find((t) => t.name === tagName);
    return tag?.color || '#EDEDED';
  },
}));
