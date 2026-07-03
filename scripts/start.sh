#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CONTAINER_NAME="pm-kanban"
IMAGE_NAME="pm-kanban"
PORT="${PORT:-8000}"

cd "$PROJECT_DIR"

echo "Building image..."
docker build -t "$IMAGE_NAME" .

docker rm -f "$CONTAINER_NAME" 2>/dev/null || true

ENV_ARGS=()
if [ -f .env ]; then
  ENV_ARGS=(--env-file .env)
fi

echo "Starting container..."
docker run -d \
  --name "$CONTAINER_NAME" \
  -p "${PORT}:8000" \
  -v pm-kanban-data:/app/backend/data \
  "${ENV_ARGS[@]}" \
  "$IMAGE_NAME"

echo "Running at http://localhost:${PORT}"

for _ in $(seq 1 30); do
  if curl -fs "http://localhost:${PORT}/api/health" >/dev/null 2>&1; then
    if curl -fs "http://localhost:${PORT}/api/auth/me" | grep -q '"authenticated":false'; then
      echo "App is running. Sign in at http://localhost:${PORT}"
    else
      echo "App is running at http://localhost:${PORT}"
    fi
    break
  fi
  sleep 1
done
