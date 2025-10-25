-- Fix FTS5 tags column mismatch issue
-- The tags column in snippets_fts was trying to sync with snippets table
-- but tags are stored separately in the tags/snippet_tags tables.

-- Drop existing FTS5 table and triggers
DROP TRIGGER IF EXISTS snippets_ai;
DROP TRIGGER IF EXISTS snippets_ad;
DROP TRIGGER IF EXISTS snippets_au;
DROP TABLE IF EXISTS snippets_fts;

-- Recreate FTS5 table WITHOUT tags column
-- Tags will be searched separately via joins
CREATE VIRTUAL TABLE snippets_fts USING fts5(
    name,
    content,
    content=snippets,
    content_rowid=id
);

-- Rebuild FTS5 index from existing snippets
INSERT INTO snippets_fts(rowid, name, content)
SELECT id, name, content FROM snippets;

-- Trigger to insert into FTS5 when snippet is created
CREATE TRIGGER snippets_ai AFTER INSERT ON snippets BEGIN
    INSERT INTO snippets_fts(rowid, name, content)
    VALUES (new.id, new.name, new.content);
END;

-- Trigger to delete from FTS5 when snippet is deleted
CREATE TRIGGER snippets_ad AFTER DELETE ON snippets BEGIN
    DELETE FROM snippets_fts WHERE rowid = old.id;
END;

-- Trigger to update FTS5 when snippet is updated
CREATE TRIGGER snippets_au AFTER UPDATE ON snippets BEGIN
    UPDATE snippets_fts
    SET name = new.name, content = new.content
    WHERE rowid = new.id;
END;
