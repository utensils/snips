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
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │      Core Services                 │ │
│  │  - database.rs                     │ │
│  │  - search.rs                       │ │
│  │  - shortcuts.rs                    │ │
│  │  - menubar.rs                      │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │      SQLite Database               │ │
│  │  - snippets table                  │ │
│  │  - tags table                      │ │
│  │  - snippet_tags table              │ │
│  │  - analytics table                 │ │
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

### 3. Management Window (`/src/components/ManagementWindow.tsx`)

- Full window (not overlay)
- Sidebar with all snippets
- Main panel with snippet editor
- CRUD operations
- Search/filter within management view

### 4. Analytics Dashboard (`/src/components/AnalyticsDashboard.tsx`)

- View within management window
- Most used snippets
- Recent usage timeline
- Usage frequency charts

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
```

### Backend State (Rust)

- Database connection pool (single connection for SQLite)
- Menubar state (badge count)
- Window handles

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

- [ ] **M1**: Implement `record_snippet_usage` command
- [ ] **M2**: Create `get_snippet_analytics` command
- [ ] **M3**: Implement `get_global_analytics` command
- [ ] **M4**: Add automatic usage recording on copy
- [ ] **M5**: Implement analytics data aggregation queries
- [ ] **M6**: Add analytics cleanup/archival (optional)

### Task Group N: Usage-Weighted Search (Dependencies: H5, M1)

- [ ] **N1**: Enhance search query to include usage statistics
- [ ] **N2**: Implement weighted ranking algorithm (recency + frequency)
- [ ] **N3**: Add configurable weight parameters
- [ ] **N4**: Fine-tune ranking based on testing
- [ ] **N5**: Add A/B testing infrastructure for ranking (optional)

### Task Group O: Management UI (Dependencies: E4, E5, D7)

- [ ] **O1**: Create ManagementWindow component structure
- [ ] **O2**: Build snippet list sidebar with search/filter
- [ ] **O3**: Implement snippet detail/edit panel
- [ ] **O4**: Add create new snippet form
- [ ] **O5**: Implement delete confirmation dialog
- [ ] **O6**: Add bulk operations UI (select multiple, delete multiple)
- [ ] **O7**: Implement tag management UI (create, rename, delete tags)
- [ ] **O8**: Add import/export functionality (JSON format)

### Task Group P: Analytics Dashboard (Dependencies: M3, O1)

- [ ] **P1**: Create AnalyticsDashboard component
- [ ] **P2**: Implement "Most Used" snippets widget
- [ ] **P3**: Add recent usage timeline/chart
- [ ] **P4**: Create usage frequency visualization (charts)
- [ ] **P5**: Add date range filters
- [ ] **P6**: Implement export analytics data

### Task Group Q: Performance Optimization (Dependencies: Phase 2 complete)

- [ ] **Q1**: Profile search performance and optimize queries
- [ ] **Q2**: Implement database connection pooling (if needed)
- [ ] **Q3**: Add result pagination for large datasets
- [ ] **Q4**: Optimize FTS5 index for faster searches
- [ ] **Q5**: Implement lazy loading for management UI
- [ ] **Q6**: Add caching strategies for frequently accessed data
- [ ] **Q7**: Measure and optimize app startup time

### Task Group R: UX Polish (Dependencies: Phase 2 complete)

- [ ] **R1**: Add animations and transitions (smooth open/close)
- [ ] **R2**: Implement consistent error handling and user feedback
- [ ] **R3**: Add keyboard shortcuts documentation in-app
- [ ] **R4**: Implement dark mode support (system preference)
- [ ] **R5**: Add accessibility improvements (ARIA labels, focus management)
- [ ] **R6**: Create onboarding/welcome screen for first launch
- [ ] **R7**: Add settings panel (shortcuts, theme, preferences)

### Task Group S: Testing & Quality (Can run in parallel with O, P, Q, R)

- [ ] **S1**: Write E2E tests for core workflows (Playwright or Tauri test)
- [ ] **S2**: Add unit tests for all React components
- [ ] **S3**: Achieve >80% code coverage for Rust backend
- [ ] **S4**: Perform manual QA testing on macOS (multiple versions)
- [ ] **S5**: Test edge cases (empty state, large datasets, special characters)
- [ ] **S6**: Performance testing (search with 1000+ snippets)
- [ ] **S7**: Memory leak testing (long-running app)

### Phase 3 Success Criteria

- ✅ Analytics tracking works and data is accurate
- ✅ Search results ranked by usage frequency + recency
- ✅ Management UI provides full CRUD with good UX
- ✅ App feels fast (<100ms search response)
- ✅ No critical bugs or crashes
- ✅ All core workflows covered by tests
- ✅ App ready for internal alpha testing

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

---

## Risk Mitigation

| Risk                                      | Impact | Mitigation                                                 |
| ----------------------------------------- | ------ | ---------------------------------------------------------- |
| Global shortcuts conflict with other apps | High   | Allow customization, provide defaults unlikely to conflict |
| macOS accessibility permissions denied    | High   | Clear UX for permission requests, graceful degradation     |
| Search performance with large datasets    | Medium | Pagination, FTS5 optimization, caching                     |
| SQLite corruption                         | High   | Regular backups, WAL mode, transaction safety              |
| Tauri plugin compatibility                | Medium | Use stable plugins, have fallback implementations          |

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

### Phase 3 (Polish)

- Analytics tracking and display working
- Usage-weighted search improves relevance
- Full management UI complete
- Performance targets met
- Ready for alpha testing

---

## Next Steps

1. **Review and approve this design document**
2. **Select frontend framework** (confirm React)
3. **Begin Phase 1, Task Group A** (project setup)
4. **Set up CI/CD pipeline** (GitHub Actions)
5. **Create initial project board** (GitHub Projects or similar)

---

_This technical design document will be updated as implementation progresses and new technical decisions are made._
