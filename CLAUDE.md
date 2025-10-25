# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Snips is a macOS-native snippet management tool built with Tauri 2.x for building LLM prompts from reusable text snippets. Local-first SQLite storage with FTS5 search, menubar-only presence, global shortcuts for quick access.

**Note**: While targeting macOS, development can occur on Linux. The app is cross-platform ready via Tauri.

## Essential Commands

### Development

```bash
npm run tauri dev          # Run app with hot-reload
npm run check-all          # ALL quality checks - run before committing
```

### Testing

```bash
npm run test               # Run tests in watch mode
npm run test -- path/to/file.test.tsx  # Run specific test file
cargo test                 # Run Rust tests
cargo test --test snippet_integration_tests  # Run specific Rust test
```

### Code Quality

```bash
npm run format && npm run lint && npm run type-check  # Fix/check frontend
cargo fmt && cargo clippy -- -D warnings              # Fix/check backend
```

## Architecture

### Backend (Rust/Tauri)

- **Entry**: `src-tauri/src/main.rs` → `src-tauri/src/lib.rs`
- **Flow**: Commands → Services → Database
- **Key Services**:
  - `database.rs` - SQLite with FTS5, initialized via tauri-plugin-sql
  - `shortcuts.rs` - Global shortcuts (registered in lib.rs:118)
  - `backup_scheduler.rs` - Automated backup system
  - `window.rs` - Window management (search, settings, quick-add)
  - `search.rs` - FTS5 full-text search with usage-based ranking

### Frontend (React/TypeScript)

- **Entry**: `src/main.tsx` → `src/App.tsx`
- **State**: Zustand stores in `src/stores/`
- **Path aliases**: `@/components`, `@/hooks`, `@/lib`, `@/stores`, `@/types`

### Database (SQLite)

- **Tables**: snippets, tags, snippet_tags, analytics, settings
- **Search**: snippets_fts (FTS5 virtual table)
- **Location**: User data directory (managed by Tauri)

## Critical Requirements

### Rust

- ❌ NO `unwrap()`, `expect()`, or `panic!()` - use `?` operator
- ✅ MUST use parameterized queries (handled by tauri-plugin-sql)
- ✅ Use newtype pattern: `SnippetId(i64)` not `i64`
- **Rust version**: mise.toml shows 1.90, but Tauri requires 1.82+ minimum

### TypeScript

- ❌ NO `any` type, `console.log`, or unused variables
- ✅ MUST use path aliases: `@/components/ui/Button` not `../../../`
- ✅ MUST type all function parameters/returns
- ✅ Keep functions <50 lines, components <300 lines

### Standards

See [STANDARDS.md](STANDARDS.md) for complete coding standards. Key points:

- Single quotes, semicolons, 100 char width
- Conventional Commits: `feat(scope):`, `fix(scope):`, etc.
- Test coverage: 70%+ TypeScript, 80%+ Rust
- Run `npm run check-all` before committing

## Common Tasks

### Add a Tauri Command

1. Create handler in `src-tauri/src/commands/` (e.g., `snippet_commands.rs`)
2. Register in `src-tauri/src/lib.rs` via `generate_handler!` (line 148-188)
3. Add TypeScript types in `src/types/`
4. Call from frontend: `invoke('command_name', { params })`

### Add React Component

1. Create in `src/components/[Feature]/Component.tsx`
2. Add test file: `Component.test.tsx`
3. Export via `index.ts` barrel
4. Use path aliases for imports

### Add Global Shortcut

1. Define in `src-tauri/src/services/shortcuts.rs`
2. Register via `register_all_shortcuts()` called in lib.rs:118
3. Handle in `commands/shortcut_commands.rs`

### Platform-Specific Keyboard Shortcuts

**Implementation**: All shortcuts use `CmdOrCtrl` meta-key for cross-platform compatibility:

- macOS: `Cmd+Shift+S` / `Cmd+Shift+A`
- Windows/Linux: `Ctrl+Shift+S` / `Ctrl+Shift+A`

**Key Points**:

- Constants in `shortcuts.rs` use `CmdOrCtrl+Shift+S/A` format
- Tauri's global-shortcut plugin resolves `CmdOrCtrl` to correct modifier at runtime
- Helper functions `get_search_shortcut_display()` and `get_quick_add_shortcut_display()` return platform-specific display strings
- Platform-specific tests verify correct behavior on each OS

**Linux Wayland Limitation**:

- Global shortcuts DO NOT WORK on Wayland due to compositor security restrictions
- X11: Works natively via tauri-plugin-global-shortcut
- Wayland: Must use D-Bus IPC (`io.utensils.snips` methods)
- App gracefully handles registration failures and continues startup
- See README.md for Hyprland D-Bus keybind configuration

## Key Technical Decisions

- **SQLite FTS5**: Built-in full-text search, no external deps
- **Zustand**: Lightweight state management vs Redux
- **Local-first**: All data in SQLite for speed and offline
- **Menubar app**: No dock icon, persistent menubar with badge
- **Global shortcuts**: System-wide access via tauri-plugin-global-shortcut

## Performance Targets

- Search: <100ms (p99)
- Startup: <1s cold start
- Memory: <100MB RSS

## Documentation

- [README.md](README.md) - Setup and contribution guide
- [VISION.md](VISION.md) - Product vision and MVP features
- [TECH_DESIGN.md](TECH_DESIGN.md) - Complete technical architecture
- [STANDARDS.md](STANDARDS.md) - Comprehensive coding standards
