#!/usr/bin/env bash
set -euo pipefail

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repository_root=$(CDPATH= cd -- "$script_dir/.." && pwd)
cd "$repository_root"

minimum_node_major=$(awk -F'"' '/"node"[[:space:]]*:/ { sub(/^>=/, "", $4); print $4; exit }' package.json)
expected_pnpm_version=$(awk -F'"' '/"packageManager"[[:space:]]*:/ { sub(/^pnpm@/, "", $4); print $4; exit }' package.json)

case "$minimum_node_major" in
  ''|*[!0-9]*)
    echo "package.json must declare engines.node as >=major." >&2
    exit 1
    ;;
esac

case "$expected_pnpm_version" in
  ''|*[!0-9.]*)
    echo "package.json must declare packageManager as pnpm@x.y.z." >&2
    exit 1
    ;;
esac

node_path=""
try_node() {
  candidate=$1
  [ -x "$candidate" ] || return 1
  candidate_major=$($candidate -p 'process.versions.node.split(".")[0]' 2>/dev/null) || return 1
  [ "$candidate_major" -ge "$minimum_node_major" ] || return 1
  node_path=$candidate
}

if [ -n "${CODEX_NODE_PATH:-}" ]; then
  try_node "$CODEX_NODE_PATH" || true
fi

if [ -z "$node_path" ] && command -v node >/dev/null 2>&1; then
  try_node "$(command -v node)" || true
fi

if [ -z "$node_path" ]; then
  for candidate in "$HOME"/.cache/codex-runtimes/*/dependencies/node/bin/node; do
    [ -e "$candidate" ] || continue
    if try_node "$candidate"; then
      break
    fi
  done
fi

if [ -z "$node_path" ]; then
  echo "Node >=$minimum_node_major was not found on PATH, CODEX_NODE_PATH, or the verified Codex runtime root under HOME/.cache/codex-runtimes." >&2
  exit 1
fi

PATH="$(dirname -- "$node_path"):$PATH"
export PATH

pnpm_path=""
try_pnpm() {
  candidate=$1
  [ -x "$candidate" ] || return 1
  candidate_version=$($candidate --version 2>/dev/null) || return 1
  [ "$candidate_version" = "$expected_pnpm_version" ] || return 1
  pnpm_path=$candidate
}

if [ -n "${CODEX_PNPM_PATH:-}" ]; then
  try_pnpm "$CODEX_PNPM_PATH" || true
fi

if [ -z "$pnpm_path" ] && command -v pnpm >/dev/null 2>&1; then
  try_pnpm "$(command -v pnpm)" || true
fi

node_root=$(CDPATH= cd -- "$(dirname -- "$node_path")/.." && pwd)
dependencies_root=$(CDPATH= cd -- "$node_root/.." && pwd)
if [ -z "$pnpm_path" ]; then
  try_pnpm "$dependencies_root/bin/fallback/pnpm" || true
fi

if [ -z "$pnpm_path" ]; then
  echo "pnpm $expected_pnpm_version was not found on PATH, CODEX_PNPM_PATH, or beside the selected Codex runtime. Install that exact host version; bootstrap will not fetch package-manager metadata." >&2
  exit 1
fi

PATH="$(dirname -- "$pnpm_path"):$PATH"
export PATH

echo "Node: $(node --version) ($node_path)"
echo "pnpm: $(pnpm --version) ($pnpm_path)"

pnpm install --frozen-lockfile
pnpm exec prettier --version
pnpm exec prettier --check package.json

echo "Managed-worktree bootstrap completed."
