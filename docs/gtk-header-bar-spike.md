# GTK Header Bar Spike (Linux)

Goal: determine how to present a genuine Mutter/GTK-style titlebar while keeping the existing React/Tauri webview for window content. This spike collects the wiring steps, constraints, and follow-up tasks to de-risk the work before implementation.

## Requirements

- Works on GTK-based compositors (Mutter, GNOME Shell, Omarchy default) and Wayland first; X11 fallback can remain webview-only.
- Titlebar/toolbar rendered via Libadwaita components so it inherits Omarchy themes, accent colors, and window controls (close/min/max).
- React code should continue driving window body; header actions must be invokable from JS (e.g., open settings, toggle theme).
- No regressions for non-Linux targets: plugin should only link GTK when `target_os = "linux"`.

## Approach

1. **Custom Tauri plugin (`tauri-plugin-gtk-header`)**
   - `Builder::setup` hooks `app.listen_global("window-ready", …)` to run after each window is created.
   - On Linux, use `tauri::WindowExtUnix` to fetch the pointer to the underlying `gtk::ApplicationWindow` (`tauri::Window::gtk_window()`).
2. **Construct GTK UI**
   - Initialize GTK via `gtk::init()` once (guard with `OnceCell`).
   - Create a `gtk::HeaderBar` with Libadwaita styling (`adw::HeaderBar`) and pack:
     - `adw::WindowTitle` for window name / breadcrumb.
     - Start/stop buttons (e.g., search toggle, quick add).
     - System controls left/right (`gtk::Button::with_label`, letting GTK render indigenous icons).
   - Insert header bar with `gtk_window.set_titlebar(Some(&header_bar))`.
3. **Bridge events to webview**
   - Define plugin commands `register_header_actions` that accept JSON describing buttons + payload.
   - Buttons emit `window.emit("gtk-header-action", { id })`; frontend listens for this event to sync state.
4. **Theme Sync**
   - Reuse existing `ThemeController` results: expose `appearance-updated` payload to plugin (subscribe via Tauri event) and call `gtk_window.set_titlebar(Some(header))` refresh with accent (Libadwaita `StyleManager::set_color_scheme`).
5. **Fallback/Config**
   - Check `settings.window_chrome.linux`; only apply GTK header when `native`.
   - Allow CLI opt-out (`SNIPS_DISABLE_GTK_HEADER=1`) for incompatible compositors.

## Risks & Questions

- `gtk4` requires thread initialization on the main thread; need to ensure plugin wires before Tauri loop spawns background threads.
- Hyprland/Sway (non-GTK) might ignore GTK titlebar; provide fallback instructions (tile/floating) and verify no crashes.
- Packaging: linking against GTK and Libadwaita increases binary size; ensure Omarchy base image carries `libadwaita-1` runtime.

## Next Steps

- Prototype plugin crate with minimal header bar in a sandbox Tauri app.
- Validate Wayland focus + resizing with header bar attached.
- Add TODO item for exposing configurable header actions once the spike proves viable.
