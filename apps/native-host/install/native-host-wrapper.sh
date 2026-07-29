#!/bin/sh
export CODEX_BIN="__CODEX_BIN__"
export PATH="__RUNTIME_PATH__"
exec "__NODE_BIN__" "__HOST_JS__"
