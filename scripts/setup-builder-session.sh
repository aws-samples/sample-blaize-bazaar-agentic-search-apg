#!/bin/bash
# =============================================================================
# Builder's Session Setup Script
# Purpose: Pre-bake Module 3b, 4, and 5 solutions so the multi-agent system
#          and AgentCore services work out of the box. Participants only need
#          to complete Module 2 (semantic search) and Module 3a (agent tools).
#
# Run AFTER bootstrap-labs.sh completes (or as a final step in bootstrap).
# Designed for facilitators to run before participants sit down.
# =============================================================================

set -uo pipefail

CODE_EDITOR_USER="${CODE_EDITOR_USER:-participant}"
HOME_FOLDER="${HOME_FOLDER:-/workshop}"
REPO_NAME="sample-blaize-bazaar-agentic-search-apg"
REPO_PATH="$HOME_FOLDER/$REPO_NAME"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
log() { echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"; }
warn() { echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARNING:${NC} $1"; }
header() { echo -e "\n${CYAN}═══════════════════════════════════════════════════${NC}"; echo -e "${CYAN}  $1${NC}"; echo -e "${CYAN}═══════════════════════════════════════════════════${NC}\n"; }

header "Builder's Session Setup"
log "Repo path: $REPO_PATH"

# =============================================================================
# STEP 1: PRE-BAKE SOLUTIONS (Module 3b, 4, 5)
# =============================================================================
header "Step 1: Pre-baking advanced module solutions"

# Module 3b — Multi-Agent Orchestration (recommendation agent + orchestrator)
if [ -f "$REPO_PATH/solutions/module3b/agents/recommendation_agent.py" ]; then
    cp "$REPO_PATH/solutions/module3b/agents/recommendation_agent.py" \
       "$REPO_PATH/blaize-bazaar/backend/agents/recommendation_agent.py"
    log "✅ Module 3b: recommendation_agent.py → pre-baked"
else
    warn "Module 3b recommendation_agent.py solution not found"
fi

if [ -f "$REPO_PATH/solutions/module3b/agents/orchestrator.py" ]; then
    cp "$REPO_PATH/solutions/module3b/agents/orchestrator.py" \
       "$REPO_PATH/blaize-bazaar/backend/agents/orchestrator.py"
    log "✅ Module 3b: orchestrator.py → pre-baked"
else
    warn "Module 3b orchestrator.py solution not found"
fi

# Module 4 — AgentCore Services (memory, gateway, policy)
for svc in agentcore_memory agentcore_gateway agentcore_policy; do
    if [ -f "$REPO_PATH/solutions/module4/services/${svc}.py" ]; then
        cp "$REPO_PATH/solutions/module4/services/${svc}.py" \
           "$REPO_PATH/blaize-bazaar/backend/services/${svc}.py"
        log "✅ Module 4: ${svc}.py → pre-baked"
    else
        warn "Module 4 ${svc}.py solution not found"
    fi
done

# Module 5 — Code Interpreter (optional advanced feature)
if [ -f "$REPO_PATH/solutions/module5/services/code_interpreter.py" ]; then
    cp "$REPO_PATH/solutions/module5/services/code_interpreter.py" \
       "$REPO_PATH/blaize-bazaar/backend/services/code_interpreter.py"
    log "✅ Module 5: code_interpreter.py → pre-baked"
else
    warn "Module 5 code_interpreter.py solution not found"
fi

# Fix ownership
chown -R "$CODE_EDITOR_USER:$CODE_EDITOR_USER" "$REPO_PATH/blaize-bazaar/backend/"
log "✅ File ownership corrected"

# =============================================================================
# STEP 2: UPDATE WELCOME MESSAGE FOR BUILDER'S SESSION
# =============================================================================
header "Step 2: Updating welcome message"

cat > "$HOME_FOLDER/scripts/welcome.sh" << 'WELCOME_EOF'
#!/bin/bash
clear
cat << 'EOF'
╔═══════════════════════════════════════════════════════════════════╗
║                  DAT4XX Builder's Session                         ║
║     🚀 Build Agentic AI-Powered Search with Aurora PostgreSQL     ║
║              AWS Global Summit — Washington DC 2026               ║
╚═══════════════════════════════════════════════════════════════════╝

✅ Your environment is ready. Backend and frontend are running.

📋 Two Challenges (50 minutes):
   Challenge 1 → Semantic Search (hybrid_search.py + business_logic.py)
   Challenge 2 → Agent Tool      (agent_tools.py)

📁 Files You'll Edit:
   blaize-bazaar/backend/services/hybrid_search.py    ← Challenge 1A
   blaize-bazaar/backend/services/business_logic.py   ← Challenge 1B
   blaize-bazaar/backend/services/agent_tools.py      ← Challenge 2

🔧 After editing, restart the backend:
   Press Ctrl+C, then: source blaize-bazaar/START_BACKEND.sh

🆘 Stuck? Copy solutions:
   cp solutions/module2/services/hybrid_search.py blaize-bazaar/backend/services/
   cp solutions/module2/services/business_logic.py blaize-bazaar/backend/services/
   cp solutions/module3a/services/agent_tools.py blaize-bazaar/backend/services/

═══════════════════════════════════════════════════════════════════

EOF

# Auto-open the first challenge file
code /workshop/sample-blaize-bazaar-agentic-search-apg/blaize-bazaar/backend/services/hybrid_search.py 2>/dev/null || true

exit 0
WELCOME_EOF

chmod +x "$HOME_FOLDER/scripts/welcome.sh"
chown "$CODE_EDITOR_USER:$CODE_EDITOR_USER" "$HOME_FOLDER/scripts/welcome.sh"
log "✅ Welcome message updated for builder's session"

# =============================================================================
# STEP 3: PRE-WARM BACKEND AND FRONTEND
# =============================================================================
header "Step 3: Pre-warming backend and frontend"

# Source environment
if [ -f "$REPO_PATH/.env" ]; then
    set -a
    source "$REPO_PATH/.env"
    set +a
fi

# Start backend in background
log "Starting backend..."
sudo -u "$CODE_EDITOR_USER" bash -c "
    export PATH=\"\$HOME/.local/bin:\$PATH\"
    [ -f '$REPO_PATH/.env' ] && export \$(grep -v '^#' '$REPO_PATH/.env' | xargs)
    cd '$REPO_PATH/blaize-bazaar/backend'
    nohup python3.13 -m uvicorn app:app --host 0.0.0.0 --port 8000 > /var/log/blaize-backend.log 2>&1 &
"
log "⏳ Backend starting on port 8000..."

# Build and start frontend in background
log "Building and starting frontend..."
sudo -u "$CODE_EDITOR_USER" bash -c "
    cd '$REPO_PATH/blaize-bazaar/frontend'
    [ ! -d 'node_modules' ] && npm install 2>/dev/null
    NODE_ENV=production npm run build 2>/dev/null
    nohup npx -y serve -s dist -l 5173 > /var/log/blaize-frontend.log 2>&1 &
"
log "⏳ Frontend building and starting on port 5173..."

# Wait for backend to be ready
MAX_WAIT=60
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/api/health 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        log "✅ Backend is healthy (HTTP 200)"
        break
    fi
    WAITED=$((WAITED + 2))
    sleep 2
done

if [ $WAITED -ge $MAX_WAIT ]; then
    warn "Backend did not respond within ${MAX_WAIT}s — check /var/log/blaize-backend.log"
fi

# Wait for frontend
sleep 5
FE_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5173/ 2>/dev/null || echo "000")
if [ "$FE_CODE" = "200" ]; then
    log "✅ Frontend is serving (HTTP 200)"
else
    warn "Frontend returned HTTP $FE_CODE — may still be building"
fi

# =============================================================================
# STEP 4: WARM THE EMBEDDING MODEL (first call is slow)
# =============================================================================
header "Step 4: Warming Bedrock embedding model"

sudo -u "$CODE_EDITOR_USER" bash -c "
    export PATH=\"\$HOME/.local/bin:\$PATH\"
    [ -f '$REPO_PATH/.env' ] && export \$(grep -v '^#' '$REPO_PATH/.env' | xargs)
    cd '$REPO_PATH/blaize-bazaar/backend'
    python3.13 -c '
from services.embeddings import EmbeddingService
try:
    svc = EmbeddingService()
    result = svc.embed_query(\"warm up query for semantic search\")
    print(f\"✅ Embedding model warm — vector dim: {len(result)}\")
except Exception as e:
    print(f\"⚠️  Embedding warmup failed: {e}\")
' 2>/dev/null
"

# =============================================================================
# SUMMARY
# =============================================================================
header "Builder's Session Setup Complete"

echo ""
echo "  ✅ Module 3b/4/5 solutions pre-baked (orchestrator + AgentCore working)"
echo "  ✅ Welcome message updated for builder's session format"
echo "  ✅ Backend running on port 8000"
echo "  ✅ Frontend running on port 5173"
echo "  ✅ Bedrock embedding model warmed"
echo ""
echo "  Participants will complete:"
echo "    Challenge 1 → hybrid_search.py + business_logic.py (semantic search)"
echo "    Challenge 2 → agent_tools.py (get_trending_products)"
echo ""
echo "  Logs:"
echo "    Backend:  /var/log/blaize-backend.log"
echo "    Frontend: /var/log/blaize-frontend.log"
echo ""

exit 0
