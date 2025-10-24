# Snips

A macOS-native snippet management tool designed for building LLM prompts from reusable text snippets. Quick access via global shortcuts enables efficient search, selection, and combination of multiple snippets.

## Features

- **Quick Snippet Capture**: Global shortcut (`Cmd+Shift+A`) to save selected text as a snippet
- **Fast Search**: Full-text search with FTS5 across snippet names and tags (`Cmd+Shift+S`)
- **Multi-Select**: Select and combine multiple snippets into a single clipboard entry
- **Usage Analytics**: Track snippet usage frequency to improve search ranking
- **Menubar Integration**: Persistent menubar icon with selection count badge
- **Local-First**: SQLite storage for fast, offline-ready performance

## Technology Stack

- **Framework**: Tauri 2.x (Rust + Web frontend)
- **Frontend**: React with TypeScript
- **Styling**: TailwindCSS
- **Database**: SQLite with FTS5 full-text search
- **State Management**: Zustand
- **Build Tool**: Vite
- **Testing**: Vitest + React Testing Library

## Getting Started

### Prerequisites

- **Node.js** >= 18.0.0
- **Rust** >= 1.82.0 (⚠️ **Important**: Tauri dependencies require Rust 1.82+)
- **npm** >= 9.0.0
- **[mise](https://mise.jdx.dev/)** (recommended for version management)

### Installation

```bash
# Clone the repository
git clone git@github.com:utensils/snips.git
cd snips

# Install required tool versions (if using mise)
mise install

# Install npm dependencies
npm install

# IMPORTANT: Restart your shell after mise install to use the correct Rust version
# Then verify Rust version:
rustc --version  # Should show 1.82.0 or higher
```

**Note**: If you don't use `mise`, ensure you have Rust 1.82+ installed manually via [rustup](https://rustup.rs/).

### Development

```bash
# Run in development mode with hot-reload
npm run tauri dev
```

### Building

```bash
# Build for production
npm run tauri build
```

The compiled application will be in `src-tauri/target/release/`.

## Available Scripts

### Development

- `npm run dev` - Start Vite dev server
- `npm run tauri dev` - Run Tauri app in development mode

### Build

- `npm run build` - Build frontend for production
- `npm run tauri build` - Build complete Tauri application

### Code Quality

- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run lint` - Lint TypeScript/React code
- `npm run lint:fix` - Fix linting issues automatically
- `npm run type-check` - Check TypeScript types
- `npm run check-all` - Run all quality checks (format, lint, type-check, tests)

### Testing

- `npm run test` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:ui` - Open Vitest UI

### Rust

- `cargo fmt` - Format Rust code
- `cargo clippy` - Lint Rust code
- `cargo test` - Run Rust tests

## Project Structure

```
snips/
├── src/                    # Frontend source
│   ├── components/        # React components
│   ├── hooks/            # Custom React hooks
│   ├── stores/           # Zustand stores
│   ├── lib/              # Utilities and helpers
│   └── types/            # TypeScript type definitions
├── src-tauri/             # Tauri/Rust backend
│   ├── src/
│   │   ├── commands/     # Tauri command handlers
│   │   ├── services/     # Business logic
│   │   ├── models/       # Data structures
│   │   └── main.rs       # Application entry point
│   └── Cargo.toml
├── public/               # Static assets
└── package.json

```

## Contributing

We welcome contributions! Please see our [contributing guidelines](STANDARDS.md) for detailed information.

### Quick Start for Contributors

1. **Fork and clone** the repository
2. **Create a branch**: `git checkout -b feature/your-feature-name`
3. **Make your changes** following our [coding standards](STANDARDS.md)
4. **Run quality checks**: `npm run check-all`
5. **Commit your changes** using [Conventional Commits](https://www.conventionalcommits.org/)
6. **Push and create a Pull Request**

### Code Quality Standards

- All code must pass ESLint/Clippy with no warnings
- All code must be formatted with Prettier/rustfmt
- All tests must pass
- New features require tests
- TypeScript strict mode must be satisfied
- No `any` types or Rust `unwrap()` in production code

See [STANDARDS.md](STANDARDS.md) for complete coding standards and best practices.

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `style`

**Example**:

```
feat(search): add fuzzy matching to search results

Implemented FTS5 fuzzy matching with configurable threshold.
Improves search experience for typos and partial matches.

Closes #42
```

### Pre-commit Checks

Git hooks automatically run on commit:

- Code formatting (Prettier/rustfmt)
- Linting (ESLint/Clippy)
- Type checking (TypeScript)
- Related tests

### Pull Request Process

1. Ensure all tests pass and code follows style guidelines
2. Update documentation if needed
3. Add tests for new features
4. Fill out the PR template completely
5. Request review from maintainers

## Documentation

- [VISION.md](VISION.md) - Product vision and feature roadmap
- [TECH_DESIGN.md](TECH_DESIGN.md) - Technical architecture and implementation plan
- [STANDARDS.md](STANDARDS.md) - Coding standards and best practices

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## License

[License details to be added]

## Support

For issues, questions, or suggestions, please [open an issue](../../issues) on GitHub
