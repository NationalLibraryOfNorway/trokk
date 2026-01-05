#!/usr/bin/env bash
set -euo pipefail

# Stages a prebuilt libvips (Windows) distribution into the repo folder used for bundling.
#
# Usage:
#   ./scripts/stage-windows-libvips.sh /path/to/vips-dev-<version>
#
# This script is designed for zips like `vips-dev-w64-all-8.xx`.
#
# It copies:
# - all DLLs from `bin/`
# - vips modules from `bin/vips-modules-*`
# - (recommended) `etc/` and `share/` for optional loaders/config
#
# Destination:
#   src-tauri/installer/windows/vips/
#
# The app will load DLLs from a `vips/` folder placed next to the installed .exe.

SRC_ROOT=${1:-}
if [[ -z "$SRC_ROOT" ]]; then
  echo "Usage: $0 /path/to/vips-dev-<version>" >&2
  exit 1
fi

if [[ ! -d "$SRC_ROOT/bin" ]]; then
  echo "Expected '$SRC_ROOT/bin'" >&2
  exit 1
fi

# Quick sanity checks so we fail fast with a helpful error.
if ! ls "$SRC_ROOT"/bin/libvips-*.dll >/dev/null 2>&1; then
  echo "Could not find '$SRC_ROOT/bin/libvips-*.dll'. Is this a vips-dev-w64 distribution?" >&2
  exit 1
fi

REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
DEST="$REPO_ROOT/src-tauri/installer/windows/vips"

# Make the staging repeatable: start from a clean directory.
rm -rf "$DEST"
mkdir -p "$DEST"

echo "Staging libvips from: $SRC_ROOT"
echo "Destination:        $DEST"

# 1) The critical part: all DLLs the vips runtime needs.
#    (This vips-dev distribution already includes a consistent runtime DLL set.)
rsync -a \
  --include='*/' \
  --include='*.dll' \
  --include='vips-modules-*/**' \
  --exclude='*' \
  "$SRC_ROOT/bin/" "$DEST/"

# 2) Some loaders rely on config/data. Copy them so optional modules don't crash if used.
for d in etc share; do
  if [[ -d "$SRC_ROOT/$d" ]]; then
    rsync -a "$SRC_ROOT/$d" "$DEST/"
  fi
done

# 3) Include metadata/license for traceability.
for f in LICENSE README.md versions.json files.txt; do
  if [[ -f "$SRC_ROOT/$f" ]]; then
    cp -f "$SRC_ROOT/$f" "$DEST/"
  fi
done

DLL_COUNT=$(find "$DEST" -maxdepth 1 -name '*.dll' -type f | wc -l | tr -d ' ')
MOD_DIR=$(find "$DEST" -maxdepth 1 -type d -name 'vips-modules-*' | head -n 1 || true)

echo "Done."
echo "- DLLs staged:       $DLL_COUNT"
if [[ -n "$MOD_DIR" ]]; then
  echo "- Modules folder:    $(basename "$MOD_DIR")"
else
  echo "- Modules folder:    (not found)"
fi

cat <<'EOF'

Next steps:
- Run a Windows build. The build script copies `installer/windows/vips/` into the bundle output.
- Ensure the installer ends up placing `vips/` next to Trokk.exe.
EOF
