-- Add color column to tags table
-- Default color is GitHub's light gray (#EDEDED)
ALTER TABLE tags ADD COLUMN color TEXT NOT NULL DEFAULT '#EDEDED';

-- Create index on color for faster lookups
CREATE INDEX idx_tags_color ON tags(color);
