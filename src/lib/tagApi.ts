/**
 * API functions for tag operations
 */

import { invoke } from '@tauri-apps/api/core';

import type { Tag } from '@/types/tag';

/**
 * Get all tags with their colors
 *
 * @returns Promise resolving to array of tags
 */
export async function getTags(): Promise<Tag[]> {
  return invoke<Tag[]>('get_tags');
}

/**
 * Update the color of a tag
 *
 * @param tagName - Name of the tag to update
 * @param color - New hex color (e.g., "#FF5733")
 * @returns Promise that resolves when update is complete
 */
export async function updateTagColor(tagName: string, color: string): Promise<void> {
  return invoke<void>('update_tag_color_cmd', { tagName, color });
}
