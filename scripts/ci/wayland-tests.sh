#!/usr/bin/env bash
# shellcheck disable=SC2312
#
# Run the headless Wayland reliability suite locally or in CI.
# When executed without INSIDE_WAYLAND_CI=1, this script launches a Docker
# container that mirrors the GitHub Actions job environment so contributors can
# reproduce the job locally.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
RUST_VERSION="${RUST_VERSION:-1.90.0}"
WAYLAND_TEST_IMAGE="${WAYLAND_TEST_IMAGE:-debian:bookworm-slim}"
WAYLAND_WESTON_LOG="${WAYLAND_WESTON_LOG:-wayland-weston.log}"

run_inside_container() {
  export DEBIAN_FRONTEND=noninteractive

  apt-get update
  apt-get install -y \
    build-essential \
    ca-certificates \
    curl \
    dbus \
    file \
    git \
    glib2.0-bin \
    jq \
    libayatana-appindicator3-dev \
    libssl-dev \
    libwebkit2gtk-4.1-dev \
    libxdo-dev \
    librsvg2-dev \
    pkg-config \
    weston \
    wget \
    xvfb

  if ! command -v cargo >/dev/null 2>&1; then
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs |
      sh -s -- -y --default-toolchain "${RUST_VERSION}" --profile minimal
  fi
  # shellcheck source=/dev/null
  source "${HOME}/.cargo/env"

  cargo fetch --manifest-path="${REPO_ROOT}/src-tauri/Cargo.toml"

  dbus-run-session -- bash <<'EOS'
set -euo pipefail

export XDG_RUNTIME_DIR="$(mktemp -d)"
chmod 700 "${XDG_RUNTIME_DIR}"
export WAYLAND_DISPLAY="wayland-ci"

weston --backend=headless --socket="${WAYLAND_DISPLAY}" --idle-time=0 >"${WAYLAND_WESTON_LOG}" 2>&1 &
WESTON_PID=$!
trap 'kill ${WESTON_PID} 2>/dev/null || true; rm -rf "${XDG_RUNTIME_DIR}"' EXIT

sleep 2

export SNIPS_METRICS=1

cargo test --manifest-path=src-tauri/Cargo.toml --test window_focus_e2e -- --nocapture
cargo test --manifest-path=src-tauri/Cargo.toml --test dbus_smoke -- --nocapture
EOS
}

if [[ "${INSIDE_WAYLAND_CI:-0}" == "1" ]]; then
  run_inside_container
  exit 0
fi

docker run --rm -t \
  -v "${REPO_ROOT}:/work" \
  -w /work \
  -e INSIDE_WAYLAND_CI=1 \
  -e RUST_VERSION="${RUST_VERSION}" \
  -e WAYLAND_WESTON_LOG="${WAYLAND_WESTON_LOG}" \
  "${WAYLAND_TEST_IMAGE}" \
  bash /work/scripts/ci/wayland-tests.sh
