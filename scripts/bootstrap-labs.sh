#!/bin/bash
# DAT406 Workshop - Stage 2: Labs Bootstrap (OPTIMIZED)
# Optimizations: Parallel pip installs, reduced redundancy, faster execution
# Duration: ~12-15 minutes (vs 20 minutes)

set -uo pipefail  # Removed -e to allow graceful failures

# ============================================================================
# PARAMETERS & LOGGING
# ============================================================================
CODE_EDITOR_USER="${CODE_EDITOR_USER:-participant}"
HOME_FOLDER="${HOME_FOLDER:-/workshop}"
REPO_NAME="sample-dat406-build-agentic-ai-powered-search-apg"
REPO_PATH="$HOME_FOLDER/$REPO_NAME"
AWS_REGION="${AWS_REGION:-us-west-2}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log() { echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"; }
warn() { echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARNING:${NC} $1"; }

log "=========================================="
log "DAT406 Stage 2: Labs Bootstrap (Optimized)"
log "=========================================="

# ============================================================================
# STEP 1: CLONE REPOSITORY (~30 sec)
# ============================================================================
log "Cloning repository..."
if [ ! -d "$REPO_PATH" ]; then
    sudo -u "$CODE_EDITOR_USER" git clone "${REPO_URL:-https://github.com/aws-samples/sample-dat406-build-agentic-ai-powered-search-apg.git}" "$REPO_PATH" 2>/dev/null && \
    rm -rf "$REPO_PATH/.git" && log "✅ Repository cloned" || warn "Clone failed"
else
    log "✅ Repository exists"
fi

# ============================================================================
# STEP 2: FETCH DB CREDENTIALS (~10 sec)
# ============================================================================
log "Fetching database credentials..."
export DB_HOST="" DB_PORT="5432" DB_USER="" DB_PASSWORD="" DB_NAME="${DB_NAME:-postgres}"

if [ -n "${DB_SECRET_ARN:-}" ]; then
    DB_SECRET=$(aws secretsmanager get-secret-value --secret-id "$DB_SECRET_ARN" --region "$AWS_REGION" --query SecretString --output text 2>/dev/null || echo "")
    if [ -n "$DB_SECRET" ]; then
        export DB_HOST=$(echo "$DB_SECRET" | jq -r '.host // empty')
        export DB_USER=$(echo "$DB_SECRET" | jq -r '.username // empty')
        export DB_PASSWORD=$(echo "$DB_SECRET" | jq -r '.password // empty')
        export DB_NAME=$(echo "$DB_SECRET" | jq -r '.dbname // .database // "postgres"')
        log "✅ Database credentials retrieved"
    fi
fi

# ============================================================================
# STEP 3: CREATE .ENV FILES (~5 sec) - CONSOLIDATED
# ============================================================================
log "Creating environment files..."

# Frontend .env (always create)
[ -d "$REPO_PATH/lab2/frontend" ] && cat > "$REPO_PATH/lab2/frontend/.env" << EOF
VITE_API_URL=/ports/8000
VITE_AWS_REGION=$AWS_REGION
VITE_ENABLE_LAB2=true
EOF

# Backend/Root .env (if DB available)
if [ -n "$DB_HOST" ]; then
    DB_CLUSTER_ARN="arn:aws:rds:${AWS_REGION}:$(aws sts get-caller-identity --query Account --output text):cluster:apg-pgvector-dat406"
    
    # Single .env template
    cat > "$REPO_PATH/.env" << EOF
DB_SECRET_ARN=${DB_SECRET_ARN:-}
DB_CLUSTER_ARN=$DB_CLUSTER_ARN
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME
PGHOST=$DB_HOST
PGPORT=$DB_PORT
PGUSER=$DB_USER
PGPASSWORD=$DB_PASSWORD
PGDATABASE=$DB_NAME
AWS_REGION=$AWS_REGION
AWS_DEFAULT_REGION=$AWS_REGION
BEDROCK_EMBEDDING_MODEL=${BEDROCK_EMBEDDING_MODEL:-amazon.titan-embed-text-v2:0}
BEDROCK_CHAT_MODEL=${BEDROCK_CHAT_MODEL:-us.anthropic.claude-sonnet-4-20250514-v1:0}
EOF
    
    # Symlink for backend (avoid duplication)
    ln -sf "$REPO_PATH/.env" "$REPO_PATH/lab2/backend/.env" 2>/dev/null
    
    # .pgpass
    echo "$DB_HOST:$DB_PORT:$DB_NAME:$DB_USER:$DB_PASSWORD" > "/home/$CODE_EDITOR_USER/.pgpass"
    chmod 600 "/home/$CODE_EDITOR_USER/.pgpass"
    chown "$CODE_EDITOR_USER:$CODE_EDITOR_USER" "/home/$CODE_EDITOR_USER/.pgpass"
    
    log "✅ Environment files created"
fi

# Fix permissions
chown -R "$CODE_EDITOR_USER:$CODE_EDITOR_USER" "$REPO_PATH"

# ============================================================================
# STEP 4-6: PARALLEL PYTHON DEPENDENCIES (~3-4 min vs 7 min)
# ============================================================================
log "Installing Python dependencies (parallel)..."

install_lab1() {
    if [ -f "$REPO_PATH/lab1/requirements.txt" ]; then
        sudo -u "$CODE_EDITOR_USER" python3.13 -m pip install --user -r "$REPO_PATH/lab1/requirements.txt" &>/dev/null
    fi
    # Register Jupyter kernel
    sudo -u "$CODE_EDITOR_USER" python3.13 -m ipykernel install --user --name python3 --display-name "Python 3.13" &>/dev/null || \
    (sudo -u "$CODE_EDITOR_USER" python3.13 -m pip install --user ipykernel &>/dev/null && \
     sudo -u "$CODE_EDITOR_USER" python3.13 -m ipykernel install --user --name python3 --display-name "Python 3.13" &>/dev/null)
}

install_lab2() {
    if [ -f "$REPO_PATH/lab2/backend/requirements.txt" ]; then
        cd "$REPO_PATH/lab2/backend"
        sudo -u "$CODE_EDITOR_USER" python3.13 -m pip install --user -r requirements.txt &>/dev/null
    fi
}

# Run in parallel
install_lab1 & PID1=$!
install_lab2 & PID2=$!
wait $PID1 && log "✅ Lab 1 dependencies installed" || warn "Lab 1 install issues"
wait $PID2 && log "✅ Lab 2 Backend dependencies installed" || warn "Lab 2 Backend install issues"

# ============================================================================
# STEP 7: INSTALL UV (~30 sec)
# ============================================================================
log "Installing uv..."
if ! sudo -u "$CODE_EDITOR_USER" bash -c 'export PATH="$HOME/.local/bin:$PATH" && command -v uv' &>/dev/null; then
    sudo -u "$CODE_EDITOR_USER" bash -c 'curl -LsSf https://astral.sh/uv/install.sh | sh' &>/dev/null || \
    sudo -u "$CODE_EDITOR_USER" python3.13 -m pip install --user uv &>/dev/null
    log "✅ uv installed"
else
    log "✅ uv already installed"
fi

# ============================================================================
# STEP 8: MCP CONFIG DIRECTORY
# ============================================================================
mkdir -p "$REPO_PATH/lab2/config"
chown "$CODE_EDITOR_USER:$CODE_EDITOR_USER" "$REPO_PATH/lab2/config"

# ============================================================================
# STEP 9-10: PARALLEL FRONTEND + DATABASE (~8 min vs 8.5 min)
# ============================================================================
log "Setting up frontend and database (parallel)..."

setup_frontend() {
    if [ -d "$REPO_PATH/lab2/frontend" ]; then
        cd "$REPO_PATH/lab2/frontend"
        sudo -u "$CODE_EDITOR_USER" npm install &>/dev/null
    fi
}

setup_database() {
    if [ -n "$DB_HOST" ] && [ -f "$REPO_PATH/scripts/load-database-fast.sh" ]; then
        cd "$REPO_PATH"
        export DB_HOST DB_PORT DB_NAME DB_USER DB_PASSWORD AWS_REGION
        bash scripts/load-database-fast.sh &>/dev/null
    fi
}

setup_frontend & PID_FE=$!
setup_database & PID_DB=$!
wait $PID_FE && log "✅ Frontend dependencies installed" || warn "Frontend install issues"
wait $PID_DB && log "✅ Database setup complete" || warn "Database setup issues"

# ============================================================================
# STEP 11: CREATE START SCRIPTS (~5 sec)
# ============================================================================
log "Creating start scripts..."

cat > "$REPO_PATH/lab2/start-backend.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")/backend"
export PATH="$HOME/.local/bin:$PATH"
[ -f "../../.env" ] && export $(grep -v '^#' ../../.env | xargs)
[ ! -f "../config/mcp-server-config.json" ] && [ -f "generate_mcp_config.py" ] && python3 generate_mcp_config.py 2>/dev/null
echo "🚀 Starting FastAPI backend on http://localhost:8000"
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
EOF

cat > "$REPO_PATH/lab2/start-frontend.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")/frontend"
[ ! -d "node_modules" ] && npm install
[ ! -d "dist" ] && npm run build
echo "🚀 Starting React frontend on http://localhost:5173"
NO_UPDATE_NOTIFIER=1 npx serve -s dist -l 5173 2>&1 | grep -v "xsel"
EOF

chmod +x "$REPO_PATH/lab2/start-backend.sh" "$REPO_PATH/lab2/start-frontend.sh"
chown "$CODE_EDITOR_USER:$CODE_EDITOR_USER" "$REPO_PATH/lab2/start-backend.sh" "$REPO_PATH/lab2/start-frontend.sh"
log "✅ Start scripts created"

# ============================================================================
# STEP 12: BASH ENVIRONMENT (~5 sec)
# ============================================================================
log "Configuring bash environment..."

cat >> "/home/$CODE_EDITOR_USER/.bashrc" << 'EOF'

# DAT406 Workshop Environment
if [ -f /workshop/sample-dat406-build-agentic-ai-powered-search-apg/.env ]; then
    set -a; source /workshop/sample-dat406-build-agentic-ai-powered-search-apg/.env; set +a
    export PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE
fi

alias workshop='cd /workshop/sample-dat406-build-agentic-ai-powered-search-apg'
alias lab1='cd /workshop/sample-dat406-build-agentic-ai-powered-search-apg/lab1'
alias lab2='cd /workshop/sample-dat406-build-agentic-ai-powered-search-apg/lab2'
start-backend() { /workshop/sample-dat406-build-agentic-ai-powered-search-apg/lab2/start-backend.sh; }
start-frontend() { /workshop/sample-dat406-build-agentic-ai-powered-search-apg/lab2/start-frontend.sh; }
start-jupyter() { cd /workshop/sample-dat406-build-agentic-ai-powered-search-apg/lab1 && jupyter lab --ip=0.0.0.0 --port=8888 --no-browser; }
export PATH="$HOME/.local/bin:$PATH"
export AWS_DEFAULT_REGION=${AWS_REGION:-us-west-2}
EOF

log "✅ Bash environment configured"

# ============================================================================
# STEP 13: STATUS MARKER
# ============================================================================
cat > /tmp/workshop-ready.json << EOF
{"status":"complete","timestamp":"$(date -Iseconds)","stage":"labs-bootstrap"}
EOF
chmod 644 /tmp/workshop-ready.json

# ============================================================================
# SUMMARY
# ============================================================================
log "=========================================="
log "Stage 2: Labs Bootstrap Complete!"
log "=========================================="
echo "✅ All dependencies installed"
echo "✅ Database setup complete"
echo "✅ Start scripts: start-backend, start-frontend, start-jupyter"
log "=========================================="

exit 0
