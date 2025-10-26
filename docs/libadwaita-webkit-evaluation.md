# Libadwaita/WebKit Frontend Evaluation

The goal is to understand whether replacing the Tauri webview with a Libadwaita-based
GTK/WebKit frontend would provide a more native experience for Linux (Wayland) users
without sacrificing portability or maintainability.

## Architectures Compared

1. **Current (Tauri WebView + React)**
   - UI rendered via WebView2/Wry on each platform.
   - Plugin surface used for native integrations (shortcuts, DBus, metrics).
   - Shared code across macOS, Windows, and Linux.

2. **Hybrid Libadwaita Shell + Embedded WebView**
   - GTK `ApplicationWindow` hosts Libadwaita widgets for chrome and navigation.
   - WebView holds React content for complex views (search results, settings panels).
   - Requires GLib main loop coordination and Rust/JS messaging to stay in sync.

3. **Full Libadwaita/WebKit Rewrite**
   - Replace React with Rust/GObject UI (Adwaita widgets) and optional WebKit for
     rich text rendering.
   - All logic written in Rust; state shared via GTK models.

## Pros & Cons

| Aspect             | Hybrid Libadwaita                                | Full Libadwaita/WebKit                       | Current WebView         |
| ------------------ | ------------------------------------------------ | -------------------------------------------- | ----------------------- |
| Native look        | High for chrome; content still web               | Highest but requires full rewrite            | Medium (depends on CSS) |
| Cross-platform     | Medium – Linux-specific chrome                   | Low – Linux only unless ported               | High                    |
| Development effort | Moderate (bridge + theming)                      | Very high (rewrite UI)                       | Baseline                |
| Performance        | Slightly improved chrome; WebView still dominant | Potentially better GPU acceleration; less JS | Known quantity          |
| Theming            | Can consume Omarchy palette via Libadwaita       | Native Adwaita theming                       | CSS-based tokens        |
| Packaging          | Requires Libadwaita runtime, larger footprint    | Requires Libadwaita + portal permissions     | Minimal extra deps      |

## Findings

- Libadwaita provides native widgets (header bars, sidebar lists, dialog stacks) that
  mirror GNOME UX. However, the majority of Snips UI is data-heavy (search, snippet
  editing) and already implemented in React; rewriting would be a substantial effort.
- Hybrid shell is feasible: use GTK for window chrome/navigation, keep web frontend
  for content. This aligns with the GTK header bar spike and reduces rewrite scope.
- Full Libadwaita/WebKit approach introduces:
  - New state management strategy (likely `relm4`/`libadwaita` models) replacing React.
  - Feature parity risk (tags, search filters, editors need reimplementation).
  - Testing overhaul: existing Vitest/Playwright suites become obsolete.
- WebKit-only approach (no GTK widgets) still suffers from “browser” feel; main win
  is better Wayland rendering vs Wry, but React/Tailwind would persist.
- Hybrid approach keeps portability: macOS/Windows continue using current chrome,
  Linux-only plugin activates Libadwaita header/navigation.

## Recommendation

Pursue the **hybrid Libadwaita shell**:

- Implement GTK header bar and optional navigation panels via Tauri plugin (see
  `docs/gtk-header-bar-spike.md`).
- Keep React WebView for primary content to avoid rewrite.
- Expose a pilot flag to compare user feedback before deeper investment.

Defer full Libadwaita/WebKit rewrite; revisit only if future roadmap demands a
100% native Linux build with shared code across GTK-based platforms.

## Follow-Up Tasks

- Prototype navigation shell (Libadwaita `NavigationView` + WebView) under feature
  flag and measure startup/memory impact.
- Evaluate WebKit sandbox implications (portals, fonts, clipboard) vs current Wry.
- Update TODO once pilot data collected.
