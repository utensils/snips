-- Create FTS5 virtual table for full-text search
CREATE VIRTUAL TABLE snippets_fts USING fts5(
    name,
    content,
    tags,
    content=snippets,
    content_rowid=id
);

-- Trigger to insert into FTS5 when snippet is created
CREATE TRIGGER snippets_ai AFTER INSERT ON snippets BEGIN
    INSERT INTO snippets_fts(rowid, name, content, tags)
    VALUES (new.id, new.name, new.content, '');
END;

-- Trigger to delete from FTS5 when snippet is deleted
CREATE TRIGGER snippets_ad AFTER DELETE ON snippets BEGIN
    DELETE FROM snippets_fts WHERE rowid = old.id;
END;

-- Trigger to update FTS5 when snippet is updated
CREATE TRIGGER snippets_au AFTER UPDATE ON snippets BEGIN
    UPDATE snippets_fts SET name = new.name, content = new.content
    WHERE rowid = new.id;
END;
