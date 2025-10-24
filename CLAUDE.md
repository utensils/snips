# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Snips is a macOS-native snippet management tool built with Tauri 2.x, designed for building LLM prompts from reusable text snippets. It provides:

- Quick snippet capture via global shortcuts
- Fast full-text search across snippets
- Multi-select functionality for combining snippets
- Usage analytics for search ranking
- Menubar-only presence (no dock icon)

## Development Commands

### Running the App

```bash
npm run tauri dev          # Run app in development mode with hot-reload
npm run dev                # Start Vite dev server only (for frontend testing)
```

### Building

```bash
npm run tauri build        # Build complete production application
npm run build              # Build frontend only
```

### Code Quality

```bash
npm run check-all          # Run ALL checks (format, lint, type-check) - use before commits
npm run format             # Format TypeScript/React code with Prettier
npm run format:check       # Check formatting without modifying files
npm run lint               # Lint TypeScript/React code with ESLint
npm run lint:fix           # Auto-fix linting issues
npm run type-check         # Check TypeScript types
```

### Testing

```bash
npm run test               # Run tests in watch mode
npm run test:coverage      # Run tests with coverage report
npm run test:ui            # Open Vitest UI for interactive testing
```

### Rust

```bash
cargo fmt                  # Format Rust code
cargo fmt -- --check       # Check Rust formatting
cargo clippy -- -D warnings # Lint Rust code (warnings treated as errors)
cargo test                 # Run Rust tests
```

## Architecture

### Backend (Rust/Tauri)

- **Entry point**: `src-tauri/src/main.rs` calls `src-tauri/src/lib.rs`
- **Structure**: Commands → Services → Database
  - `commands/`: Tauri command handlers (IPC layer)
  - `services/`: Business logic (database, search, analytics)
  - `models/`: Data structures (Snippet, Tag, Analytics)
  - `utils/`: Shared utilities and error handling

### Frontend (React/TypeScript)

- **Entry point**: `src/main.tsx` → `src/App.tsx`
- **State**: Zustand stores in `src/stores/`
- **Components**: React components in `src/components/`
  - `ui/`: Reusable UI components (Button, Input, Card)
  - Feature components: SearchOverlay, QuickAddDialog, ManagementWindow
- **Hooks**: Custom React hooks in `src/hooks/`
- **Utils**: Helper functions in `src/lib/`
- **Types**: TypeScript type definitions in `src/types/`

### Database (SQLite)

- **Storage**: Local SQLite database with FTS5 full-text search
- **Schema**: snippets, tags, snippet_tags (many-to-many), analytics, snippets_fts (FTS5 virtual table)
- **Search**: FTS5 enables fast full-text search with relevance ranking
- **Analytics**: Usage tracking for frequency-based search ranking

## Critical Requirements

### Rust Code Standards

- **NO** `unwrap()` or `expect()` in production code - use proper error handling with `?` operator
- **NO** `panic!()` unless truly unrecoverable
- **MUST** handle all `Result` and `Option` types explicitly
- **MUST** use parameterized queries (via tauri-plugin-sql) to prevent SQL injection
- Use newtype pattern for strong typing (e.g., `SnippetId(i64)` instead of `i64`)
- Add `#[derive(Debug, Clone)]` on all data structures
- Implement `thiserror::Error` for custom errors

### TypeScript Code Standards

- **NO** `any` type (use `unknown` if needed)
- **NO** `console.log` (use `console.warn` or `console.error`)
- **NO** unused variables (prefix with `_` if intentional)
- **MUST** use `const` by default, `let` only when reassignment needed
- **MUST** type all function parameters and return values
- **MUST** order imports: external → internal → relative
- Keep functions under 50 lines (split if larger)
- Keep components under 300 lines (split if larger)
- Avoid type assertions (`as`) unless absolutely necessary

### Path Aliases

Both TypeScript and Vite are configured with path aliases:

```typescript
import { Button } from '@/components/ui/Button'; // Not '../../../components/ui/Button'
import { useSnippets } from '@/hooks/useSnippets';
import { formatDate } from '@/lib/formatters';
```

### Code Formatting

- **TypeScript**: Single quotes, semicolons, trailing commas, 100 char line width
- **Rust**: 4 spaces, 100 char line width, idiomatic formatting
- **ALWAYS** run formatters before committing

### Testing

- Test files colocated with implementation: `Component.tsx` → `Component.test.tsx`
- Use Vitest + React Testing Library for frontend tests
- Mock Tauri API calls in tests using `vi.mock('@tauri-apps/api/tauri')`
- Target 70%+ coverage for TypeScript, 80%+ for Rust
- Test error states, loading states, and user interactions

## Development Workflow

### Before Starting Work

1. Ensure Rust 1.82+ is installed (Tauri dependency): `rustc --version`
2. Install dependencies: `npm install`
3. Verify setup works: `npm run tauri dev`

### Before Committing

1. Run `npm run check-all` to verify all quality checks pass
2. Ensure all tests pass: `npm run test`
3. Use Conventional Commits format:
   - `feat(scope): description` - New features
   - `fix(scope): description` - Bug fixes
   - `refactor(scope): description` - Code refactoring
   - `test(scope): description` - Adding/updating tests
   - `docs(scope): description` - Documentation changes
   - `chore(scope): description` - Maintenance tasks

### Development Phases

The project follows a phased approach (see TECH_DESIGN.md):

1. **Phase 1 (Foundation)**: Database, CRUD operations, basic React structure
2. **Phase 2 (Core UX)**: Global shortcuts, search overlay, multi-select, clipboard
3. **Phase 3 (Polish)**: Analytics, management UI, performance optimization

## Key Technical Decisions

- **Rust 1.82+ required**: Tauri dependencies mandate this version
- **SQLite FTS5**: Built-in full-text search, no external dependencies
- **Zustand**: Lightweight state management, better TypeScript support than Redux
- **Local-first**: All data stored locally in SQLite for speed and offline capability
- **Menubar app**: No dock icon, persistent menubar presence with badge count

## Common Tasks

### Adding a New Tauri Command

1. Define command in `src-tauri/src/commands/` (e.g., `snippet_commands.rs`)
2. Register in `src-tauri/src/lib.rs` via `generate_handler!`
3. Create TypeScript types in `src/types/`
4. Call from frontend using `invoke('command_name', { params })`
5. Add tests for both Rust and TypeScript sides

### Adding a New React Component

1. Create in appropriate directory (e.g., `src/components/SearchOverlay/`)
2. Include component file, test file, and `index.ts` barrel export
3. Use TypeScript for props interface
4. Implement keyboard navigation and accessibility (ARIA labels)
5. Add tests using React Testing Library

### Running Tests for a Specific File

```bash
# Frontend
npm run test -- src/components/SearchOverlay.test.tsx

# Backend
cargo test --test snippet_tests
```

## Accessibility Requirements

- **MUST** support keyboard navigation (Tab, Arrow keys, Enter, Escape)
- **MUST** provide ARIA labels for interactive elements
- **MUST** maintain 4.5:1 contrast ratio for text
- **MUST** provide focus indicators
- **MUST** use semantic HTML elements

## Security Considerations

- Validate all user input before database operations
- Use parameterized queries (handled by tauri-plugin-sql)
- Sanitize HTML if rendering user content
- Limit input sizes to prevent DoS
- Never use `eval()` or `dangerouslySetInnerHTML` without sanitization

## Performance Targets

- Search response: <100ms (99th percentile)
- App startup: <1 second cold start
- Window open: <50ms to visible
- Memory usage: <100MB resident set size

## Documentation

For detailed information, refer to:

- [README.md](README.md) - Project overview, setup, and contribution guide
- [VISION.md](VISION.md) - Product vision, MVP features, and future roadmap
- [TECH_DESIGN.md](TECH_DESIGN.md) - Complete technical architecture and implementation plan
- [STANDARDS.md](STANDARDS.md) - Comprehensive coding standards and best practices
