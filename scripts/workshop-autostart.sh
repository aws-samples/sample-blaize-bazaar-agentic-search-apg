#!/bin/bash
# =============================================================================
# Workshop Auto-Start Service
# =============================================================================
# This script starts the backend and frontend as background services with
# auto-reload/rebuild on file changes. Designed for Workshop Studio where
# participants should never need to manually start servers.
#
# Usage:
#   source scripts/workshop-autostart.sh
#
# The script is idempotent — safe to run multiple times. It kills existing
# processes on the target ports before starting new ones.
# =============================================================================

set -euo pipefail

WORKSHOP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${WORKSHOP_ROOT}/blaize-bazaar/backend"
FRONTEND_DIR="${WORKSHOP_ROOT}/blaize-bazaar/frontend"
LOG_DIR="/tmp/blaize-bazaar"

mkdir -p "$LOG_DIR"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Blaize Bazaar — Starting workshop services...${NC}"

# -----------------------------------------------------------------------------
# Kill any existing processes on our ports
# -----------------------------------------------------------------------------
for port in 8000 5173; do
  pid=$(lsof -ti:${port} 2>/dev/null || true)
  if [ -n "$pid" ]; then
    echo "  Stopping existing process on port ${port} (PID: ${pid})"
    kill -9 $pid 2>/dev/null || true
    sleep 1
  fi
done

# -----------------------------------------------------------------------------
# Start Backend (uvicorn with --reload for auto-restart on .py changes)
# -----------------------------------------------------------------------------
echo -e "  ${GREEN}▸ Starting backend (port 8000, auto-reload on .py changes)${NC}"

cd "$BACKEND_DIR"
python3 generate_mcp_config.py 2>/dev/null || true
nohup uvicorn app:app \
  --reload \
  --host 0.0.0.0 \
  --port 8000 \
  --reload-dir . \
  > "${LOG_DIR}/backend.log" 2>&1 &

BACKEND_PID=$!
echo "    PID: ${BACKEND_PID} | Log: ${LOG_DIR}/backend.log"

# -----------------------------------------------------------------------------
# Start Frontend (static server + file watcher for auto-rebuild)
# -----------------------------------------------------------------------------
echo -e "  ${GREEN}▸ Building frontend...${NC}"

cd "$FRONTEND_DIR"

# Initial build
NODE_ENV=production npm run build > "${LOG_DIR}/frontend-build.log" 2>&1

if [ $? -ne 0 ]; then
  echo "  ❌ Frontend build failed. Check ${LOG_DIR}/frontend-build.log"
  exit 1
fi

# Start static file server
echo -e "  ${GREEN}▸ Starting frontend server (port 5173)${NC}"
nohup npx http-server dist \
  -p 5173 \
  --cors \
  -c-1 \
  > "${LOG_DIR}/frontend-server.log" 2>&1 &

FRONTEND_PID=$!
echo "    PID: ${FRONTEND_PID} | Log: ${LOG_DIR}/frontend-server.log"

# Start file watcher for auto-rebuild on .tsx/.ts/.css changes
echo -e "  ${GREEN}▸ Starting frontend file watcher (auto-rebuild on save)${NC}"
nohup npx chokidar-cli \
  'src/**/*.tsx' 'src/**/*.ts' 'src/**/*.css' \
  -c "NODE_ENV=production npm run build >> ${LOG_DIR}/frontend-build.log 2>&1 && echo '[$(date +%H:%M:%S)] Rebuild complete' >> ${LOG_DIR}/frontend-rebuild.log" \
  --debounce 1000 \
  > "${LOG_DIR}/frontend-watcher.log" 2>&1 &

WATCHER_PID=$!
echo "    PID: ${WATCHER_PID} | Log: ${LOG_DIR}/frontend-rebuild.log"

# -----------------------------------------------------------------------------
# Wait for backend to be ready
# -----------------------------------------------------------------------------
echo ""
echo -n "  Waiting for backend..."
for i in $(seq 1 30); do
  if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
    echo -e " ${GREEN}ready${NC}"
    break
  fi
  echo -n "."
  sleep 1
done

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------
echo ""
echo -e "${GREEN}✅ Blaize Bazaar is running${NC}"
echo ""

# Detect CloudFront URL if available
if [ -n "${CLOUDFRONT_URL:-}" ]; then
  echo "  🌐 App:     ${CLOUDFRONT_URL}/ports/5173/"
  echo "  🔧 API:     ${CLOUDFRONT_URL}/ports/8000/"
else
  echo "  🌐 App:     http://localhost:5173"
  echo "  🔧 API:     http://localhost:8000"
fi

echo ""
echo "  📝 Edit files in blaize-bazaar/backend/ → backend auto-reloads"
echo "  📝 Edit files in blaize-bazaar/frontend/src/ → frontend auto-rebuilds (refresh browser)"
echo ""
echo "  📋 Logs:    ${LOG_DIR}/"
echo ""
