export interface ClipboardProbeResult {
  primary_supported: boolean;
  clipboard_supported: boolean;
  portal_supported: boolean;
  sandboxed: boolean;
  primary_error?: string | null;
  clipboard_error?: string | null;
  portal_error?: string | null;
}
