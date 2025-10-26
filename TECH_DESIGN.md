# Snips - Technical Design Document

## Architecture Overview

### Technology Stack

- **Framework**: Tauri 2.x
- **Frontend**: React with TypeScript
- **Styling**: TailwindCSS
- **Database**: SQLite via `tauri-plugin-sql`
- **State Management**: Zustand
- **Search**: FTS5 (SQLite Full-Text Search)
- **Build Tool**: Vite

### System Architecture

```
┌─────────────────────────────────────────┐
│          Frontend (React/TS)            │
│  ┌─────────────┐      ┌──────────────┐ │
│  │ Search UI   │      │ Management   │ │
│  │ (Overlay)   │      │ UI (Window)  │ │
│  └─────────────┘      └──────────────┘ │
│         │                     │         │
│         └─────────┬───────────┘         │
│                   │ IPC                 │
└───────────────────┼─────────────────────┘
                    │
┌───────────────────┼─────────────────────┐
│            Tauri Backend (Rust)         │
│  ┌────────────────────────────────────┐ │
│  │      Command Handlers              │ │
│  │  - snippet_commands.rs             │ │
│  │  - analytics_commands.rs           │ │
│  │  - clipboard_commands.rs           │ │
│  │  - settings_commands.rs            │ │
│  │  - storage_commands.rs             │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │      Core Services                 │ │
│  │  - database.rs                     │ │
│  │  - search.rs                       │ │
│  │  - shortcuts.rs                    │ │
│  │  - menubar.rs                      │ │
│  │  - storage_sync.rs                 │ │
│  │  - git_storage.rs                  │ │
│  │  - cloud_storage.rs                │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │      SQLite Database               │ │
│  │  - snippets table                  │ │
│  │  - tags table                      │ │
│  │  - snippet_tags table              │ │
│  │  - analytics table                 │ │
│  │  - settings table                  │ │
│  │  - sync_metadata table             │ │
│  │  - FTS5 virtual table              │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## Database Schema

### Tables

```sql
-- Main snippets table
CREATE TABLE snippets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL,
    description TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Tags table
CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

-- Many-to-many relationship
CREATE TABLE snippet_tags (
    snippet_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (snippet_id, tag_id),
    FOREIGN KEY (snippet_id) REFERENCES snippets(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Analytics table
CREATE TABLE analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snippet_id INTEGER NOT NULL,
    used_at INTEGER NOT NULL,
    FOREIGN KEY (snippet_id) REFERENCES snippets(id) ON DELETE CASCADE
);

-- Settings table
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Storage sync metadata
CREATE TABLE sync_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    storage_type TEXT NOT NULL,
    last_sync_at INTEGER,
    sync_status TEXT,
    error_message TEXT
);

-- FTS5 virtual table for search
CREATE VIRTUAL TABLE snippets_fts USING fts5(
    name,
    content,
    tags,
    content=snippets,
    content_rowid=id
);

-- Triggers to keep FTS5 in sync
CREATE TRIGGER snippets_ai AFTER INSERT ON snippets BEGIN
    INSERT INTO snippets_fts(rowid, name, content, tags)
    VALUES (new.id, new.name, new.content, '');
END;

CREATE TRIGGER snippets_ad AFTER DELETE ON snippets BEGIN
    DELETE FROM snippets_fts WHERE rowid = old.id;
END;

CREATE TRIGGER snippets_au AFTER UPDATE ON snippets BEGIN
    UPDATE snippets_fts SET name = new.name, content = new.content
    WHERE rowid = new.id;
END;

-- Indexes for performance
CREATE INDEX idx_analytics_snippet_id ON analytics(snippet_id);
CREATE INDEX idx_analytics_used_at ON analytics(used_at);
CREATE INDEX idx_snippet_tags_snippet_id ON snippet_tags(snippet_id);
CREATE INDEX idx_snippet_tags_tag_id ON snippet_tags(tag_id);
CREATE INDEX idx_sync_metadata_storage_type ON sync_metadata(storage_type);
```

---

## API Design

### Tauri Commands (Rust → Frontend)

#### Snippet Management

```rust
#[tauri::command]
async fn create_snippet(
    name: String,
    content: String,
    description: Option<String>,
    tags: Vec<String>
) -> Result<Snippet, String>

#[tauri::command]
async fn get_snippet(id: i64) -> Result<Snippet, String>

#[tauri::command]
async fn get_all_snippets() -> Result<Vec<Snippet>, String>

#[tauri::command]
async fn update_snippet(
    id: i64,
    name: String,
    content: String,
    description: Option<String>,
    tags: Vec<String>
) -> Result<Snippet, String>

#[tauri::command]
async fn delete_snippet(id: i64) -> Result<(), String>
```

#### Search

```rust
#[tauri::command]
async fn search_snippets(
    query: String,
    limit: Option<i64>
) -> Result<Vec<SearchResult>, String>

// SearchResult includes usage stats for ranking
struct SearchResult {
    snippet: Snippet,
    usage_count: i64,
    last_used: Option<i64>,
    relevance_score: f64,
}
```

#### Analytics

```rust
#[tauri::command]
async fn record_snippet_usage(snippet_id: i64) -> Result<(), String>

#[tauri::command]
async fn get_snippet_analytics(snippet_id: i64) -> Result<Analytics, String>

#[tauri::command]
async fn get_global_analytics() -> Result<GlobalAnalytics, String>
```

#### Clipboard

```rust
#[tauri::command]
async fn copy_to_clipboard(text: String) -> Result<(), String>

#[tauri::command]
async fn get_selected_text() -> Result<String, String>
```

#### Settings & Storage

```rust
#[tauri::command]
async fn get_settings() -> Result<AppSettings, String>

#[tauri::command]
async fn update_settings(settings: AppSettings) -> Result<(), String>

#[tauri::command]
async fn get_storage_type() -> Result<StorageType, String>

#[tauri::command]
async fn set_storage_type(storage_type: StorageType) -> Result<(), String>

// Git-backed storage commands
#[tauri::command]
async fn init_git_storage(repo_path: String) -> Result<(), String>

#[tauri::command]
async fn sync_git_storage() -> Result<GitSyncResult, String>

#[tauri::command]
async fn get_git_status() -> Result<GitStatus, String>

// Cloud sync service commands (custom hosted service)
#[tauri::command]
async fn cloud_auth_login(email: String, password: String) -> Result<AuthToken, String>

#[tauri::command]
async fn cloud_auth_register(email: String, password: String) -> Result<AuthToken, String>

#[tauri::command]
async fn cloud_auth_logout() -> Result<(), String>

#[tauri::command]
async fn cloud_sync_push() -> Result<CloudSyncResult, String>

#[tauri::command]
async fn cloud_sync_pull() -> Result<CloudSyncResult, String>

#[tauri::command]
async fn cloud_sync_bidirectional() -> Result<CloudSyncResult, String>

#[tauri::command]
async fn get_cloud_sync_status() -> Result<CloudSyncStatus, String>

#[tauri::command]
async fn get_cloud_account_info() -> Result<CloudAccountInfo, String>

// Data models
enum StorageType {
    Local,
    Git,
    Cloud,
}

struct CloudSyncResult {
    pushed: usize,
    pulled: usize,
    conflicts: Vec<ConflictInfo>,
    timestamp: i64,
}

struct CloudSyncStatus {
    is_authenticated: bool,
    last_sync: Option<i64>,
    pending_changes: usize,
    sync_enabled: bool,
}

struct CloudAccountInfo {
    email: String,
    created_at: i64,
    total_snippets: usize,
    storage_used_bytes: u64,
}

struct AppSettings {
    storage_type: StorageType,
    theme: Theme,
    global_shortcuts: GlobalShortcuts,
    search_settings: SearchSettings,
    privacy_settings: PrivacySettings,
    cloud_sync_settings: Option<CloudSyncSettings>,
}

struct CloudSyncSettings {
    auto_sync_enabled: bool,
    sync_interval_minutes: u32,
    conflict_resolution: ConflictResolutionStrategy,
}

enum ConflictResolutionStrategy {
    LastWriteWins,
    KeepBoth,
    AskUser,
}
```

---

## Global Shortcuts

### Default Keybindings

- **Quick Add**: `Cmd+Shift+A`
- **Search/Select**: `Cmd+Shift+S`

### Implementation

Using `tauri-plugin-global-shortcut`:

- Register shortcuts on app startup
- Show appropriate window when triggered
- Windows should appear centered on the screen with current cursor
- Manage window focus and hiding

---

## Frontend Components

### 1. Search Overlay (`/src/components/SearchOverlay.tsx`)

- Floating window, centered on screen
- Search input with instant filtering
- List of results with keyboard navigation
- Multi-select checkboxes
- Selected count indicator
- "Copy All" button (or Enter key)
- Escape to close

### 2. Quick Add Dialog (`/src/components/QuickAddDialog.tsx`)

- Floating dialog
- Shows captured text (read-only preview)
- Name input (required)
- Description input (optional)
- Tags input (optional, comma-separated)
- Save/Cancel buttons

### 3. Settings Window (`/src/components/SettingsWindow.tsx`)

- Full window with tabbed navigation
- **Snippets Tab**: Full snippet management UI
  - Sidebar with all snippets (search/filter)
  - Main panel with snippet editor
  - CRUD operations (create, edit, delete)
  - Tag management (create, rename, delete tags)
  - Bulk operations (multi-select, delete multiple)
- **Analytics Tab**: Usage analytics dashboard
  - Most used snippets widget
  - Recent usage timeline/chart
  - Usage frequency visualizations
  - Privacy controls (enable/disable tracking)
  - Export analytics data
- **Storage Tab**: Storage type configuration
  - Local storage (backup/restore)
  - Git-backed storage (repo setup, sync)
  - Cloud sync (login/register, account info)
  - Storage migration wizard
- **General Tab**: Application preferences
  - Theme selection (light/dark/system)
  - Startup behavior
- **Shortcuts Tab**: Keyboard shortcuts customization
  - Record custom key combinations
  - Reset to defaults
  - Conflict detection
- **Advanced Tab**: Import/export and advanced settings
  - Export format selection (JSON/Markdown/CSV)
  - Import with conflict resolution
  - Advanced configuration options

---

## State Management

### Frontend State (Zustand)

```typescript
interface SnippetStore {
  // Selected snippets for multi-select
  selectedSnippets: Set<number>;
  addSelected: (id: number) => void;
  removeSelected: (id: number) => void;
  clearSelected: () => void;

  // Search results
  searchResults: SearchResult[];
  setSearchResults: (results: SearchResult[]) => void;

  // Current search query
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

interface SettingsStore {
  // Application settings
  settings: AppSettings | null;
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;

  // Storage sync state
  syncStatus: SyncStatus;
  lastSyncTime: number | null;
  isSyncing: boolean;
  syncError: string | null;
  triggerSync: () => Promise<void>;

  // UI state
  activeSettingsTab: SettingsTab;
  setActiveTab: (tab: SettingsTab) => void;
}

enum SettingsTab {
  General = 'general',
  Storage = 'storage',
  Snippets = 'snippets',
  Analytics = 'analytics',
  Shortcuts = 'shortcuts',
  Advanced = 'advanced',
}
```

### Backend State (Rust)

- Database connection pool (single connection for SQLite)
- Menubar state (badge count)
- Window handles
- Settings cache (in-memory for fast access)
- Storage sync state (current provider, last sync timestamp)
- Active sync operations (prevent concurrent syncs)

---

## Development Phases

Snips follows a phased development approach. For detailed task breakdowns and project status, see [ROADMAP.md](ROADMAP.md).

### Phase 1: Foundation ✅

Project setup, database layer, CRUD operations, and basic React structure.

### Phase 2: Core UX ✅

Global shortcuts, search overlay, multi-select, clipboard integration, and window management.

### Phase 3: Polish 🚧

Analytics tracking, usage-weighted search, UI polish (animations, dark mode, accessibility), performance optimization, and comprehensive testing.

### Phase 4: Settings & Storage Sync 🚧

Settings infrastructure, local storage management, snippet management UI, analytics dashboard, keyboard shortcuts customization, Git-backed storage, cloud sync service, and import/export features.

---

## Technical Decisions & Rationale

### Why React?

- Strong TypeScript support
- Rich ecosystem for UI components
- Good Tauri integration and examples
- Team familiarity (assumed)

### Why SQLite?

- Local-first architecture requirement
- Excellent full-text search (FTS5)
- Zero configuration
- Fast for single-user apps
- Easy to backup/export

### Why Zustand over Redux?

- Simpler API, less boilerplate
- Better TypeScript inference
- Sufficient for app complexity
- Smaller bundle size

### Why FTS5?

- Built into SQLite
- Fast full-text search with ranking
- No external dependencies
- Handles stemming and tokenization

### Storage Strategy Decisions

#### Local Storage (Default)

- **Pros**: Fast, simple, no external dependencies, offline-first
- **Cons**: No sync across devices, limited to single machine
- **Use case**: Users who only need snippets on one machine

#### Git-Backed Storage

- **Pros**: Version control, merge capabilities, platform-agnostic, free
- **Cons**: Requires git knowledge, manual conflict resolution, SSH/token setup
- **Use case**: Technical users who want version history and GitHub/GitLab sync
- **Implementation**: Use `git2-rs` for Git operations, export to markdown/JSON

#### Cloud Sync Service (Custom Hosted)

- **Pros**: Automatic sync, user-friendly, works across devices, no third-party dependencies
- **Cons**: Requires building/maintaining backend service, hosting costs, authentication system
- **Use case**: Non-technical users who want seamless cross-device sync without git knowledge
- **Implementation**: Custom REST API backend with JWT auth, bidirectional sync protocol
- **Backend Stack**: Consider Rust (Axum/Actix), PostgreSQL, object storage for backups
- **Sync Protocol**: Delta sync with conflict detection, last-write-wins or manual resolution

#### Storage Sync Strategy

- **Conflict Resolution**: Last-write-wins with timestamp comparison
- **Sync Frequency**: Manual by default, optional auto-sync every N minutes
- **Delta Sync**: Only sync changed snippets (compare updated_at timestamps)
- **Offline Support**: Queue changes locally, sync when connection restored

---

## Performance Targets

- **Search Response**: <100ms (99th percentile)
- **App Startup**: <1 second cold start
- **Window Open**: <50ms to visible
- **Database Queries**: <10ms for typical operations
- **Memory Usage**: <100MB resident set size
- **Bundle Size**: <10MB app size

---

## Security Considerations

1. **Input Validation**: Sanitize all user input before database insertion
2. **SQL Injection**: Use parameterized queries (tauri-plugin-sql handles this)
3. **Clipboard Security**: Request clipboard permissions properly
4. **Global Shortcuts**: Handle permission requests gracefully
5. **Data Encryption**: Consider encrypting database at rest (future enhancement)
6. **Git Credentials**: Store SSH keys/tokens securely in system keychain
7. **Cloud Auth Tokens**: Store JWT tokens in macOS Keychain, never in plaintext
8. **Password Security**: Use bcrypt/argon2 for password hashing on cloud backend
9. **API Security**: Implement HTTPS only, rate limiting, CORS policies for cloud API
10. **Sync Conflicts**: Prevent data loss during merge conflicts
11. **Export Security**: Warn users before exporting sensitive snippets
12. **Data in Transit**: TLS 1.3 for all cloud sync communication
13. **Data at Rest**: Consider encrypting snippets in cloud database (optional)

---

## Testing Strategy

### Unit Tests (Rust)

- Database operations
- Search algorithms
- Ranking logic
- Data models and serialization

### Unit Tests (TypeScript)

- React components (React Testing Library)
- Store logic (Zustand)
- Utility functions

### Integration Tests

- Tauri command invocations
- Database migrations
- End-to-end workflows

### Manual Testing Checklist

- [ ] Global shortcuts work system-wide
- [ ] Multi-select persists across search sessions
- [ ] Copy produces correct concatenated output
- [ ] Quick add captures selected text correctly
- [ ] Analytics data is accurate
- [ ] App handles edge cases (no snippets, very long snippets, special characters)
- [ ] Performance meets targets with 100+ snippets

---

## Deployment & Distribution

### Development

```bash
npm run tauri dev
```

### Production Build

```bash
npm run tauri build
```

### Distribution Options (Phase 4)

1. **DMG Installer**: Standard macOS app distribution
2. **Homebrew Cask**: `brew install --cask snips`
3. **GitHub Releases**: Direct download
4. **Future**: Mac App Store (requires Apple Developer account)

### Code Signing

- Requires Apple Developer certificate
- Notarization for macOS 10.15+
- Configure in `tauri.conf.json`

---

## Open Technical Questions

1. **Frontend Framework Confirmation**: React vs Vue vs Svelte?
   - **Recommendation**: React (assumed above)

2. **Chart Library**: For analytics dashboard
   - **Options**: Recharts, Chart.js, Visx
   - **Recommendation**: Recharts (React-native, good TS support)

3. **Accessibility Library**:
   - **Options**: Reach UI, Radix UI, Headless UI
   - **Recommendation**: Radix UI (unstyled, accessible primitives)

4. **Selected Text Capture**: macOS accessibility API approach
   - **Solution**: Use AppleScript or Accessibility API via Rust
   - **Alternative**: Use pasteboard for Cmd+C simulation

5. **Shortcut Customization**: MVP or post-MVP?
   - **Recommendation**: Hardcode for MVP, add settings in Phase 3

6. **Analytics Privacy**: Store raw timestamps or aggregated data?
   - **Recommendation**: Raw timestamps for flexibility, clear privacy policy

7. **Git Storage Format**: JSON vs Markdown for snippet files?
   - **Options**: JSON (structured), Markdown (readable), Hybrid (frontmatter + markdown)
   - **Recommendation**: Hybrid approach - YAML frontmatter for metadata + markdown for content

8. **Cloud Backend Technology Stack**: What to use for the custom sync service?
   - **Options**: Rust (Axum/Actix), Node.js (Express/Fastify), Go (Gin/Echo), Python (FastAPI)
   - **Recommendation**: Rust with Axum (consistent with client, excellent performance, type safety)

9. **Cloud Backend Database**: PostgreSQL vs other options?
   - **Options**: PostgreSQL (relational, robust), MongoDB (document), SQLite (simple)
   - **Recommendation**: PostgreSQL (excellent for multi-user, JSONB for flexibility, proven at scale)

10. **Credential Storage**: How to securely store auth tokens on client?

- **Solution**: Use macOS Keychain via `keyring-rs` crate for JWT tokens
- **Alternative**: Encrypted config file with master password

11. **Sync Conflict UI**: How detailed should conflict resolution be?
    - **Options**: Auto-resolve (last-write-wins), Manual review, Side-by-side diff
    - **Recommendation**: Auto-resolve with notification + undo, manual diff view for power users

12. **Cloud Hosting**: Where to deploy the backend service?
    - **Options**: DigitalOcean (simple), AWS (scalable), Fly.io (Rust-friendly), Railway (easy deploy)
    - **Recommendation**: Start with Fly.io or Railway for simplicity, migrate to AWS if scale demands

---

## Risk Mitigation

| Risk                                      | Impact | Mitigation                                                 |
| ----------------------------------------- | ------ | ---------------------------------------------------------- |
| Global shortcuts conflict with other apps | High   | Allow customization, provide defaults unlikely to conflict |
| macOS accessibility permissions denied    | High   | Clear UX for permission requests, graceful degradation     |
| Search performance with large datasets    | Medium | Pagination, FTS5 optimization, caching                     |
| SQLite corruption                         | High   | Regular backups, WAL mode, transaction safety              |
| Tauri plugin compatibility                | Medium | Use stable plugins, have fallback implementations          |
| Git merge conflicts causing data loss     | High   | Backup before sync, conflict detection UI, undo capability |
| Cloud backend downtime/outages            | Medium | Graceful degradation, offline queue, status page           |
| Cloud backend scalability issues          | Medium | Horizontal scaling, caching, database optimization         |
| JWT token expiration mid-sync             | Medium | Refresh token handling, graceful re-authentication         |
| Storage migration data corruption         | High   | Validate data integrity, test migration with copies        |
| Network failure during sync               | Medium | Transaction rollback, retry logic, offline queue           |
| Cloud backend security breach             | High   | Regular security audits, encrypted data, rate limiting     |
| DDoS attacks on cloud backend             | Medium | Rate limiting, CloudFlare/DDoS protection service          |

---

_This technical design document will be updated as implementation progresses and new technical decisions are made._
