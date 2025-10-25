<div align="center">
  <img src="src-tauri/icons/128x128@2x.png" alt="Snips Logo" width="128" height="128">

# Snips

A snippet management tool designed for building LLM prompts from reusable text snippets.

Quick access via global shortcuts enables efficient search, selection, and combination of multiple snippets.

**Platforms**: macOS (primary), Linux (active development - see limitations below)

[![Frontend Checks](https://github.com/utensils/snips/actions/workflows/frontend-checks.yml/badge.svg)](https://github.com/utensils/snips/actions/workflows/frontend-checks.yml)
[![Backend Checks](https://github.com/utensils/snips/actions/workflows/backend-checks.yml/badge.svg)](https://github.com/utensils/snips/actions/workflows/backend-checks.yml)
[![codecov](https://codecov.io/gh/utensils/snips/graph/badge.svg)](https://codecov.io/gh/utensils/snips)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

## Features

- **Quick Snippet Capture**: Global shortcut to save selected text as a snippet
  - macOS: `Cmd+Shift+A` (simulates Cmd+C)
  - Windows/Linux X11: `Ctrl+Shift+A` (reads PRIMARY selection on Linux)
  - Linux Wayland: Global shortcuts unsupported - use D-Bus keybinds (see setup below)
- **Fast Search & Selection**: Global shortcut to search and select snippets
  - macOS: `Cmd+Shift+S`
  - Windows/Linux: `Ctrl+Shift+S`
  - Linux Wayland: Use D-Bus method `ShowSearch` or `ToggleSearch` (see setup below)
- **Fast Search**: Full-text search with FTS5 across snippet names and tags
- **Multi-Select**: Select and combine multiple snippets into a single clipboard entry
- **Usage Analytics**: Track snippet usage frequency to improve search ranking
- **Menubar Integration**: Persistent menubar/tray icon with selection count badge
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

**Linux**: Additional system dependencies required:

```bash
# Arch Linux
sudo pacman -S webkit2gtk-4.1

# Debian/Ubuntu
sudo apt install libwebkit2gtk-4.1-dev

# Fedora
sudo dnf install webkit2gtk4.1-devel
```

**Linux Clipboard Notes:**

- Supports both X11 and Wayland
- Uses PRIMARY selection for quick text capture (reads highlighted text directly)
- Falls back to CLIPBOARD if PRIMARY is empty
- Requires running display server (X11 or Wayland)

**Hyprland/Wayland Integration:**

- D-Bus service available at `io.utensils.snips` for window manager integration
- Add to your Hyprland config (`~/.config/hypr/hyprland.conf`):

  ```conf
  # Search keybind (Ctrl+Shift+S equivalent)
  bind = CTRL SHIFT, S, exec, dbus-send --session --type=method_call --dest=io.utensils.snips /io/utensils/snips io.utensils.snips.ToggleSearch

  # Quick Add keybind (Ctrl+Shift+A equivalent)
  bind = CTRL SHIFT, A, exec, dbus-send --session --type=method_call --dest=io.utensils.snips /io/utensils/snips io.utensils.snips.ShowQuickAdd

  # Window rules for Quick Add dialog
  # Float by default, but allow manual tiling with Super+T
  windowrulev2 = float, title:^(Quick Add Snippet)$
  windowrulev2 = center, title:^(Quick Add Snippet)$
  windowrulev2 = size 650 700, title:^(Quick Add Snippet)$
  ```

- Available D-Bus methods: `ShowQuickAdd`, `ShowSearch`, `ToggleSearch`, `ShowManagement`
- **Note**: `ToggleSearch` is recommended for the search keybind as it matches the macOS/X11 toggle behavior
- The Quick Add window floats by default but can be tiled with `Super+T` or dragged to tile zones

**⚠️ Linux Limitations (Active Development):**

- **Wayland Global Shortcuts**: DO NOT WORK due to compositor security restrictions.
  - X11: `Ctrl+Shift+S` and `Ctrl+Shift+A` work natively via Tauri's global shortcut plugin
  - Wayland: Must use D-Bus method calls bound to window manager keybinds (see Hyprland integration above)
  - All platforms use the same internal shortcut constants (`CmdOrCtrl+Shift+S/A`) for consistency
- **Window Focus**: Unreliable on some compositors. Windows may not always receive focus/appear on top.
- **Tray Badge**: Selection count badge not supported on most Linux system trays.
- **Tested**: Hyprland on Wayland. Other DEs/compositors may have additional issues.

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

# Build for production
npm run tauri build
```

The compiled application will be in `src-tauri/target/release/`.

### Common Commands

```bash
# Code quality
npm run check-all          # Run all checks before committing
npm run format             # Format code
npm run lint               # Lint TypeScript/React

# Testing
npm run test               # Run tests in watch mode
npm run test:coverage      # Generate coverage report

# Rust
cargo fmt                  # Format Rust code
cargo clippy               # Lint Rust code
cargo test                 # Run Rust tests
```

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

We welcome contributions! Follow these steps:

1. **Fork and clone** the repository
2. **Create a branch**: `git checkout -b feature/your-feature-name`
3. **Make your changes** following our [coding standards](STANDARDS.md)
4. **Run quality checks**: `npm run check-all`
5. **Commit** using [Conventional Commits](https://www.conventionalcommits.org/) (e.g., `feat(search): add fuzzy matching`)
6. **Push and create a Pull Request**

### Standards

- All code must pass ESLint/Clippy with no warnings
- All code must be formatted with Prettier/rustfmt
- All tests must pass; new features require tests
- TypeScript strict mode must be satisfied
- No `any` types or Rust `unwrap()` in production code

Git hooks automatically run formatting, linting, and type checking on commit.

See [STANDARDS.md](STANDARDS.md) for complete guidelines.

## Documentation

- [VISION.md](VISION.md) - Product vision and roadmap
- [TECH_DESIGN.md](TECH_DESIGN.md) - Technical architecture
- [STANDARDS.md](STANDARDS.md) - Coding standards

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) with extensions: [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode), [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer), [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint), [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

For issues or questions, please [open an issue](../../issues) on GitHub.
