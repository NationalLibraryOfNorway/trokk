#!/usr/bin/env bash
set -euo pipefail

# Stages a prebuilt libvips (Windows) distribution into the repo folder used for bundling.
# Expects a vips-dev-w64-<version>-static folder as input.
#
# Usage:
#   ./scripts/stage-windows-libvips.sh /path/to/vips-dev-<version>
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

if [[ ! -d "$SRC_ROOT/lib" ]]; then
  echo "Expected '$SRC_ROOT/lib'" >&2
  exit 1
fi

# Quick sanity checks so we fail fast with a helpful error.
if [[ ! -f "$SRC_ROOT/bin/libvips-42.dll" ]]; then
  echo "Could not find '$SRC_ROOT/bin/libvips-42.dll'. Is this a vips-dev-w64-web-*-static distribution?" >&2
  exit 1
fi

if [[ ! -f "$SRC_ROOT/lib/libvips.lib" ]]; then
  echo "Could not find '$SRC_ROOT/lib/libvips.lib'. Is this a vips-dev-w64-web-*-static distribution?" >&2
  exit 1
fi

REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
DEST="$REPO_ROOT/src-tauri/installer/windows/vips"

# Make the staging repeatable: start from a clean directory.
rm -rf "$DEST"
mkdir -p "$DEST"

echo "Staging libvips from: $SRC_ROOT"

echo "Copying files (libvips-42.dll + libvips.lib) to $DEST"
cp -f "$SRC_ROOT/bin/libvips-42.dll" "$DEST/"
cp -f "$SRC_ROOT/lib/libvips.lib" "$DEST/"

FILE_COUNT=$(find "$DEST" -maxdepth 1 -type f | wc -l | tr -d ' ')

echo "Done."
echo "- Files staged:       $FILE_COUNT"

cat <<'EOF'

Next steps:
- Run a Windows build. The build script copies `installer/windows/vips/` into the bundle output.
- Ensure the installer ends up placing `vips/` next to Trokk.exe.
EOF
