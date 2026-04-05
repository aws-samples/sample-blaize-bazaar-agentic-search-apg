#!/bin/bash
# Blaize Bazaar Builder's Session - Stage 2: Labs Bootstrap
# Runs the full workshop bootstrap, then pre-completes challenges 3-9
# by copying solution files into the application.
#
# Challenges 1-2 remain as TODO stubs for participants to implement.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_PATH="${HOME_FOLDER:-/workshop}/sample-blaize-bazaar-agentic-search-apg"
CODE_EDITOR_USER="${CODE_EDITOR_USER:-participant}"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
log() { echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"; }
header() { echo -e "\n${CYAN}═══════════════════════════════════════════════════${NC}"; echo -e "${CYAN}  $1${NC}"; echo -e "${CYAN}═══════════════════════════════════════════════════${NC}\n"; }

# ============================================================================
# STEP 1: Run the full workshop bootstrap
# ============================================================================
header "Builder's Session Bootstrap — Running workshop bootstrap first"

bash "$SCRIPT_DIR/bootstrap-labs.sh"

# ============================================================================
# STEP 2: Pre-complete challenges 3-9 with solution files
# ============================================================================
header "Pre-completing challenges 3-9 for Builder's Session"

log "Copying Module 2 solutions (Challenges 3-4: Agent + Orchestrator)..."

# Challenge 3: Recommendation Agent
cp "$REPO_PATH/solutions/module2/agents/recommendation_agent.py" \
   "$REPO_PATH/blaize-bazaar/backend/agents/recommendation_agent.py" && \
   log "  ✅ Challenge 3: recommendation_agent.py" || log "  ⚠️  Challenge 3 copy failed"

# Challenge 4: Orchestrator
cp "$REPO_PATH/solutions/module2/agents/orchestrator.py" \
   "$REPO_PATH/blaize-bazaar/backend/agents/orchestrator.py" && \
   log "  ✅ Challenge 4: orchestrator.py" || log "  ⚠️  Challenge 4 copy failed"

log "Copying Module 3 solutions (Challenges 5-9: Production Patterns)..."

# Challenge 5: AgentCore Runtime
if [ -f "$REPO_PATH/solutions/module3/services/agentcore_runtime.py" ]; then
    cp "$REPO_PATH/solutions/module3/services/agentcore_runtime.py" \
       "$REPO_PATH/blaize-bazaar/backend/agentcore_runtime.py" && \
       log "  ✅ Challenge 5: agentcore_runtime.py" || log "  ⚠️  Challenge 5 copy failed"
fi

# Challenge 6: AgentCore Memory
cp "$REPO_PATH/solutions/module3/services/agentcore_memory.py" \
   "$REPO_PATH/blaize-bazaar/backend/services/agentcore_memory.py" && \
   log "  ✅ Challenge 6: agentcore_memory.py" || log "  ⚠️  Challenge 6 copy failed"

# Challenge 7: AgentCore Gateway
cp "$REPO_PATH/solutions/module3/services/agentcore_gateway.py" \
   "$REPO_PATH/blaize-bazaar/backend/services/agentcore_gateway.py" && \
   log "  ✅ Challenge 7: agentcore_gateway.py" || log "  ⚠️  Challenge 7 copy failed"

# Challenge 8: Observability
if [ -f "$REPO_PATH/solutions/module3/services/otel_trace_extractor.py" ]; then
    cp "$REPO_PATH/solutions/module3/services/otel_trace_extractor.py" \
       "$REPO_PATH/blaize-bazaar/backend/services/otel_trace_extractor.py" && \
       log "  ✅ Challenge 8: otel_trace_extractor.py" || log "  ⚠️  Challenge 8 copy failed"
fi

# Challenge 9: Agent Identity
if [ -f "$REPO_PATH/solutions/module3/frontend/agentIdentity.ts" ]; then
    cp "$REPO_PATH/solutions/module3/frontend/agentIdentity.ts" \
       "$REPO_PATH/blaize-bazaar/frontend/src/utils/agentIdentity.ts" && \
       log "  ✅ Challenge 9: agentIdentity.ts" || log "  ⚠️  Challenge 9 copy failed"
fi

# Fix ownership
chown -R "$CODE_EDITOR_USER:$CODE_EDITOR_USER" "$REPO_PATH/blaize-bazaar/"

# ============================================================================
# STEP 3: Restart services to pick up solution code
# ============================================================================
log "Restarting services with pre-completed code..."
systemctl restart blaize-backend 2>/dev/null || true
sleep 3
systemctl restart blaize-frontend 2>/dev/null || true

# ============================================================================
# SUMMARY
# ============================================================================
header "Builder's Session Bootstrap Complete"

echo ""
echo "  ✅ Full workshop bootstrap complete"
echo "  ✅ Challenges 3-9 pre-completed with solution code"
echo "  ✅ Services restarted"
echo ""
echo "  Participants implement:"
echo "    Challenge 1 → services/hybrid_search.py (_vector_search)"
echo "    Challenge 2 → services/agent_tools.py (get_trending_products)"
echo ""
echo "  Challenges 3-9 are pre-wired — participants test and read."
echo ""

exit 0
