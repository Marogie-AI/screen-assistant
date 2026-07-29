#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
APP_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
INSTALL_ROOT="$HOME/.screen-assistant"
BIN_DIR="$INSTALL_ROOT/bin"
HOST_DIR="$HOME/Library/Application Support/Mozilla/NativeMessagingHosts"
HOST_BIN="$BIN_DIR/native-host"
HOST_JS="$BIN_DIR/native-host.js"
HOST_MANIFEST="$HOST_DIR/dev.marogie.screen_assistant.json"
NODE_BIN=$(command -v node)
CODEX_BIN=$(command -v codex)

mkdir -p "$BIN_DIR" "$HOST_DIR"
cp "$APP_DIR/dist/index.js" "$HOST_JS"
chmod 600 "$HOST_JS"
sed \
  -e "s|__NODE_BIN__|$NODE_BIN|g" \
  -e "s|__CODEX_BIN__|$CODEX_BIN|g" \
  -e "s|__HOST_JS__|$HOST_JS|g" \
  "$SCRIPT_DIR/native-host-wrapper.sh" > "$HOST_BIN"
chmod 700 "$HOST_BIN"

sed "s|__HOST_PATH__|$HOST_BIN|g" "$SCRIPT_DIR/host-manifest.json" > "$HOST_MANIFEST"
chmod 600 "$HOST_MANIFEST"

echo "Installed native host: $HOST_BIN"
echo "Pinned Node: $NODE_BIN"
echo "Pinned Codex: $CODEX_BIN"
echo "Installed Firefox manifest: $HOST_MANIFEST"

