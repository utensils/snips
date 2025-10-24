-- Create indexes for performance

-- Index for analytics queries by snippet_id
CREATE INDEX idx_analytics_snippet_id ON analytics(snippet_id);

-- Index for analytics queries by timestamp
CREATE INDEX idx_analytics_used_at ON analytics(used_at);

-- Index for snippet_tags queries by snippet_id
CREATE INDEX idx_snippet_tags_snippet_id ON snippet_tags(snippet_id);

-- Index for snippet_tags queries by tag_id
CREATE INDEX idx_snippet_tags_tag_id ON snippet_tags(tag_id);
