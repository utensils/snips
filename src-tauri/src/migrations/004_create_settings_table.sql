-- Create settings table
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Create sync_metadata table for future storage sync functionality
CREATE TABLE sync_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    storage_type TEXT NOT NULL,
    last_sync_at INTEGER,
    sync_status TEXT,
    error_message TEXT
);

-- Create index for sync metadata by storage type
CREATE INDEX idx_sync_metadata_storage_type ON sync_metadata(storage_type);
