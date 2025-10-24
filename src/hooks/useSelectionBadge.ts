import { invoke } from '@tauri-apps/api/core';
import { useEffect } from 'react';

import { useSnippetStore } from '@/stores/snippetStore';

/**
 * Hook to sync selection count with menubar badge
 *
 * Automatically updates the menubar badge count whenever
 * the selection state changes
 */
export function useSelectionBadge(): void {
  const selectedSnippets = useSnippetStore((state) => state.selectedSnippets);

  useEffect(() => {
    const updateBadge = async (): Promise<void> => {
      try {
        await invoke('update_badge_count', { count: selectedSnippets.size });
      } catch (error) {
        console.error('Failed to update badge count:', error);
      }
    };

    void updateBadge();
  }, [selectedSnippets.size]);
}
