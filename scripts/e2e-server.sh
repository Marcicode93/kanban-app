#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PORT="${PORT:-8000}"

cd "$PROJECT_DIR/frontend"
npm run build

mkdir -p "$PROJECT_DIR/backend/static"
rm -rf "$PROJECT_DIR/backend/static"/*
cp -r out/. "$PROJECT_DIR/backend/static/"

cd "$PROJECT_DIR/backend"
exec uv run uvicorn app.main:app --host 127.0.0.1 --port "$PORT"
