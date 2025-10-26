/**
 * Represents a tag that can be associated with snippets
 */
export interface Tag {
  id: number;
  name: string;
  color: string;
}

/**
 * Association between a snippet and a tag
 */
export interface SnippetTag {
  snippet_id: number;
  tag_id: number;
}
