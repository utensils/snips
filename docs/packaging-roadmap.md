# Packaging & Distribution Roadmap

## Flatpak (Wayland/Portal Focus)

- **Runtime choice:** target `org.freedesktop.Platform//24.08` to align with Libadwaita dependencies already present in Omarchy; bundle Rust via `org.freedesktop.Sdk.Extension.rust`.
- **Manifest structure:**
  - Build front-end with `npm ci && npm run build` in a `node` module.
  - Compile Tauri backend via `cargo build --release --locked` with `SNIPS_METRICS=0`.
  - Install binaries to `/app/bin/snips` and stage React assets under `/app/share/snips`.
- **Portal permissions:**
  - Request `--talk-name=org.freedesktop.portal.Desktop` and ensure the new clipboard helpers fallback to portal (`probe_clipboard_support` already sets warnings).
  - Add `--socket=wayland` and optional `--device=dri` for GPU acceleration; avoid `x11` when running Wayland first.
  - Use `--filesystem=xdg-run/wayland-0` (auto via socket) and `--filesystem=home:ro` for snippet import/export.
- **Post-build validation:** integrate headless CI job to run `flatpak-builder --user --install --force-clean` and execute smoke tests via `flatpak run io.utensils.Snips --diag` once manifest lands.

## Omarchy Managed App Distribution

- **Theme sync expectations:** leverage existing hook script (`omarchy-theme-set-snips`) to publish theme fragments alongside versioned releases.
- **Installer script**
  - Provide `install-snips.sh` that copies binaries to `/opt/omarchy/snips` and registers systemd user service (mirroring other managed apps).
  - Register hooks in `/etc/omarchy/hooks.d/` pointing to Snips theme refresh and DBus service start.
- **Update mechanism:** package release tarballs with version metadata; Omarchy’s updater can fetch `manifest.json` enumerating checksum, required GTK/portal deps, and compatibility with Omarchy release train.
- **Testing matrix:** add Omarchy-specific regression run (Wayland + Hyprland) that exercises portal clipboard path; capture results in `TECH_DESIGN.md` once pipeline stabilized.

## Next Research TODOs

- Prototype Flatpak manifest (`flatpak/io.utensils.Snips.json`) and validate local build.
- Document managed app service expectations (`docs/omarchy-managed-app.md`) after syncing with Omarchy tooling team.
