# Snips - Coding Standards & Best Practices

This document defines the coding standards, tooling, and best practices for the Snips project. All code—whether written by humans or AI agents—must adhere to these standards.

---

## Table of Contents

1. [Development Environment](#development-environment)
2. [Code Formatting](#code-formatting)
3. [Linting](#linting)
4. [Type Safety](#type-safety)
5. [Testing Requirements](#testing-requirements)
6. [Git Workflow](#git-workflow)
7. [Code Structure](#code-structure)
8. [Naming Conventions](#naming-conventions)
9. [Documentation](#documentation)
10. [Performance Guidelines](#performance-guidelines)
11. [Security Guidelines](#security-guidelines)
12. [Accessibility Standards](#accessibility-standards)

---

## Development Environment

### Required Tools

```bash
# Node.js (LTS version)
node --version  # >= 18.0.0

# Rust (IMPORTANT: 1.82+ required for Tauri dependencies)
rustc --version  # >= 1.82.0

# Package manager
npm --version  # >= 9.0.0
```

**Note:** This project uses `mise.toml` to manage tool versions. Run `mise install` to install all required tools.

### Editor Configuration

Use `.editorconfig` for consistent formatting across editors:

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true

[*.{js,jsx,ts,tsx,json}]
indent_style = space
indent_size = 2

[*.rs]
indent_style = space
indent_size = 4

[*.md]
trim_trailing_whitespace = false
```

### VSCode Extensions (Recommended)

- **rust-analyzer**: Rust language support
- **Tauri**: Tauri-specific tooling
- **ESLint**: JavaScript/TypeScript linting
- **Prettier**: Code formatting
- **Tailwind CSS IntelliSense**: TailwindCSS autocomplete
- **Error Lens**: Inline error display

---

## Code Formatting

### TypeScript/JavaScript - Prettier

**Configuration** (`.prettierrc.json`):

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

**Ignore file** (`.prettierignore`):

```
dist/
build/
node_modules/
coverage/
*.min.js
src-tauri/target/
```

**Commands**:

```bash
# Format all files
npm run format

# Check formatting
npm run format:check
```

**Rules**:

- ✅ **MUST** run Prettier before committing
- ✅ **MUST** use single quotes for strings
- ✅ **MUST** include semicolons
- ✅ **MUST** use trailing commas in multi-line objects/arrays
- ✅ **MUST** keep lines under 100 characters

### Rust - rustfmt

**Configuration** (`rustfmt.toml`):

```toml
edition = "2021"
max_width = 100
hard_tabs = false
tab_spaces = 4
newline_style = "Unix"
use_small_heuristics = "Default"
reorder_imports = true
reorder_modules = true
remove_nested_parens = true
merge_derives = true
use_try_shorthand = true
use_field_init_shorthand = true
force_explicit_abi = true
```

**Note:** Some advanced formatting options (like `normalize_comments`, `wrap_comments`) require Rust nightly and are not included in stable rustfmt.

**Commands**:

```bash
# Format all Rust code
cargo fmt

# Check formatting
cargo fmt -- --check
```

**Rules**:

- ✅ **MUST** run `cargo fmt` before committing
- ✅ **MUST** use 4 spaces for indentation
- ✅ **MUST** keep lines under 100 characters
- ✅ **MUST** use idiomatic Rust formatting

---

## Linting

### TypeScript/JavaScript - ESLint

**Configuration** (`eslint.config.js` - ESLint v9 flat config):

```javascript
import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

export default [
  // Global ignores
  { ignores: ['dist/', 'build/', 'node_modules/', 'coverage/', 'src-tauri/'] },

  // Base config
  js.configs.recommended,

  // TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      '@typescript-eslint': typescript,
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      import: importPlugin,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': ['warn', { allowExpressions: true }],
      '@typescript-eslint/no-explicit-any': 'error',
      'react/react-in-jsx-scope': 'off',
      'import/order': ['error', { 'newlines-between': 'always', alphabetize: { order: 'asc' } }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
    },
  },
  prettierConfig,
];
```

**Note:** ESLint v9 uses a new flat config format. Files should be ignored via the `ignores` property, not `.eslintignore`.

**Commands**:

```bash
# Lint all files
npm run lint

# Fix auto-fixable issues
npm run lint:fix
```

**Key Rules**:

- ❌ **NO** `any` type (use `unknown` if needed)
- ❌ **NO** unused variables (prefix with `_` if intentional)
- ❌ **NO** `console.log` (use `console.warn` or `console.error`)
- ✅ **MUST** use `const` by default, `let` when reassignment needed
- ✅ **MUST** order imports correctly (external → internal → relative)
- ✅ **MUST** follow React Hooks rules

### Rust - Clippy

**Configuration** (`.cargo/config.toml`):

```toml
[target.x86_64-apple-darwin]
rustflags = ["-C", "link-arg=-fuse-ld=lld"]

[alias]
lint = "clippy --all-targets --all-features -- -D warnings"
lint-fix = "clippy --fix --all-targets --all-features --allow-dirty --allow-staged"
```

**Commands**:

```bash
# Lint all Rust code
cargo clippy -- -D warnings

# Fix auto-fixable issues
cargo clippy --fix
```

**Key Rules**:

- ❌ **NO** `unwrap()` or `expect()` in production code (use proper error handling)
- ❌ **NO** `panic!()` unless truly unrecoverable
- ❌ **NO** warnings allowed (treat warnings as errors in CI)
- ✅ **MUST** handle all `Result` and `Option` types explicitly
- ✅ **MUST** use `?` operator for error propagation
- ✅ **MUST** add `#[must_use]` on functions that return important values

---

## Type Safety

### TypeScript Configuration

**`tsconfig.json`**:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitReturns": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "forceConsistentCasingInFileNames": true,

    /* Path mapping */
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/components/*": ["src/components/*"],
      "@/lib/*": ["src/lib/*"],
      "@/hooks/*": ["src/hooks/*"],
      "@/stores/*": ["src/stores/*"],
      "@/types/*": ["src/types/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**Type Safety Rules**:

- ✅ **MUST** enable `strict` mode
- ✅ **MUST** type all function parameters and return values
- ✅ **MUST** avoid type assertions (`as`) unless absolutely necessary
- ✅ **MUST** use discriminated unions for complex state
- ✅ **MUST** use `readonly` for immutable data
- ✅ **SHOULD** use branded types for domain-specific IDs
- ❌ **NO** implicit `any` types
- ❌ **NO** type assertions to bypass type checking

**Example - Branded Types**:

```typescript
// Good: Type-safe IDs
type SnippetId = number & { readonly __brand: 'SnippetId' };
type TagId = number & { readonly __brand: 'TagId' };

function getSnippet(id: SnippetId): Promise<Snippet> {
  // ...
}

// Bad: Mixing up IDs
function deleteTag(id: number) {
  // Could accidentally pass a snippet ID
}
```

### Rust Type Safety

**Rules**:

- ✅ **MUST** use strong types over primitives (newtype pattern)
- ✅ **MUST** use `#[derive(Debug, Clone)]` on all data structures
- ✅ **MUST** use `serde` for serialization with explicit field names
- ✅ **MUST** implement `thiserror::Error` for custom errors
- ✅ **SHOULD** use `Option<T>` instead of nullable values
- ✅ **SHOULD** use builder pattern for complex structs

**Example - Newtype Pattern**:

```rust
// Good: Strong types
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct SnippetId(i64);

// Bad: Primitive obsession
pub fn get_snippet(id: i64) -> Result<Snippet> {
    // Could accidentally pass wrong ID type
}
```

---

## Testing Requirements

### Test Coverage Targets

- **Rust**: Minimum 80% code coverage
- **TypeScript**: Minimum 70% code coverage
- **Critical paths**: 100% coverage required

### TypeScript Testing Stack

**Tools**:

- **Vitest**: Unit test runner
- **React Testing Library**: Component testing
- **MSW**: API mocking
- **Playwright**: E2E testing (optional for MVP)

**Test file naming**:

- `ComponentName.test.tsx` - Component tests
- `functionName.test.ts` - Utility function tests
- `storeName.test.ts` - Store/state tests

**Commands**:

```bash
# Run all tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

**Test Requirements**:

- ✅ **MUST** test all exported functions
- ✅ **MUST** test component user interactions
- ✅ **MUST** test error states
- ✅ **MUST** test loading states
- ✅ **MUST** mock Tauri API calls
- ✅ **SHOULD** use data-testid for test selectors
- ❌ **NO** testing implementation details
- ❌ **NO** snapshot tests without justification

**Example Test**:

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { SearchOverlay } from './SearchOverlay';

vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn(),
}));

describe('SearchOverlay', () => {
  it('should filter results as user types', async () => {
    const mockSearch = vi.fn().mockResolvedValue([
      { id: 1, name: 'test', content: 'test content' },
    ]);

    render(<SearchOverlay onClose={vi.fn()} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });

    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalledWith('test');
    });

    expect(screen.getByText('test')).toBeInTheDocument();
  });
});
```

### Rust Testing

**Test Requirements**:

- ✅ **MUST** write unit tests for all public functions
- ✅ **MUST** write integration tests for database operations
- ✅ **MUST** test error conditions
- ✅ **MUST** use `#[cfg(test)]` for test modules
- ✅ **SHOULD** use property-based testing for complex logic

**Commands**:

```bash
# Run all tests
cargo test

# Run with coverage (using tarpaulin)
cargo tarpaulin --out Html --output-dir coverage
```

**Example Test**:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_snippet() {
        let snippet = Snippet::new("test", "content");
        assert_eq!(snippet.name, "test");
        assert_eq!(snippet.content, "content");
    }

    #[tokio::test]
    async fn test_search_snippets() {
        let db = setup_test_db().await;
        let results = search_snippets(&db, "test").await.unwrap();
        assert_eq!(results.len(), 1);
    }
}
```

---

## Git Workflow

### Branch Naming

```
feature/short-description    # New features
bugfix/issue-description     # Bug fixes
refactor/component-name      # Code refactoring
docs/update-readme          # Documentation
chore/update-dependencies   # Maintenance tasks
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:

- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `docs`: Documentation changes
- `test`: Adding/updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `style`: Code style changes (formatting)

**Examples**:

```
feat(search): add fuzzy matching to search results

Implemented FTS5 fuzzy matching with configurable threshold.
Improves search experience for typos and partial matches.

Closes #42

---

fix(clipboard): handle empty selection gracefully

Previously crashed when trying to copy with no selections.
Now shows a toast notification instead.

---

refactor(database): extract query builders into separate module

Improves code organization and testability.
```

**Rules**:

- ✅ **MUST** use conventional commit format
- ✅ **MUST** write clear, descriptive messages
- ✅ **MUST** reference issue numbers when applicable
- ✅ **SHOULD** limit subject line to 72 characters
- ✅ **SHOULD** explain "why" in the body, not "what"

### Pre-commit Hooks

Use **Husky** and **lint-staged** to enforce quality:

**`.husky/pre-commit`**:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run lint-staged
cargo fmt -- --check
cargo clippy -- -D warnings
```

**`package.json`**:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write", "vitest related --run"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

### Pull Request Requirements

**Before creating a PR**:

- ✅ All tests passing
- ✅ No linting errors
- ✅ Code formatted correctly
- ✅ New tests added for new features
- ✅ Documentation updated if needed

**PR Description Template**:

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

How was this tested?

## Checklist

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] All tests passing
- [ ] No new warnings
```

---

## Code Structure

### Frontend Directory Structure

```
src/
├── components/           # React components
│   ├── ui/              # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── Card.tsx
│   ├── SearchOverlay/
│   │   ├── SearchOverlay.tsx
│   │   ├── SearchOverlay.test.tsx
│   │   ├── SearchResult.tsx
│   │   └── index.ts     # Barrel export
│   └── ManagementWindow/
├── hooks/               # Custom React hooks
│   ├── useSnippets.ts
│   ├── useSearch.ts
│   └── useClipboard.ts
├── stores/              # Zustand stores
│   ├── snippetStore.ts
│   └── uiStore.ts
├── lib/                 # Utilities and helpers
│   ├── tauri.ts        # Tauri API wrapper
│   ├── formatters.ts   # Data formatting
│   └── validators.ts   # Input validation
├── types/              # TypeScript types
│   ├── snippet.ts
│   ├── analytics.ts
│   └── api.ts
├── styles/             # Global styles
│   └── globals.css
├── App.tsx
└── main.tsx
```

### Backend Directory Structure

```
src-tauri/
├── src/
│   ├── main.rs              # Entry point
│   ├── lib.rs               # Library root
│   ├── commands/            # Tauri command handlers
│   │   ├── mod.rs
│   │   ├── snippet_commands.rs
│   │   ├── search_commands.rs
│   │   ├── analytics_commands.rs
│   │   └── clipboard_commands.rs
│   ├── services/            # Business logic
│   │   ├── mod.rs
│   │   ├── database.rs
│   │   ├── search.rs
│   │   └── analytics.rs
│   ├── models/              # Data structures
│   │   ├── mod.rs
│   │   ├── snippet.rs
│   │   ├── tag.rs
│   │   └── analytics.rs
│   ├── utils/               # Utilities
│   │   ├── mod.rs
│   │   └── error.rs
│   └── tests/               # Integration tests
│       └── database_tests.rs
├── Cargo.toml
└── tauri.conf.json
```

### File Organization Rules

- ✅ **MUST** use barrel exports (`index.ts`) for component directories
- ✅ **MUST** colocate tests with implementation files
- ✅ **MUST** keep components under 300 lines (split if larger)
- ✅ **MUST** keep functions under 50 lines (split if larger)
- ✅ **SHOULD** use feature-based organization when appropriate
- ❌ **NO** circular dependencies

---

## Naming Conventions

### TypeScript/JavaScript

**Files**:

- Components: `PascalCase.tsx` (e.g., `SearchOverlay.tsx`)
- Utilities: `camelCase.ts` (e.g., `formatDate.ts`)
- Hooks: `useCamelCase.ts` (e.g., `useSnippets.ts`)
- Types: `camelCase.ts` (e.g., `snippet.ts`)
- Constants: `SCREAMING_SNAKE_CASE.ts` (e.g., `SHORTCUTS.ts`)

**Variables & Functions**:

- Variables: `camelCase` (e.g., `snippetCount`)
- Functions: `camelCase` (e.g., `getSnippets`)
- Components: `PascalCase` (e.g., `SearchOverlay`)
- Constants: `SCREAMING_SNAKE_CASE` (e.g., `MAX_RESULTS`)
- Types/Interfaces: `PascalCase` (e.g., `Snippet`, `SearchResult`)
- Enums: `PascalCase` with `SCREAMING_SNAKE_CASE` values

**Booleans**: Use `is`, `has`, `should` prefixes

```typescript
const isLoading = true;
const hasPermission = false;
const shouldRender = true;
```

**Event Handlers**: Use `handle` prefix

```typescript
const handleClick = () => {};
const handleSubmit = () => {};
```

### Rust

**Files**: `snake_case.rs` (e.g., `snippet_commands.rs`)

**Items**:

- Modules: `snake_case` (e.g., `mod database;`)
- Structs: `PascalCase` (e.g., `Snippet`)
- Enums: `PascalCase` (e.g., `SearchResult`)
- Functions: `snake_case` (e.g., `get_snippet`)
- Constants: `SCREAMING_SNAKE_CASE` (e.g., `MAX_RETRIES`)
- Traits: `PascalCase` (e.g., `Searchable`)

**Lifetimes**: Use descriptive names or `'a`, `'b` for short scopes

```rust
fn process<'input, 'output>(input: &'input str) -> &'output str
```

---

## Documentation

### TypeScript Documentation

Use **JSDoc** for all public APIs:

````typescript
/**
 * Searches snippets using full-text search with optional filters.
 *
 * @param query - The search query string
 * @param options - Optional search configuration
 * @param options.limit - Maximum number of results (default: 50)
 * @param options.tags - Filter by tags
 * @returns Promise resolving to search results with usage stats
 * @throws {Error} If search query is invalid
 *
 * @example
 * ```typescript
 * const results = await searchSnippets('react hooks', { limit: 10 });
 * ```
 */
export async function searchSnippets(
  query: string,
  options?: SearchOptions
): Promise<SearchResult[]> {
  // Implementation
}
````

**Documentation Rules**:

- ✅ **MUST** document all exported functions and classes
- ✅ **MUST** include examples for complex APIs
- ✅ **MUST** document parameters, return types, and exceptions
- ✅ **SHOULD** document non-obvious implementation details
- ✅ **SHOULD** use `@see` to link related functions

### Rust Documentation

Use **rustdoc** comments:

````rust
/// Searches snippets using FTS5 full-text search.
///
/// # Arguments
///
/// * `db` - Database connection pool
/// * `query` - Search query string
/// * `limit` - Maximum number of results
///
/// # Returns
///
/// Vector of `SearchResult` sorted by relevance and usage frequency.
///
/// # Errors
///
/// Returns `DatabaseError` if the query fails or database is unavailable.
///
/// # Examples
///
/// ```rust
/// let results = search_snippets(&db, "rust async", 10).await?;
/// ```
pub async fn search_snippets(
    db: &Database,
    query: &str,
    limit: i64,
) -> Result<Vec<SearchResult>, DatabaseError> {
    // Implementation
}
````

**Documentation Rules**:

- ✅ **MUST** document all public items (`pub`)
- ✅ **MUST** use sections: Arguments, Returns, Errors, Examples
- ✅ **MUST** document safety for `unsafe` code
- ✅ **SHOULD** include usage examples
- ✅ **SHOULD** document panics if applicable

### README Files

Each major module/component should have a README:

```markdown
# Component Name

Brief description of purpose.

## Usage

Code example showing how to use.

## API

List of main functions/methods.

## Testing

How to run tests for this module.
```

---

## Performance Guidelines

### General Rules

- ✅ **MUST** avoid premature optimization (measure first)
- ✅ **MUST** use React.memo for expensive components
- ✅ **MUST** debounce user input for search
- ✅ **MUST** use virtualization for long lists (react-window)
- ✅ **MUST** lazy-load images and heavy components
- ✅ **SHOULD** use `useMemo` and `useCallback` appropriately
- ❌ **NO** unnecessary re-renders
- ❌ **NO** synchronous expensive operations on main thread

### Frontend Performance

**React Optimization**:

```typescript
// Good: Memoized component
const SearchResult = React.memo(({ snippet, onSelect }) => {
  return <div onClick={onSelect}>{snippet.name}</div>;
});

// Good: Memoized expensive computation
const sortedResults = useMemo(() => {
  return results.sort((a, b) => b.score - a.score);
}, [results]);

// Good: Stable callback reference
const handleSelect = useCallback((id: number) => {
  selectSnippet(id);
}, []);
```

**Bundle Size**:

- ✅ **MUST** code-split routes
- ✅ **MUST** tree-shake unused code
- ✅ **SHOULD** analyze bundle size regularly
- ❌ **NO** importing entire libraries (use named imports)

### Backend Performance

**Database**:

```rust
// Good: Prepared statements (via tauri-plugin-sql)
db.execute(
    "SELECT * FROM snippets WHERE name = ?",
    &[name]
).await?;

// Good: Batch operations
db.transaction(|tx| {
    for snippet in snippets {
        tx.execute(INSERT_QUERY, &[snippet])?;
    }
    Ok(())
}).await?;

// Bad: N+1 queries
for snippet in snippets {
    let tags = db.query("SELECT * FROM tags WHERE snippet_id = ?", &[snippet.id]).await?;
}
```

---

## Security Guidelines

### Input Validation

```typescript
// Good: Validate and sanitize
function createSnippet(name: string, content: string) {
  if (!name || name.length > 255) {
    throw new ValidationError('Invalid snippet name');
  }
  if (!content || content.length > 100000) {
    throw new ValidationError('Content too large');
  }
  return invoke('create_snippet', { name: sanitize(name), content });
}
```

### Rust Security

```rust
// Good: Use parameterized queries (handled by tauri-plugin-sql)
db.execute(
    "INSERT INTO snippets (name, content) VALUES (?, ?)",
    &[name, content]
).await?;

// Bad: String concatenation (SQL injection risk)
let query = format!("INSERT INTO snippets (name) VALUES ('{}')", name);
```

**Rules**:

- ✅ **MUST** validate all user input
- ✅ **MUST** use parameterized queries
- ✅ **MUST** sanitize HTML if rendering user content
- ✅ **MUST** limit input sizes (prevent DoS)
- ❌ **NO** string concatenation for SQL
- ❌ **NO** `eval()` or `Function()` constructor
- ❌ **NO** `dangerouslySetInnerHTML` without sanitization

---

## Accessibility Standards

### WCAG 2.1 AA Compliance

**Requirements**:

- ✅ **MUST** support keyboard navigation
- ✅ **MUST** provide ARIA labels for interactive elements
- ✅ **MUST** maintain 4.5:1 contrast ratio for text
- ✅ **MUST** provide focus indicators
- ✅ **MUST** use semantic HTML elements
- ✅ **SHOULD** support screen readers

**Example**:

```typescript
<button
  aria-label="Copy selected snippets"
  onClick={handleCopy}
  disabled={selectedCount === 0}
>
  Copy ({selectedCount})
</button>

<input
  type="text"
  role="searchbox"
  aria-label="Search snippets"
  aria-describedby="search-hint"
  value={query}
  onChange={handleChange}
/>
<span id="search-hint" className="sr-only">
  Type to search snippets by name or content
</span>
```

**Keyboard Shortcuts**:

- `Tab` / `Shift+Tab`: Navigate
- `Enter`: Activate/Submit
- `Escape`: Close/Cancel
- `Arrow keys`: Navigate lists
- `Space`: Toggle checkboxes

---

## Code Review Checklist

Before requesting review:

- [ ] Code follows formatting standards (Prettier/rustfmt)
- [ ] No linting errors (ESLint/Clippy)
- [ ] All tests passing
- [ ] New tests added for new features
- [ ] TypeScript strict mode enabled and passing
- [ ] No `any` types or `unwrap()` calls
- [ ] Functions are small and focused (<50 lines)
- [ ] Complex logic has explanatory comments
- [ ] Public APIs documented (JSDoc/rustdoc)
- [ ] Performance considerations addressed
- [ ] Accessibility requirements met
- [ ] Security best practices followed
- [ ] No hardcoded secrets or credentials
- [ ] Git commit messages follow conventions

---

## Enforcement

### CI/CD Pipeline

All checks run on every push:

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run format:check
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test:coverage

  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions-rs/toolchain@v1
      - run: cargo fmt -- --check
      - run: cargo clippy -- -D warnings
      - run: cargo test
      - run: cargo tarpaulin --out Xml
```

### Local Development

**Setup script**:

```bash
# Install Git hooks
npm run prepare  # Installs Husky

# Verify setup
npm run check-all  # Runs all quality checks
```

---

## Resources

### TypeScript

- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)

### Rust

- [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
- [Rust Design Patterns](https://rust-unofficial.github.io/patterns/)

### Testing

- [Testing Library Docs](https://testing-library.com/docs/)
- [Vitest Documentation](https://vitest.dev/)

### Accessibility

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)

---

## Updates

This document is a living standard. When updating:

1. Propose changes via pull request
2. Get team approval (or lead developer approval)
3. Update version date below
4. Announce changes to team

**Last Updated**: 2025-10-24
**Version**: 1.0.0

---

_These standards ensure high code quality, maintainability, and consistency across the Snips codebase._
