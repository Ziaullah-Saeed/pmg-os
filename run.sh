#!/usr/bin/env bash
# =============================================================================
# PMG Group OS — one-command runner (Docker)  [macOS / Linux / Git-Bash / WSL]
# =============================================================================
#   ./run.sh            # build (if needed) + start, then print the app URL
#   ./run.sh up         # same as above
#   ./run.sh down       # stop the stack (keeps the DB volume/data)
#   ./run.sh logs       # follow logs from all services
#   ./run.sh restart    # restart containers (no rebuild)
#   ./run.sh rebuild    # rebuild images from scratch + recreate
#   ./run.sh status     # show container status
#
# App:   http://localhost:5173
# Login: shershah_nawabi@pmggroup-llc.com  /  PMGAdmin2024!
# -----------------------------------------------------------------------------
set -euo pipefail
cd "$(dirname "$0")"

APP_URL="http://localhost:5173"

if ! docker info >/dev/null 2>&1; then
  echo "X  Docker does not appear to be running. Start Docker and try again." >&2
  exit 1
fi

# Prefer Compose v2 (`docker compose`); fall back to v1 (`docker-compose`).
if docker compose version >/dev/null 2>&1; then
  compose() { docker compose "$@"; }
elif command -v docker-compose >/dev/null 2>&1; then
  compose() { docker-compose "$@"; }
else
  echo "X  Neither 'docker compose' nor 'docker-compose' is available." >&2
  exit 1
fi

cmd="${1:-up}"
case "$cmd" in
  up|start)
    echo "==> Building & starting PMG Group OS (first run compiles the images)..."
    compose up -d --build
    echo ""
    echo "OK  Stack is starting. It's healthy once the web container reports 'healthy'."
    echo "    App:   $APP_URL"
    echo "    Login: shershah_nawabi@pmggroup-llc.com  /  PMGAdmin2024!"
    echo "    Logs:  ./run.sh logs"
    ;;
  down)    echo "==> Stopping stack (data volume preserved)..."; compose down ;;
  logs)    compose logs -f ;;
  restart) compose restart ;;
  status)  compose ps ;;
  rebuild)
    echo "==> Rebuilding images from scratch and recreating containers..."
    compose build --no-cache
    compose up -d --force-recreate
    echo "OK  Rebuilt. App: $APP_URL"
    ;;
  *)
    echo "Unknown command '$cmd'. Use: up | down | logs | restart | rebuild | status" >&2
    exit 1
    ;;
esac
