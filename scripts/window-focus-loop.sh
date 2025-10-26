#!/usr/bin/env bash
# Drives Snips' D-Bus surface to stress window focus behaviour.
# Iteratively toggles key windows and verifies diagnostics stay healthy.

set -euo pipefail

TARGET="io.utensils.snips"
OBJECT="/io/utensils/snips"
INTERFACE="io.utensils.snips"

iterations=25
sleep_delay="${SNIPS_STRESS_DELAY:-0.25}"

print_usage() {
  cat <<'EOF'
Usage: window-focus-loop.sh [-n iterations] [-d delay]

Drives the running Snips instance through a focus stress loop via D-Bus.
Fails if diagnostics report windows that are visible but unfocused, or
if focus attempts exceed thresholds.

Options:
  -n, --iterations <count>   Number of stress iterations (default: 25)
  -d, --delay <seconds>      Delay between D-Bus calls (default: 0.25)
  -h, --help                 Show this help message

Environment:
  SNIPS_STRESS_DELAY         Overrides the default delay when -d is omitted.
EOF
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "[error] Missing required command: $1" >&2
    exit 1
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -n|--iterations)
      iterations="$2"
      shift 2
      ;;
    -d|--delay)
      sleep_delay="$2"
      shift 2
      ;;
    -h|--help)
      print_usage
      exit 0
      ;;
    *)
      echo "[error] Unknown option: $1" >&2
      print_usage
      exit 1
      ;;
  esac
done

require_cmd gdbus
require_cmd jq
require_cmd python3

call_dbus() {
  local allow_fail=0
  if [[ "${1:-}" == "--allow-fail" ]]; then
    allow_fail=1
    shift
  fi

  local method="$1"
  shift || true

  if ! gdbus call --session --dest "$TARGET" --object-path "$OBJECT" \
      --method "${INTERFACE}.${method}" "$@" >/dev/null; then
    if [[ $allow_fail -eq 1 ]]; then
      echo "[warn] ${method} failed (ignored)" >&2
    else
      echo "[error] ${method} failed" >&2
      exit 1
    fi
  fi
}

extract_json_tuple() {
  python3 - <<'PY'
import ast
import sys

payload = sys.stdin.read().strip()
if not payload:
    sys.exit("empty D-Bus response")

try:
    value = ast.literal_eval(payload)
except Exception as exc:  # pragma: no cover - defensive parsing
    sys.exit(f"failed to parse D-Bus tuple: {exc}")

if isinstance(value, tuple):
    if len(value) != 1:
        sys.exit("unexpected tuple arity in D-Bus response")
    value = value[0]

if not isinstance(value, str):
    sys.exit("expected string payload in D-Bus response")

sys.stdout.write(value)
PY
}

fetch_diagnostics() {
  gdbus call --session --dest "$TARGET" --object-path "$OBJECT" \
    --method "${INTERFACE}.window_diagnostics" | extract_json_tuple
}

analyze_diagnostics() {
  local iteration="$1"
  local json="$2"

  local failing
  failing="$(echo "$json" | jq '[.[] | select((.is_visible == true) and ((.focus_success == false) or ((.focus_attempts // 0) > 5) or (.visibility_expected == false) or (.always_on_top_expected == true and .always_on_top != true)))] | length')"

  if [[ "$failing" -ne 0 ]]; then
    echo "[error] Focus loop failure detected on iteration ${iteration}" >&2
    echo "$json" | jq '.' >&2
    exit 1
  fi
}

echo "[info] Starting window focus stress loop (${iterations} iterations, delay=${sleep_delay}s)"

for ((i = 1; i <= iterations; i++)); do
  echo "[info] Iteration ${i}"
  call_dbus ToggleSearch
  sleep "$sleep_delay"

  call_dbus --allow-fail ShowQuickAdd
  sleep "$sleep_delay"

  call_dbus ShowManagement
  sleep "$sleep_delay"

  call_dbus ReloadTheme
  sleep "$sleep_delay"

  diagnostics_json="$(fetch_diagnostics)"
  analyze_diagnostics "$i" "$diagnostics_json"
done

echo "[info] Focus loop completed successfully"
