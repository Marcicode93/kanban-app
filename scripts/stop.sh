#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="pm-kanban"

docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true

echo "Stopped."
