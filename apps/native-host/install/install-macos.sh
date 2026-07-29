#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
APP_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
INSTALL_ROOT="$HOME/.screen-assistant"
BIN_DIR="$INSTALL_ROOT/bin"
HOST_DIR="$HOME/Library/Application Support/Mozilla/NativeMessagingHosts"
HOST_BIN="$BIN_DIR/native-host"
HOST_MANIFEST="$HOST_DIR/dev.marogie.screen_assistant.json"

mkdir -p "$BIN_DIR" "$HOST_DIR"
cp "$APP_DIR/dist/index.js" "$HOST_BIN"
chmod 700 "$HOST_BIN"

sed "s|__HOST_PATH__|$HOST_BIN|g" "$SCRIPT_DIR/host-manifest.json" > "$HOST_MANIFEST"
chmod 600 "$HOST_MANIFEST"

echo "Installed native host: $HOST_BIN"
echo "Installed Firefox manifest: $HOST_MANIFEST"

