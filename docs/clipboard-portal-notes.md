# Clipboard Portal Investigation

Flatpak/Snap sandboxes block direct X11/Wayland clipboard access. The `org.freedesktop.portal.Clipboard` API exposes a sequence for requesting clipboard ownership or reading text, but the flow requires a long-lived portal session and transferring the payload through pipe file descriptors. The high-level steps we identified are:

1. Issue `RequestClipboard` to create a `Session` handle; the portal asynchronously returns an object path under `/org/freedesktop/portal/desktop/session/...`.
2. Call `SelectionRead(session, "text/plain;charset=utf-8")` to obtain an FD and read UTF-8 payload.
3. After streaming the bytes, close the FD and signal `SelectionWriteDone` if we pushed content back into the portal.

The `ashpd` crate wraps these primitives but still requires asynchronous orchestration between `Request<T>` responses and `Session` lifecycle. We also need to decide how to integrate this with the existing `arboard` implementation without holding GTK locks (previous attempts mixed GTK 3/4 symbols).

## Implementation Notes (2025-02-15)

- A sandbox-aware pipeline now lives in `portal_clipboard_read_text`/`portal_clipboard_write_text` (see `clipboard_commands.rs`). It synthesises a unique session path and talks to `org.freedesktop.portal.Clipboard` via `zbus`, duplicating the returned file descriptors before streaming data through Tokio.
- The helpers automatically fall back to `arboard` when the portal negotiation fails, so non-sandboxed environments retain the existing behaviour.
- `probe_clipboard_support` now attempts a portal read whenever `FLATPAK_ID`/`SNAP` is detected, setting the `portal_supported` flag and surfacing detailed errors otherwise.
- Clipboard writes use `SetSelection → SelectionWrite → SelectionWriteDone`, acknowledging serial `0` and closing the portal session regardless of success, so sandboxed builds gain a working “copy” path.

Future work: monitor `SelectionTransfer` signals to honour compositor-initiated requests (for richer MIME types) and instrument metrics so we know when portal round-trips fail in the wild.
