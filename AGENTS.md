# Repository Guidelines

## Project Structure & Module Organization

React frontend code lives in `src/`: UI components in `src/components`, shared hooks in `src/hooks`, state stores in `src/stores`, and test utilities in `src/test`. Tailwind tokens and base styles are in `src/styles`; static assets come from `public/`. The Tauri backend sits in `src-tauri/`, split into `commands/`, `services/`, `models/`, and fully exercised by `src-tauri/tests`. Build outputs land in `dist/` and `src-tauri/target/` and should stay out of commits.

## Build, Test, and Development Commands

- `npm run dev`: Launch Vite for browser-first debugging.
- `npm run tauri dev`: Start the full desktop app with backend hot reload.
- `npm run build`: Type-check, then emit the production bundle.
- `npm run check-all`: Combine format check, ESLint, and `tsc`.
- `npm run test`, `npm run test:watch`, `npm run test:coverage`: Run Vitest once, in watch mode, or with coverage.
- `cargo test` (from `src-tauri/`): Execute Rust unit and integration suites.
  Run `mise install` once to sync toolchain versions.

## Coding Style & Naming Conventions

Prettier (`.prettierrc.json`) and ESLint (`eslint.config.js`) enforce two-space indentation for TS/TSX; `.editorconfig` sets four spaces for Rust. React components, Zustand stores, and Tauri commands use PascalCase (for example `SnippetList`), hooks begin with `use`, utilities stay in `src/lib`, and shared contracts live in `src/types`. Keep Tailwind usage aligned with `tailwind.config.js` tokens. Run `npm run lint:fix` or `npm run format`; Husky and lint-staged reapply these checks at commit time.

## Testing Guidelines

Place frontend unit and interaction tests in `src/test` using Vitest with React Testing Library; prefer descriptive `describe`/`it` names and avoid fragile snapshots. Backend behavior belongs in `src-tauri/tests`, covering command flows and migrations. Keep coverage at or above the `Frontend Checks` CI baseline and review the HTML report in `coverage/` when features slip.

## Commit & Pull Request Guidelines

Follow the conventional commit style visible in history (`fix(quick-add): …`, `docs: …`). Subjects stay under 72 characters; expand in the body when modifying behavior or schemas. Pull requests link issues, summarize user-facing impact, list the test commands you ran, and attach screenshots or recordings for UI work. Request reviewers from both disciplines when TS and Rust code change, and cite `TECH_DESIGN.md` or `VISION.md` when they provide context.
