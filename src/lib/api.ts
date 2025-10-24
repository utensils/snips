import { invoke } from '@tauri-apps/api/core';

import type {
  Snippet,
  CreateSnippetInput,
  UpdateSnippetInput,
  SearchResult,
  SnippetAnalytics,
  GlobalAnalytics,
} from '@/types';

/**
 * API client wrapper for Tauri commands
 * Provides type-safe interfaces for all backend operations
 */

// ============================================================================
// Snippet Management Commands
// ============================================================================

/**
 * Creates a new snippet
 * @param input - Snippet creation data
 * @returns The created snippet
 */
export async function createSnippet(input: CreateSnippetInput): Promise<Snippet> {
  return await invoke<Snippet>('create_snippet', {
    name: input.name,
    content: input.content,
    description: input.description ?? null,
    tags: input.tags ?? [],
  });
}

/**
 * Retrieves a single snippet by ID
 * @param id - Snippet ID
 * @returns The requested snippet
 */
export async function getSnippet(id: number): Promise<Snippet> {
  return await invoke<Snippet>('get_snippet', { id });
}

/**
 * Retrieves all snippets
 * @returns Array of all snippets
 */
export async function getAllSnippets(): Promise<Snippet[]> {
  return await invoke<Snippet[]>('get_all_snippets');
}

/**
 * Updates an existing snippet
 * @param id - Snippet ID
 * @param input - Updated snippet data
 * @returns The updated snippet
 */
export async function updateSnippet(id: number, input: UpdateSnippetInput): Promise<Snippet> {
  return await invoke<Snippet>('update_snippet', {
    id,
    name: input.name,
    content: input.content,
    description: input.description ?? null,
    tags: input.tags ?? [],
  });
}

/**
 * Deletes a snippet
 * @param id - Snippet ID
 */
export async function deleteSnippet(id: number): Promise<void> {
  await invoke<void>('delete_snippet', { id });
}

// ============================================================================
// Search Commands
// ============================================================================

/**
 * Searches snippets using full-text search
 * @param query - Search query string
 * @param limit - Optional maximum number of results
 * @returns Array of search results with relevance scoring
 */
export async function searchSnippets(query: string, limit?: number): Promise<SearchResult[]> {
  return await invoke<SearchResult[]>('search_snippets', {
    query,
    limit: limit ?? null,
  });
}

// ============================================================================
// Analytics Commands
// ============================================================================

/**
 * Records usage of a snippet for analytics
 * @param snippetId - ID of the snippet that was used
 */
export async function recordSnippetUsage(snippetId: number): Promise<void> {
  await invoke<void>('record_snippet_usage', { snippetId });
}

/**
 * Retrieves analytics for a specific snippet
 * @param snippetId - Snippet ID
 * @returns Analytics data for the snippet
 */
export async function getSnippetAnalytics(snippetId: number): Promise<SnippetAnalytics> {
  return await invoke<SnippetAnalytics>('get_snippet_analytics', { snippetId });
}

/**
 * Retrieves global analytics across all snippets
 * @returns Global analytics data
 */
export async function getGlobalAnalytics(): Promise<GlobalAnalytics> {
  return await invoke<GlobalAnalytics>('get_global_analytics');
}

// ============================================================================
// Clipboard Commands
// ============================================================================

/**
 * Copies text to the system clipboard
 * @param text - Text to copy
 */
export async function copyToClipboard(text: string): Promise<void> {
  await invoke<void>('copy_to_clipboard', { text });
}

/**
 * Gets the currently selected text from the active application
 * @returns The selected text
 */
export async function getSelectedText(): Promise<string> {
  return await invoke<string>('get_selected_text');
}
