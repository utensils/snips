# Snips - Development Roadmap

This document outlines the phased development plan for Snips, a macOS-native snippet management tool.

## Overview

Snips is being developed in four major phases:

1. **Phase 1**: Foundation - Project setup, database, and core data structures
2. **Phase 2**: Core UX - Global shortcuts, search overlay, and clipboard integration
3. **Phase 3**: Polish - Analytics, UI refinements, and performance optimization
4. **Phase 4**: Settings & Storage Sync - Management UI, Git/Cloud storage, and import/export

---

## Phase 1: Foundation

**Goal**: Establish the technical foundation with database, CRUD operations, and basic React structure.

### Task Group A: Project Setup

- [x] **A1**: Initialize Tauri project structure with React + TypeScript + Vite
- [x] **A2**: Configure TailwindCSS and base styling
- [x] **A3**: Set up project documentation structure (README, contributing guide)
- [x] **A4**: Configure ESLint, Prettier, and Rust formatting (rustfmt)

### Task Group B: Database Layer

- [x] **B1**: Add `tauri-plugin-sql` dependency
- [x] **B2**: Create database initialization module (`src-tauri/src/database.rs`)
- [x] **B3**: Implement schema creation with migrations
- [x] **B4**: Write database utility functions (connection, query helpers)
- [x] **B5**: Create unit tests for database layer

### Task Group C: Core Data Structures

- [x] **C1**: Define Rust structs for `Snippet`, `Tag`, `Analytics` models
- [x] **C2**: Implement serialization/deserialization traits
- [x] **C3**: Create TypeScript interfaces matching Rust structs
- [x] **C4**: Set up error handling types and utilities

### Task Group D: Basic CRUD Commands

- [x] **D1**: Implement `create_snippet` command
- [x] **D2**: Implement `get_snippet` command
- [x] **D3**: Implement `get_all_snippets` command
- [x] **D4**: Implement `update_snippet` command
- [x] **D5**: Implement `delete_snippet` command
- [x] **D6**: Add tag management within snippet CRUD operations
- [x] **D7**: Write integration tests for all CRUD operations

### Task Group E: Frontend Infrastructure

- [x] **E1**: Set up React Router (if multi-window routing needed)
- [x] **E2**: Configure Zustand store with TypeScript
- [x] **E3**: Create API client wrapper for Tauri invoke calls
- [x] **E4**: Build reusable UI components (Button, Input, Card, etc.)
- [x] **E5**: Create layout components and base styles

### Success Criteria

- ✅ App runs and compiles without errors
- ✅ SQLite database initializes correctly
- ✅ All CRUD operations work via Tauri commands
- ✅ Basic React app renders with routing configured

---

## Phase 2: Core UX

**Goal**: Implement the core user experience with global shortcuts, search overlay, multi-select, and clipboard integration.

### Task Group F: Window Management

- [x] **F1**: Configure menubar-only app (no dock icon)
- [x] **F2**: Implement menubar icon with `tauri-plugin-tray`
- [x] **F3**: Create window management utilities (show/hide/center)
- [x] **F4**: Implement window positioning logic (center on cursor/screen)
- [x] **F5**: Add menubar menu with basic actions

### Task Group G: Global Shortcuts

- [x] **G1**: Add `tauri-plugin-global-shortcut` dependency
- [x] **G2**: Implement global shortcut registration service
- [x] **G3**: Register `Cmd+Shift+S` for search overlay
- [x] **G4**: Register `Cmd+Shift+A` for quick add dialog
- [x] **G5**: Handle shortcut conflicts and errors gracefully
- [x] **G6**: Add shortcut customization infrastructure (for future)

### Task Group H: Search Implementation

- [x] **H1**: Implement FTS5 search query builder
- [x] **H2**: Create `search_snippets` Tauri command
- [x] **H3**: Implement basic relevance scoring algorithm
- [ ] **H4**: Add search result caching (optional optimization)
- [x] **H5**: Write unit tests for search functionality

### Task Group I: Search Overlay UI

- [x] **I1**: Build SearchOverlay component skeleton
- [x] **I2**: Implement real-time search input with debouncing
- [x] **I3**: Create search results list with virtualization (react-window)
- [x] **I4**: Add keyboard navigation (arrow keys, Enter, Escape)
- [x] **I5**: Implement multi-select checkboxes and state management
- [x] **I6**: Add selected count indicator in UI
- [x] **I7**: Implement "Copy All" functionality
- [x] **I8**: Add loading states and empty states

### Task Group J: Quick Add Feature

- [x] **J1**: Implement `get_selected_text` Tauri command (macOS accessibility)
- [x] **J2**: Build QuickAddDialog component
- [x] **J3**: Create form with validation (name required)
- [x] **J4**: Implement tag input with autocomplete suggestions
- [x] **J5**: Connect form submission to `create_snippet` command
- [x] **J6**: Add success/error notifications
- [x] **J7**: Handle window close and cleanup

### Task Group K: Clipboard Integration

- [x] **K1**: Implement `copy_to_clipboard` Tauri command
- [x] **K2**: Add clipboard permission handling
- [x] **K3**: Implement snippet concatenation logic (newline separator)
- [x] **K4**: Add copy confirmation feedback (toast notification)
- [x] **K5**: Test clipboard functionality across macOS versions

### Task Group L: Multi-Selection System

- [x] **L1**: Implement selection state in Zustand store
- [x] **L2**: Add menubar badge count display
- [x] **L3**: Create selection persistence (until copied or cleared)
- [x] **L4**: Add "Clear Selection" functionality
- [x] **L5**: Implement visual feedback for selected items

### Success Criteria

- ✅ Global shortcuts trigger correct windows
- ✅ Search overlay appears and filters results in real-time
- ✅ Multi-select works with visual feedback
- ✅ Quick add captures text and creates snippets
- ✅ Menubar badge shows selection count
- ✅ Copy to clipboard concatenates selected snippets

---

## Phase 3: Polish

**Goal**: Add analytics tracking, usage-weighted search, UI polish, and performance optimizations.

### Task Group M: Analytics Backend

- [x] **M1**: Implement `record_snippet_usage` command
- [x] **M2**: Create `get_snippet_analytics` command
- [x] **M3**: Implement `get_global_analytics` command
- [x] **M4**: Add automatic usage recording on copy
- [x] **M5**: Implement analytics data aggregation queries
- [ ] **M6**: Add analytics cleanup/archival (optional)

### Task Group N: Usage-Weighted Search

- [x] **N1**: Enhance search query to include usage statistics
- [x] **N2**: Implement weighted ranking algorithm (recency + frequency)
- [x] **N3**: Add configurable weight parameters
- [x] **N4**: Fine-tune ranking based on testing
- [ ] **N5**: Add A/B testing infrastructure for ranking (optional)

### Task Group O: UI Polish

- [x] **O1**: Add animations and transitions (smooth open/close)
- [x] **O2**: Implement consistent error handling and user feedback
- [x] **O3**: Add keyboard shortcuts documentation in-app
- [x] **O4**: Implement dark mode support (system preference)
- [x] **O5**: Add accessibility improvements (ARIA labels, focus management)
- [ ] **O6**: Create onboarding/welcome screen for first launch

### Task Group P: Performance Optimization

- [ ] **P1**: Profile search performance and optimize queries
- [ ] **P2**: Implement database connection pooling (if needed)
- [ ] **P3**: Add result pagination for large datasets
- [ ] **P4**: Optimize FTS5 index for faster searches
- [ ] **P5**: Add caching strategies for frequently accessed data
- [ ] **P6**: Measure and optimize app startup time

### Task Group Q: Testing & Quality

- [ ] **Q1**: Write E2E tests for core workflows (Playwright or Tauri test)
- [ ] **Q2**: Add unit tests for all React components
- [ ] **Q3**: Achieve >80% code coverage for Rust backend
- [ ] **Q4**: Perform manual QA testing on macOS (multiple versions)
- [ ] **Q5**: Test edge cases (empty state, large datasets, special characters)
- [ ] **Q6**: Performance testing (search with 1000+ snippets)
- [ ] **Q7**: Memory leak testing (long-running app)

### Success Criteria

- ✅ Analytics tracking works and data is accurate
- ✅ Search results ranked by usage frequency + recency
- ✅ UI polish complete (animations, dark mode, accessibility)
- ✅ App feels fast (<100ms search response)
- ✅ Performance optimizations implemented
- ✅ No critical bugs or crashes
- ✅ All core workflows covered by tests
- ✅ App ready for internal alpha testing

---

## Phase 4: Settings & Storage Sync

**Goal**: Build comprehensive settings UI, snippet management interface, analytics dashboard, and implement Git/Cloud storage sync.

### Task Group T: Settings Infrastructure

- [x] **T1**: Create settings table schema and migration
- [x] **T2**: Implement settings service in Rust (`src-tauri/src/services/settings.rs`)
- [x] **T3**: Create `AppSettings` data model with all setting categories
- [x] **T4**: Implement `get_settings` and `update_settings` commands
- [x] **T5**: Add settings validation and defaults
- [x] **T6**: Create settings persistence layer (database-backed)
- [x] **T7**: Add settings change event system for live updates

### Task Group U: Local Storage Management

- [x] **U1**: Implement database backup functionality
- [x] **U2**: Add database restore from backup
- [x] **U3**: Create automatic backup scheduling
- [x] **U4**: Implement database export to JSON
- [x] **U5**: Implement database import from JSON
- [x] **U6**: Add data validation for imports
- [x] **U7**: Create database statistics view (size, snippet count, etc.)

### Task Group V: Git-Backed Storage

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

### Task Group W: Cloud Sync Service - Backend

**Note**: Requires building a separate backend service to host the cloud sync API.

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

### Task Group W2: Cloud Sync Service - Client

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

### Task Group X: Settings UI

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

### Task Group Y: Snippet Management in Settings

- [x] **Y1**: Create snippet list view in settings with search/filter
- [x] **Y2**: Implement snippet detail/edit panel
- [x] **Y3**: Add create new snippet form within settings
- [x] **Y4**: Implement delete confirmation dialog
- [x] **Y5**: Add bulk operations UI (select all, delete selected)
- [x] **Y6**: Implement snippet filtering and sorting options
- [x] **Y7**: Add snippet export selection (export selected snippets)
- [x] **Y8**: Create snippet duplicate detection and cleanup
- [x] **Y9**: Implement snippet merge functionality (combine duplicates)
- [ ] **Y10**: Add snippet archiving feature (soft delete) - Requires backend schema changes
- [x] **Y11**: Implement tag management UI (create, rename, delete tags)

### Task Group Z: Analytics in Settings

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

### Task Group AA: Keyboard Shortcuts Customization

- [x] **AA1**: Create keyboard shortcuts settings UI
- [x] **AA2**: Implement shortcut recording widget (capture key combinations)
- [x] **AA3**: Add shortcut validation (prevent conflicts, invalid combos)
- [x] **AA4**: Implement shortcut reset to defaults
- [x] **AA5**: Create shortcut conflict detection and warnings
- [x] **AA6**: Add shortcut customization for all global actions
- [x] **AA7**: Implement shortcut persistence and loading on startup

### Task Group AB: Import/Export Features

- [ ] **AB1**: Create import/export UI in settings
- [ ] **AB2**: Implement export format selection (JSON, Markdown, CSV)
- [ ] **AB3**: Add export options (include tags, analytics, settings)
- [ ] **AB4**: Implement import file picker and validation
- [ ] **AB5**: Create import preview with conflict resolution
- [ ] **AB6**: Add import merge strategies (replace, merge, skip)
- [ ] **AB7**: Implement bulk import from clipboard
- [ ] **AB8**: Add import/export progress indicators

### Task Group AC: Storage Sync Testing & Polish

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

### Success Criteria

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

## Current Status

### Completed

- ✅ **Phase 1**: Foundation complete
- ✅ **Phase 2**: Core UX complete
- ✅ **Phase 3**: Analytics backend and usage-weighted search complete
- ✅ **Phase 3**: UI polish complete (animations, dark mode, accessibility)
- ✅ **Phase 4**: Settings infrastructure complete
- ✅ **Phase 4**: Local storage management complete
- ✅ **Phase 4**: Snippet management UI complete
- ✅ **Phase 4**: Analytics dashboard complete
- ✅ **Phase 4**: Keyboard shortcuts customization complete

### In Progress

- 🚧 **Phase 3**: Performance optimization and comprehensive testing
- 🚧 **Phase 4**: Git-backed storage implementation
- 🚧 **Phase 4**: Cloud sync service (backend + client)
- 🚧 **Phase 4**: Import/export features

### Upcoming

- ⏳ Git-backed storage (Task Group V)
- ⏳ Cloud sync backend service (Task Group W)
- ⏳ Cloud sync client integration (Task Group W2)
- ⏳ Complete import/export features (Task Group AB)
- ⏳ Storage sync testing & polish (Task Group AC)

---

## Performance Targets

- **Search Response**: <100ms (99th percentile)
- **App Startup**: <1 second cold start
- **Window Open**: <50ms to visible
- **Database Queries**: <10ms for typical operations
- **Memory Usage**: <100MB resident set size
- **Bundle Size**: <10MB app size

---

## Testing Coverage Goals

- **TypeScript**: 70%+ code coverage
- **Rust**: 80%+ code coverage
- **E2E Tests**: All critical user workflows
- **Manual QA**: Tested on macOS 12.0+

---

## Release Timeline

### Alpha Release (Phase 3 Complete)

- Internal testing with core features
- Analytics and usage-weighted search functional
- Performance targets met
- Basic UI polish complete

### Beta Release (Phase 4 Partial)

- Settings UI complete
- Local storage management functional
- Snippet management and analytics dashboard
- Keyboard shortcuts customization
- Ready for broader user testing

### v1.0 Release (Phase 4 Complete)

- All storage options (local, Git, cloud) functional
- Complete import/export capabilities
- Comprehensive testing and polish
- Production-ready with full documentation

---

For detailed technical specifications, see [TECH_DESIGN.md](TECH_DESIGN.md).
