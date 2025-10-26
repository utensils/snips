# Clipboard Portal Investigation

Flatpak/Snap sandboxes block direct X11/Wayland clipboard access. The `org.freedesktop.portal.Clipboard` API exposes a sequence for requesting clipboard ownership or reading text, but the flow requires a long-lived portal session and transferring the payload through pipe file descriptors. The high-level steps we identified are:

1. Issue `RequestClipboard` to create a `Session` handle; the portal asynchronously returns an object path under `/org/freedesktop/portal/desktop/session/...`.
2. Call `SelectionRead(session, "text/plain;charset=utf-8")` to obtain an FD and read UTF-8 payload.
3. After streaming the bytes, close the FD and signal `SelectionWriteDone` if we pushed content back into the portal.

The `ashpd` crate wraps these primitives but still requires asynchronous orchestration between `Request<T>` responses and `Session` lifecycle. We also need to decide how to integrate this with the existing `arboard` implementation without holding GTK locks (previous attempts mixed GTK 3/4 symbols).

## Proposed Next Steps

- Build a dedicated async helper in `clipboard_commands.rs` that, when `FLATPAK_ID` is set, creates a clipboard session via `ashpd::desktop::clipboard::Clipboard::new()` and reads text using `selection_read`.
- Mirror the flow for writes by streaming to the FD returned by `selection_write` and acknowledging with `selection_write_done`.
- Cache the portal availability in `probe_clipboard_support` so we can surface a meaningful warning if the session negotiation fails.

Until we finish this integration the Linux sandbox story still relies on omnipresent PRIMARY/CLIPBOARD access, so Settings continues to warn users when the portal fallback cannot be negotiated.
