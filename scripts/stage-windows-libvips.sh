#!/usr/bin/env bash
set -euo pipefail

# Stages a prebuilt libvips (Windows) distribution into the repo folder used for bundling.
# Expects a vips-dev-w64-<version>-static folder as input.
#
# Usage:
#   ./scripts/stage-windows-libvips.sh /path/to/vips-dev-<version> [--minimal]
#
# Destination:
#   src-tauri/installer/windows/vips/
#
# The app will load required DLLs from to a `vips/` folder

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

echo "Copying files (libvips DLLs + vips-modules) to $DEST"
rsync -a \
  --include='libvips-42.dll' \
  --exclude='*' \
  "$SRC_ROOT/bin/" "$DEST/"

rsync -a \
  --include='libvips.lib' \
  --exclude='*' \
  "$SRC_ROOT/lib/" "$DEST/"

FILE_COUNT=$(find "$DEST" -maxdepth 1 -name '*' -type f | wc -l | tr -d ' ')

echo "Done."
echo "- Files staged:       $FILE_COUNT"

cat <<'EOF'

Next steps:
- Run a Windows build. The build script copies `installer/windows/vips/` into the bundle output.
- Ensure the installer ends up placing `vips/` next to Trokk.exe.
EOF
