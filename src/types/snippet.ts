/**
 * Represents a text snippet stored in the database
 */
export interface Snippet {
  id: number;
  name: string;
  content: string;
  description: string | null;
  created_at: number;
  updated_at: number;
  tags?: string[];
}

/**
 * Input data for creating a new snippet
 */
export interface CreateSnippetInput {
  name: string;
  content: string;
  description?: string | null;
  tags?: string[];
}

/**
 * Input data for updating an existing snippet
 */
export interface UpdateSnippetInput {
  name: string;
  content: string;
  description?: string | null;
  tags?: string[];
}

/**
 * Search result with relevance scoring and usage statistics
 */
export interface SearchResult extends Snippet {
  usage_count: number;
  last_used: number | null;
  relevance_score: number;
}
