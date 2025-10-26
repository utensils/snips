/**
 * Hook for managing tags and their colors
 */

import { useEffect, useState } from 'react';

import { getTags } from '@/lib/tagApi';
import type { Tag } from '@/types/tag';

/**
 * Hook to load and manage tags
 *
 * @returns Object containing tags array and helper functions
 */
export function useTags(): {
  tags: Tag[];
  loading: boolean;
  getTagColor: (tagName: string) => string;
  reload: () => Promise<void>;
} {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTags = async (): Promise<void> => {
    try {
      setLoading(true);
      const loadedTags = await getTags();
      setTags(loadedTags);
    } catch (err) {
      console.error('Failed to load tags:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTags();
  }, []);

  /**
   * Get the color for a tag name
   * Returns default color if tag not found
   */
  const getTagColor = (tagName: string): string => {
    const tag = tags.find((t) => t.name === tagName);
    return tag?.color || '#EDEDED';
  };

  return {
    tags,
    loading,
    getTagColor,
    reload: loadTags,
  };
}
