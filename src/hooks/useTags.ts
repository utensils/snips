/**
 * Hook for managing tags and their colors
 * Uses shared Zustand store to prevent redundant fetches
 */

import { useEffect } from 'react';

import { useTagStore } from '@/stores/tagStore';
import type { Tag } from '@/types/tag';

/**
 * Hook to load and manage tags
 * Loads tags from store on first mount, reuses cached data afterwards
 *
 * @returns Object containing tags array and helper functions
 */
export function useTags(): {
  tags: Tag[];
  loading: boolean;
  getTagColor: (tagName: string) => string;
  reload: () => Promise<void>;
} {
  const tags = useTagStore((state) => state.tags);
  const loading = useTagStore((state) => state.isLoading);
  const loadTags = useTagStore((state) => state.loadTags);
  const getTagColor = useTagStore((state) => state.getTagColor);

  // Load tags on first mount if not already loaded
  useEffect(() => {
    if (tags.length === 0 && !loading) {
      loadTags();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    tags,
    loading,
    getTagColor,
    reload: loadTags,
  };
}
