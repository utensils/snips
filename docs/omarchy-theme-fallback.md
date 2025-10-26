# Omarchy Theme Fallback

Snips prefers to hydrate its colors from Omarchy's live theme export under `~/.config/omarchy/current/theme`. On fresh installs or non-Omarchy hosts that directory can be empty, leaving the UI without a palette. To keep the app usable we now ship a Catppuccin Mocha fallback palette that is applied whenever the Omarchy theme directories are missing or unreadable.

## What the fallback provides

- A dark Catppuccin Mocha baseline mapped onto Snips design tokens (`--background`, `--primary`, `--muted`, etc.)
- Adwaita Dark icons to minimise clashes with GNOME/Hyprland symbol sets
- Safe defaults that mirror the palette used throughout our Linux screenshots and QA guides

```css
:root[data-omarchy-theme='Catppuccin Mocha (Fallback)'] {
  --background: 240 21% 15%;
  --foreground: 226 64% 88%;
  --primary: 217 92% 76%;
  --primary-foreground: 226 64% 88%;
  --border: 234 13% 31%;
  --muted: 232 12% 39%;
}
```

Those values correspond to the following base palette:

| Token           | Hex       |
| --------------- | --------- |
| base/background | `#1e1e2e` |
| surface         | `#313244` |
| border          | `#45475a` |
| text/foreground | `#cdd6f4` |
| accent          | `#89b4fa` |
| muted           | `#585b70` |

You can drop the snippet above into `~/.config/snips/themes/Catppuccin Mocha (Fallback).css` if you want to override the auto-generated fragment or re-use it on hosts that do not run Omarchy.

## Behaviour in the app

1. When Snips starts it attempts to read Omarchy's live theme directory.
2. If the directory is missing, unreadable, or incomplete we log a warning and fall back to the embedded Catppuccin palette shown above.
3. The fallback still emits `appearance-updated` so the React UI and window chrome stay in sync across Wayland, X11, and macOS builds.

Once you install Omarchy or export your preferred theme into `~/.config/omarchy/current/theme`, Snips will pick it up automatically on the next run.
