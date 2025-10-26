export interface ClipboardProbeResult {
  primary_supported: boolean;
  clipboard_supported: boolean;
  primary_error?: string | null;
  clipboard_error?: string | null;
}
