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

---

## QA & Testing

### Manual Testing Matrix

| Desktop / Compositor    | Focus Areas                                                                    | Owner                  | Cadence                       |
| ----------------------- | ------------------------------------------------------------------------------ | ---------------------- | ----------------------------- |
| Hyprland (Wayland)      | Window focus recovery, D-Bus shortcut toggles, quick-add capture               | James Brink            | Twice weekly + pre-release    |
| GNOME Shell (Wayland)   | Tray menu, global shortcut fallback messaging, Omarchy palette sync            | Rotating QA volunteer  | Weekly                        |
| KDE Plasma 6 (Wayland)  | Window chrome options, metrics emission, quick-add positioning                 | Rotating QA volunteer  | Bi-weekly                     |
| GNOME on X11            | Search overlay behaviour, clipboard capture warnings, legacy shortcut handling | James Brink            | Before each tagged release    |
| Omarchy reference image | Theme hook integration, managed wallpaper sync, auto-updater sanity            | Ops / Release engineer | Prior to distro image refresh |

#### Automated Wayland Suite

- `scripts/ci/wayland-tests.sh` reproduces the headless Wayland reliability pipeline locally (via Docker) and is invoked by CI. Run it without arguments to launch the containerised environment, or set `INSIDE_WAYLAND_CI=1` to reuse an already provisioned runner.

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

## Phase Implementation Plan

## Phase 1: Foundation (Tasks can run concurrently)

### Task Group A: Project Setup (No dependencies)

- [x] **A1**: Initialize Tauri project structure with React + TypeScript + Vite
- [x] **A2**: Configure TailwindCSS and base styling
- [x] **A3**: Set up project documentation structure (README, contributing guide)
- [x] **A4**: Configure ESLint, Prettier, and Rust formatting (rustfmt)

### Task Group B: Database Layer (Dependencies: A1)

- [x] **B1**: Add `tauri-plugin-sql` dependency
- [x] **B2**: Create database initialization module (`src-tauri/src/database.rs`)
- [x] **B3**: Implement schema creation with migrations
- [x] **B4**: Write database utility functions (connection, query helpers)
- [x] **B5**: Create unit tests for database layer

### Task Group C: Core Data Structures (Dependencies: B2)

- [x] **C1**: Define Rust structs for `Snippet`, `Tag`, `Analytics` models
- [x] **C2**: Implement serialization/deserialization traits
- [x] **C3**: Create TypeScript interfaces matching Rust structs
- [x] **C4**: Set up error handling types and utilities

### Task Group D: Basic CRUD Commands (Dependencies: B3, C1)

- [x] **D1**: Implement `create_snippet` command
- [x] **D2**: Implement `get_snippet` command
- [x] **D3**: Implement `get_all_snippets` command
- [x] **D4**: Implement `update_snippet` command
- [x] **D5**: Implement `delete_snippet` command
- [x] **D6**: Add tag management within snippet CRUD operations
- [x] **D7**: Write integration tests for all CRUD operations

### Task Group E: Frontend Infrastructure (Dependencies: A1, A2, C3)

- [x] **E1**: Set up React Router (if multi-window routing needed)
- [x] **E2**: Configure Zustand store with TypeScript
- [x] **E3**: Create API client wrapper for Tauri invoke calls
- [x] **E4**: Build reusable UI components (Button, Input, Card, etc.)
- [x] **E5**: Create layout components and base styles

### Phase 1 Success Criteria

- ✅ App runs and compiles without errors
- ✅ SQLite database initializes correctly
- ✅ All CRUD operations work via Tauri commands
- ✅ Basic React app renders with routing configured

---

## Phase 2: Core UX (Tasks have dependencies)

### Task Group F: Window Management (Dependencies: Phase 1 complete)

- [x] **F1**: Configure menubar-only app (no dock icon)
- [x] **F2**: Implement menubar icon with `tauri-plugin-tray`
- [x] **F3**: Create window management utilities (show/hide/center)
- [x] **F4**: Implement window positioning logic (center on cursor/screen)
- [x] **F5**: Add menubar menu with basic actions

### Task Group G: Global Shortcuts (Dependencies: F3)

- [x] **G1**: Add `tauri-plugin-global-shortcut` dependency
- [x] **G2**: Implement global shortcut registration service
- [x] **G3**: Register `Cmd+Shift+S` for search overlay
- [x] **G4**: Register `Cmd+Shift+A` for quick add dialog
- [x] **G5**: Handle shortcut conflicts and errors gracefully
- [x] **G6**: Add shortcut customization infrastructure (for future)

### Task Group H: Search Implementation (Dependencies: B5, D3)

- [x] **H1**: Implement FTS5 search query builder
- [x] **H2**: Create `search_snippets` Tauri command
- [x] **H3**: Implement basic relevance scoring algorithm
- [ ] **H4**: Add search result caching (optional optimization)
- [x] **H5**: Write unit tests for search functionality

### Task Group I: Search Overlay UI (Dependencies: E4, E5, G3, H2)

- [x] **I1**: Build SearchOverlay component skeleton
- [x] **I2**: Implement real-time search input with debouncing
- [x] **I3**: Create search results list with virtualization (react-window)
- [x] **I4**: Add keyboard navigation (arrow keys, Enter, Escape)
- [x] **I5**: Implement multi-select checkboxes and state management
- [x] **I6**: Add selected count indicator in UI
- [x] **I7**: Implement "Copy All" functionality
- [x] **I8**: Add loading states and empty states

### Task Group J: Quick Add Feature (Dependencies: G4, D1)

- [x] **J1**: Implement `get_selected_text` Tauri command (macOS accessibility)
- [x] **J2**: Build QuickAddDialog component
- [x] **J3**: Create form with validation (name required)
- [x] **J4**: Implement tag input with autocomplete suggestions
- [x] **J5**: Connect form submission to `create_snippet` command
- [x] **J6**: Add success/error notifications
- [x] **J7**: Handle window close and cleanup

### Task Group K: Clipboard Integration (Dependencies: I7)

- [x] **K1**: Implement `copy_to_clipboard` Tauri command
- [x] **K2**: Add clipboard permission handling
- [x] **K3**: Implement snippet concatenation logic (newline separator)
- [x] **K4**: Add copy confirmation feedback (toast notification)
- [x] **K5**: Test clipboard functionality across macOS versions

### Task Group L: Multi-Selection System (Dependencies: I3, I5)

- [x] **L1**: Implement selection state in Zustand store
- [x] **L2**: Add menubar badge count display
- [x] **L3**: Create selection persistence (until copied or cleared)
- [x] **L4**: Add "Clear Selection" functionality
- [x] **L5**: Implement visual feedback for selected items

### Phase 2 Success Criteria

- ✅ Global shortcuts trigger correct windows
- ✅ Search overlay appears and filters results in real-time
- ✅ Multi-select works with visual feedback
- ✅ Quick add captures text and creates snippets
- ✅ Menubar badge shows selection count
- ✅ Copy to clipboard concatenates selected snippets

---

## Phase 3: Polish (Tasks have dependencies)

### Task Group M: Analytics Backend (Dependencies: Phase 2 complete)

- [x] **M1**: Implement `record_snippet_usage` command
- [x] **M2**: Create `get_snippet_analytics` command
- [x] **M3**: Implement `get_global_analytics` command
- [x] **M4**: Add automatic usage recording on copy
- [x] **M5**: Implement analytics data aggregation queries
- [ ] **M6**: Add analytics cleanup/archival (optional)

### Task Group N: Usage-Weighted Search (Dependencies: H5, M1)

- [x] **N1**: Enhance search query to include usage statistics
- [x] **N2**: Implement weighted ranking algorithm (recency + frequency)
- [x] **N3**: Add configurable weight parameters
- [x] **N4**: Fine-tune ranking based on testing
- [ ] **N5**: Add A/B testing infrastructure for ranking (optional)

### Task Group O: UI Polish (Dependencies: Phase 2 complete)

- [x] **O1**: Add animations and transitions (smooth open/close)
- [x] **O2**: Implement consistent error handling and user feedback
- [x] **O3**: Add keyboard shortcuts documentation in-app
- [x] **O4**: Implement dark mode support (system preference)
- [x] **O5**: Add accessibility improvements (ARIA labels, focus management)
- [ ] **O6**: Create onboarding/welcome screen for first launch

### Task Group P: Performance Optimization (Dependencies: Phase 2 complete)

- [ ] **P1**: Profile search performance and optimize queries
- [ ] **P2**: Implement database connection pooling (if needed)
- [ ] **P3**: Add result pagination for large datasets
- [ ] **P4**: Optimize FTS5 index for faster searches
- [ ] **P5**: Add caching strategies for frequently accessed data
- [ ] **P6**: Measure and optimize app startup time

### Task Group Q: Testing & Quality (Can run in parallel with M, N, O, P)

- [ ] **Q1**: Write E2E tests for core workflows (Playwright or Tauri test)
- [ ] **Q2**: Add unit tests for all React components
- [ ] **Q3**: Achieve >80% code coverage for Rust backend
- [ ] **Q4**: Perform manual QA testing on macOS (multiple versions)
- [ ] **Q5**: Test edge cases (empty state, large datasets, special characters)
- [ ] **Q6**: Performance testing (search with 1000+ snippets)
- [ ] **Q7**: Memory leak testing (long-running app)

### Phase 3 Success Criteria

- ✅ Analytics tracking works and data is accurate
- ✅ Search results ranked by usage frequency + recency
- ✅ UI polish complete (animations, dark mode, accessibility)
- ✅ App feels fast (<100ms search response)
- ✅ Performance optimizations implemented
- ✅ No critical bugs or crashes
- ✅ All core workflows covered by tests
- ✅ App ready for internal alpha testing

---

## Phase 4: Settings & Storage Sync (Tasks have dependencies)

### Task Group T: Settings Infrastructure (Dependencies: Phase 1 complete)

- [x] **T1**: Create settings table schema and migration
- [x] **T2**: Implement settings service in Rust (`src-tauri/src/services/settings.rs`)
- [x] **T3**: Create `AppSettings` data model with all setting categories
- [x] **T4**: Implement `get_settings` and `update_settings` commands
- [x] **T5**: Add settings validation and defaults
- [x] **T6**: Create settings persistence layer (database-backed)
- [x] **T7**: Add settings change event system for live updates

### Task Group U: Local Storage Management (Dependencies: T4)

- [x] **U1**: Implement database backup functionality
- [x] **U2**: Add database restore from backup
- [x] **U3**: Create automatic backup scheduling
- [x] **U4**: Implement database export to JSON
- [x] **U5**: Implement database import from JSON
- [x] **U6**: Add data validation for imports
- [x] **U7**: Create database statistics view (size, snippet count, etc.)

### Task Group V: Git-Backed Storage (Dependencies: T4, U1)

- [ ] **V1**: Add git2 Rust dependency for Git operations
- [ ] **V2**: Implement `git_storage.rs` service module
- [ ] **V3**: Create git repository initialization command
- [ ] **V4**: Implement export snippets to git-friendly format (markdown/JSON)
- [ ] **V5**: Add git commit automation for snippet changes
- [ ] **V6**: Implement git sync (pull/push) functionality
- [ ] **V7**: Handle git merge conflicts (last-write-wins strategy)
- [ ] **V8**: Add git status tracking and display
- [ ] **V9**: Implement git authentication (SSH keys, tokens)
- [ ] **V10**: Create git sync error handling and recovery

### Task Group W: Cloud Sync Service - Backend (Dependencies: T4, U1)

**Note**: This requires building a separate backend service to host the cloud sync API.

- [ ] **W1**: Design cloud sync API specification (REST endpoints, auth flow)
- [ ] **W2**: Set up backend service project (Rust with Axum/Actix recommended)
- [ ] **W3**: Implement PostgreSQL schema for user accounts and snippet storage
- [ ] **W4**: Create user authentication system (registration, login, JWT tokens)
- [ ] **W5**: Implement snippet sync endpoints (push, pull, bidirectional)
- [ ] **W6**: Add delta sync protocol (only transfer changed snippets)
- [ ] **W7**: Implement conflict detection and resolution logic
- [ ] **W8**: Add account management endpoints (profile, storage stats)
- [ ] **W9**: Implement rate limiting and security measures
- [ ] **W10**: Set up backend deployment infrastructure (Docker, hosting)

### Task Group W2: Cloud Sync Service - Client (Dependencies: W5)

- [ ] **W2.1**: Implement cloud sync client module in Rust (`cloud_storage.rs`)
- [ ] **W2.2**: Add HTTP client for API communication (reqwest)
- [ ] **W2.3**: Implement authentication flow (login, register, token refresh)
- [ ] **W2.4**: Create secure token storage (macOS Keychain integration)
- [ ] **W2.5**: Implement push sync (upload local changes to cloud)
- [ ] **W2.6**: Implement pull sync (download cloud changes to local)
- [ ] **W2.7**: Add bidirectional sync with conflict resolution
- [ ] **W2.8**: Implement sync status monitoring and error handling
- [ ] **W2.9**: Add retry logic with exponential backoff
- [ ] **W2.10**: Create sync queue for offline changes

### Task Group X: Settings UI (Dependencies: T4, E4, E5)

- [x] **X1**: Create SettingsWindow component structure
- [x] **X2**: Implement tabbed navigation (General, Storage, Snippets, Analytics, Advanced)
- [x] **X3**: Build General settings tab (theme, startup behavior)
- [x] **X4**: Build Storage settings tab (storage type selector)
- [x] **X5**: Implement local storage UI (backup/restore buttons)
- [ ] **X6**: Build git storage configuration UI (repo path, credentials) - Placeholder added
- [ ] **X7**: Build cloud sync configuration UI (login/register, account info) - Placeholder added
- [ ] **X8**: Add storage sync status indicators (last sync, errors) - Placeholder added
- [x] **X9**: Implement manual sync trigger buttons
- [x] **X10**: Add storage migration wizard (local → git → cloud) - Placeholder with migration flow
- [ ] **X11**: Create cloud account creation/login flow UI - Deferred until cloud backend ready
- [ ] **X12**: Add cloud sync settings (auto-sync toggle, interval, conflict strategy) - Deferred until cloud backend ready

### Task Group Y: Snippet Management in Settings (Dependencies: X2, D7)

- [x] **Y1**: Create snippet list view in settings with search/filter
- [x] **Y2**: Implement snippet detail/edit panel
- [x] **Y3**: Add create new snippet form within settings
- [x] **Y4**: Implement delete confirmation dialog
- [x] **Y5**: Add bulk operations UI (select all, delete selected)
- [x] **Y6**: Implement snippet filtering and sorting options
- [x] **Y7**: Add snippet export selection (export selected snippets)
- [x] **Y8**: Create snippet duplicate detection and cleanup
- [x] **Y9**: Implement snippet merge functionality (combine duplicates)
- [ ] **Y10**: Add snippet archiving feature (soft delete) _Note: Requires backend schema changes_
- [x] **Y11**: Implement tag management UI (create, rename, delete tags)

### Task Group Z: Analytics in Settings (Dependencies: X2, M3)

- [x] **Z1**: Create analytics dashboard component within settings
- [x] **Z2**: Implement "Most Used" snippets widget
- [x] **Z3**: Add recent usage timeline/chart
- [x] **Z4**: Create usage frequency visualization (charts)
- [x] **Z5**: Add date range filters
- [x] **Z6**: Add privacy controls for analytics (enable/disable tracking)
- [x] **Z7**: Implement analytics data export (CSV/JSON)
- [x] **Z8**: Add analytics data cleanup (clear old data)
- [x] **Z9**: Create analytics summary cards (total snippets, total uses, etc.)
- [x] **Z10**: Add per-snippet analytics drill-down view

### Task Group AA: Keyboard Shortcuts Customization (Dependencies: X2, G2)

- [x] **AA1**: Create keyboard shortcuts settings UI
- [x] **AA2**: Implement shortcut recording widget (capture key combinations)
- [x] **AA3**: Add shortcut validation (prevent conflicts, invalid combos)
- [x] **AA4**: Implement shortcut reset to defaults
- [x] **AA5**: Create shortcut conflict detection and warnings
- [x] **AA6**: Add shortcut customization for all global actions
- [x] **AA7**: Implement shortcut persistence and loading on startup

### Task Group AB: Import/Export Features (Dependencies: U4, U5, X2)

- [ ] **AB1**: Create import/export UI in settings
- [ ] **AB2**: Implement export format selection (JSON, Markdown, CSV)
- [ ] **AB3**: Add export options (include tags, analytics, settings)
- [ ] **AB4**: Implement import file picker and validation
- [ ] **AB5**: Create import preview with conflict resolution
- [ ] **AB6**: Add import merge strategies (replace, merge, skip)
- [ ] **AB7**: Implement bulk import from clipboard
- [ ] **AB8**: Add import/export progress indicators

### Task Group AC: Storage Sync Testing & Polish (Dependencies: V10, W2.10, X12)

- [ ] **AC1**: Write unit tests for all storage providers (local, git, cloud)
- [ ] **AC2**: Add integration tests for sync operations
- [ ] **AC3**: Test conflict resolution scenarios (concurrent edits, deletions)
- [ ] **AC4**: Implement sync progress UI with cancellation
- [ ] **AC5**: Add sync scheduling (auto-sync on interval)
- [ ] **AC6**: Create sync logs for debugging
- [ ] **AC7**: Test storage migration between providers
- [ ] **AC8**: Performance test with large datasets (1000+ snippets)
- [ ] **AC9**: Test cloud backend scalability and concurrent users
- [ ] **AC10**: Security audit of cloud sync authentication and data transfer

### Phase 4 Success Criteria

- ✅ Settings window provides comprehensive configuration options
- ✅ Snippet management UI provides full CRUD with excellent UX
- ✅ Analytics dashboard fully integrated and functional
- ✅ Tag management working (create, rename, delete)
- ✅ Local storage backup/restore works reliably
- ✅ Git-backed storage syncs bidirectionally without data loss
- ✅ Cloud sync service (backend + client) deployed and functional
- ✅ User authentication (registration/login) works securely
- ✅ Bidirectional cloud sync handles conflicts gracefully
- ✅ Storage migration works smoothly between all storage types (local/git/cloud)
- ✅ Keyboard shortcuts are fully customizable
- ✅ Import/export supports multiple formats (JSON, Markdown, CSV)
- ✅ Cloud backend handles multiple concurrent users
- ✅ Comprehensive tests cover all storage scenarios including cloud sync
- ✅ App ready for beta testing

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

## Success Criteria Summary

### Phase 1 (Foundation)

- Database schema created and tested
- All CRUD operations functional
- Basic React app structure in place

### Phase 2 (Core UX)

- Global shortcuts working
- Search and multi-select functional
- Quick add captures and saves snippets
- Copy to clipboard works

### Phase 3 (Polish & Performance)

- Analytics tracking and display working
- Usage-weighted search improves relevance
- UI polish complete (animations, dark mode, accessibility)
- Performance targets met
- All core workflows tested
- Ready for alpha testing

### Phase 4 (Settings & Management UI)

- Settings window with full tabbed navigation
- Snippet management UI complete (CRUD, tags, bulk operations)
- Analytics dashboard integrated into settings
- Local backup/restore functional
- Git-backed storage syncing reliably
- Cloud sync backend service deployed and operational
- Cloud sync client integrated and working
- User authentication (register/login) functional
- Storage migration wizard complete
- Keyboard shortcuts fully customizable
- Import/export working for all formats

---

## Next Steps

1. **Review and approve this design document**
2. **Select frontend framework** (confirm React)
3. **Begin Phase 1, Task Group A** (project setup)
4. **Set up CI/CD pipeline** (GitHub Actions)
5. **Create initial project board** (GitHub Projects or similar)

---

_This technical design document will be updated as implementation progresses and new technical decisions are made._
