-- Fix FTS5 table to remove dependency on non-existent tags column in snippets table
-- The tags column in snippets_fts references snippets.tags which doesn't exist,
-- causing "no such column: T.tags" errors during updates

-- Drop existing FTS5 table and triggers
DROP TRIGGER IF EXISTS snippets_au;
DROP TRIGGER IF EXISTS snippets_ad;
DROP TRIGGER IF EXISTS snippets_ai;
DROP TABLE IF EXISTS snippets_fts;

-- Recreate FTS5 virtual table without tags column
-- Remove content=snippets to avoid referencing non-existent tags column
CREATE VIRTUAL TABLE snippets_fts USING fts5(
    name,
    content,
    tokenize='porter unicode61'
);

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
-- Use DELETE + INSERT instead of UPDATE for FTS5 without external content
CREATE TRIGGER snippets_au AFTER UPDATE ON snippets BEGIN
    DELETE FROM snippets_fts WHERE rowid = old.id;
    INSERT INTO snippets_fts(rowid, name, content)
    VALUES (new.id, new.name, new.content);
END;

-- Populate FTS5 table with existing snippets
INSERT INTO snippets_fts(rowid, name, content)
SELECT id, name, content FROM snippets;
