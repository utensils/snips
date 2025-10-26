#!/usr/bin/env bash
# Spins up a lightweight display stack, launches Snips, and runs
# window-focus-loop.sh against it. Intended for CI automation.

set -euo pipefail

backend="x11"
iterations=12
delay="0.25"
binary="target/debug/snips"
log_dir="focus-logs"

print_usage() {
  cat <<'USAGE'
Usage: window-focus-ci.sh [options]

Options:
  --backend <x11|wayland>  Display backend to exercise (default: x11)
  --iterations <count>     Number of stress iterations (default: 12)
  --delay <seconds>        Delay between D-Bus invocations (default: 0.25)
  --binary <path>          Path to the built Snips binary (default: target/debug/snips)
  --log-dir <path>         Directory where logs should be written (default: focus-logs)
  -h, --help               Show this message
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --backend)
      backend="$2"
      shift 2
      ;;
    --iterations)
      iterations="$2"
      shift 2
      ;;
    --delay)
      delay="$2"
      shift 2
      ;;
    --binary)
      binary="$2"
      shift 2
      ;;
    --log-dir)
      log_dir="$2"
      shift 2
      ;;
    -h|--help)
      print_usage
      exit 0
      ;;
    *)
      echo "[error] Unknown flag: $1" >&2
      print_usage
      exit 1
      ;;
  esac
done

case "$backend" in
  x11|wayland) ;;
  *)
    echo "[error] Unsupported backend: $backend" >&2
    exit 1
    ;;
esac

if [[ ! -x "$binary" ]]; then
  echo "[error] Snips binary not found at $binary" >&2
  exit 1
fi

mkdir -p "$log_dir"

export BACKEND="$backend"
export ITERATIONS="$iterations"
export STRESS_DELAY="$delay"
export SNIPS_BINARY="$binary"
export STRESS_LOG_DIR="$log_dir"

dbus-run-session -- bash <<'EOS'
set -euo pipefail

cleanup() {
  if [[ -n "${APP_PID:-}" ]]; then
    kill "${APP_PID}" 2>/dev/null || true
    wait "${APP_PID}" 2>/dev/null || true
  fi
  if [[ -n "${DISPLAY_PID:-}" ]]; then
    kill "${DISPLAY_PID}" 2>/dev/null || true
    wait "${DISPLAY_PID}" 2>/dev/null || true
  fi
  if [[ -n "${WESTON_PID:-}" ]]; then
    kill "${WESTON_PID}" 2>/dev/null || true
    wait "${WESTON_PID}" 2>/dev/null || true
  fi
  if [[ -n "${RUNTIME_DIR:-}" && -d "${RUNTIME_DIR}" ]]; then
    rm -rf "${RUNTIME_DIR}"
  fi
}
trap cleanup EXIT

cd "${GITHUB_WORKSPACE:-$PWD}"

APP_LOG="${STRESS_LOG_DIR}/snips-${BACKEND}.log"
DISPLAY_LOG="${STRESS_LOG_DIR}/display-${BACKEND}.log"
: >"${APP_LOG}"
: >"${DISPLAY_LOG}"

if [[ "${BACKEND}" == "wayland" ]]; then
  RUNTIME_DIR="$(mktemp -d)"
  chmod 700 "${RUNTIME_DIR}"
  export XDG_RUNTIME_DIR="${RUNTIME_DIR}"
  export WAYLAND_DISPLAY="wayland-1"
  weston --backend=headless --socket="${WAYLAND_DISPLAY}" >"${DISPLAY_LOG}" 2>&1 &
  WESTON_PID=$!
  sleep 2
else
  export DISPLAY=:99
  Xvfb "${DISPLAY}" -screen 0 1280x720x24 >"${DISPLAY_LOG}" 2>&1 &
  DISPLAY_PID=$!
  sleep 2
fi

env SNIPS_METRICS=1 "${SNIPS_BINARY}" >"${APP_LOG}" 2>&1 &
APP_PID=$!

sleep 6

scripts/window-focus-loop.sh -n "${ITERATIONS}" -d "${STRESS_DELAY}"

wait "${APP_PID}" || true
EOS
