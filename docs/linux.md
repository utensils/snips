# Linux First Run Guide

Snips targets macOS first but now ships with a polished Linux pathway. Follow the checklist below to get a native-feeling experience on Wayland compositors such as Hyprland.

## Prerequisites

- Install runtime dependencies (`webkit2gtk-4.1`, `dbus`, `libayatana-appindicator` on most distros).
- Ensure a `DISPLAY` or `WAYLAND_DISPLAY` session is available; the app requires an active compositor to render and interact with the clipboard.
- If you use Omarchy, confirm its current theme export lives at `~/.config/omarchy/current`.

## Launching Snips

1. Clone the repo and install dependencies with `npm install`.
2. Run `npm run tauri dev` for a hot–reload preview or `npm run tauri build` for a packaged binary. The first launch migrates the SQLite database to `~/.config/io.utensils.snips/snips.db`.
3. On Wayland the global shortcuts are not registered for security reasons. Use the built-in D-Bus service instead: `dbus-send --session --dest=io.utensils.snips /io/utensils/snips io.utensils.snips.ToggleSearch`.

## Omarchy Theme Sync

- Install the hook once:
  ```bash
  mkdir -p ~/.config/omarchy/hooks
  ln -sf $(pwd)/scripts/omarchy-theme-set-snips ~/.config/omarchy/hooks/theme-set
  ```
- When Omarchy switches palettes, the hook triggers Snips’ `ReloadTheme` D-Bus method so wallpaper, accent colors, and icon theme update instantly.
- Missing Omarchy exports? Snips falls back to the embedded Catppuccin export—see `docs/omarchy-theme-fallback.md` for manual fragments.

## Hyprland & Window Rules

- Open **Settings → General** on Linux to grab the curated window rules. Use the “Copy rules” button or visit the Hyprland documentation link directly from the tooltip.
- Suggested bindings:
  ```conf
  bind = CTRL SHIFT, S, exec, dbus-send --session --dest=io.utensils.snips /io/utensils/snips io.utensils.snips.ToggleSearch
  bind = CTRL SHIFT, A, exec, dbus-send --session --dest=io.utensils.snips /io/utensils/snips io.utensils.snips.ShowQuickAdd
  ```
- Hyprland, Sway, and River are detected automatically—Snips defaults to floating windows but respects the "Window Chrome" preference if you opt into tiling.

## Diagnostics & Troubleshooting

- Run `npm run test -- --run tests/window_focus_e2e.rs` inside the Wayland CI container (`scripts/ci/wayland-tests.sh`) if a compositor refuses to focus the window.
- `tauri invoke window_diagnostics` returns JSON describing visibility, focus, tiling hints, and retry counts for support tickets.
- Export metrics by setting `SNIPS_METRICS=1` before launching; Prometheus counters track focus success by compositor.
- Clipboard issues? Settings will surface a banner when PRIMARY selection is unavailable and fall back to the standard clipboard automatically.
