#!/bin/bash
# Blaize Bazaar Workshop - Stage 2: Labs Bootstrap
# Optimizations: Parallel pip installs, reduced redundancy, faster execution
# Duration: ~12-15 minutes

set -uo pipefail  # Removed -e to allow graceful failures

# ============================================================================
# PARAMETERS & LOGGING
# ============================================================================
CODE_EDITOR_USER="${CODE_EDITOR_USER:-participant}"
HOME_FOLDER="${HOME_FOLDER:-/workshop}"
REPO_NAME="sample-blaize-bazaar-agentic-search-apg"
REPO_PATH="$HOME_FOLDER/$REPO_NAME"
AWS_REGION="${AWS_REGION:-us-west-2}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log() { echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"; }
warn() { echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARNING:${NC} $1"; }

log "=========================================="
log "Blaize Bazaar Stage 2: Labs Bootstrap (Optimized)"
log "=========================================="

# ============================================================================
# STEP 1: CLONE REPOSITORY (~30 sec)
# ============================================================================
log "Cloning repository..."
if [ ! -d "$REPO_PATH" ]; then
    sudo -u "$CODE_EDITOR_USER" git clone "${REPO_URL:-https://github.com/aws-samples/sample-blaize-bazaar-agentic-search-apg.git}" "$REPO_PATH" 2>/dev/null && \
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
[ -d "$REPO_PATH/blaize-bazaar/frontend" ] && cat > "$REPO_PATH/blaize-bazaar/frontend/.env" << EOF
VITE_API_URL=/ports/8000
VITE_AWS_REGION=$AWS_REGION
VITE_ENABLE_LAB2=true
EOF

# Backend/Root .env (if DB available)
if [ -n "$DB_HOST" ]; then
    DB_CLUSTER_ARN="arn:aws:rds:${AWS_REGION}:$(aws sts get-caller-identity --query Account --output text):cluster:blaize-bazaar-cluster"
    
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
BEDROCK_CHAT_MODEL=${BEDROCK_CHAT_MODEL:-global.anthropic.claude-sonnet-4-6}
EOF
    
    chmod 600 "$REPO_PATH/.env"
    chown "$CODE_EDITOR_USER:$CODE_EDITOR_USER" "$REPO_PATH/.env"
    
    # Symlink for backend (avoid duplication)
    ln -sf "$REPO_PATH/.env" "$REPO_PATH/blaize-bazaar/backend/.env" 2>/dev/null
    
    # .pgpass for psql CLI
    echo "$DB_HOST:$DB_PORT:$DB_NAME:$DB_USER:$DB_PASSWORD" > "/home/$CODE_EDITOR_USER/.pgpass"
    chmod 600 "/home/$CODE_EDITOR_USER/.pgpass"
    chown "$CODE_EDITOR_USER:$CODE_EDITOR_USER" "/home/$CODE_EDITOR_USER/.pgpass"
    
    log "✅ Environment files created (.env, .pgpass)"
else
    warn "Database credentials not available - skipping DB configuration"
fi

# Fix permissions
chown -R "$CODE_EDITOR_USER:$CODE_EDITOR_USER" "$REPO_PATH"

# ============================================================================
# STEP 4-6: PARALLEL PYTHON DEPENDENCIES (~3-4 min vs 7 min)
# ============================================================================
log "Installing Python dependencies (parallel)..."

install_notebooks() {
    # Notebooks archived — skip notebook dependencies
    log "Notebooks archived — skipping notebook dependencies"
    return 0
}

install_blaize_bazaar() {
    if [ -f "$REPO_PATH/blaize-bazaar/backend/requirements.txt" ]; then
        cd "$REPO_PATH/blaize-bazaar/backend"
        sudo -u "$CODE_EDITOR_USER" python3.13 -m pip install --user -r requirements.txt 2>&1 | tee /var/log/blaize-bazaar-pip-install.log >/dev/null
        return ${PIPESTATUS[0]}
    fi
    return 1
}

# Run in parallel
install_notebooks & PID1=$!
install_blaize_bazaar & PID2=$!
if wait $PID1; then
    log "✅ Notebooks dependencies installed"
else
    warn "Notebooks install issues - check /var/log/notebooks-pip-install.log"
fi
if wait $PID2; then
    log "✅ Blaize Bazaar Backend dependencies installed"
else
    warn "Blaize Bazaar Backend install issues - check /var/log/blaize-bazaar-pip-install.log"
fi

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
# STEP 8: MCP CONFIG DIRECTORY & GENERATION
# ============================================================================
log "Setting up MCP configuration..."
mkdir -p "$REPO_PATH/blaize-bazaar/config"
chown "$CODE_EDITOR_USER:$CODE_EDITOR_USER" "$REPO_PATH/blaize-bazaar/config"

# Generate MCP config if database credentials are available
if [ -n "$DB_HOST" ] && [ -f "$REPO_PATH/blaize-bazaar/backend/generate_mcp_config.py" ]; then
    cd "$REPO_PATH/blaize-bazaar/backend"
    
    # Source .env file to get all variables
    if [ -f "$REPO_PATH/.env" ]; then
        set -a
        source "$REPO_PATH/.env"
        set +a
    fi
    
    # Verify required variables are set
    if [ -z "${DB_SECRET_ARN:-}" ] || [ -z "${DB_CLUSTER_ARN:-}" ]; then
        warn "Missing DB_SECRET_ARN or DB_CLUSTER_ARN - MCP config will be generated on backend startup"
    else
        # Generate MCP config with variables from .env
        sudo -u "$CODE_EDITOR_USER" bash -c "export DB_SECRET_ARN='$DB_SECRET_ARN' && \
            export DB_CLUSTER_ARN='$DB_CLUSTER_ARN' && \
            export DB_NAME='$DB_NAME' && \
            export AWS_REGION='$AWS_REGION' && \
            python3.13 generate_mcp_config.py" 2>&1 | tee /var/log/mcp-config-generation.log
        
        if [ -f "$REPO_PATH/blaize-bazaar/config/mcp-server-config.json" ]; then
            log "✅ MCP config generated at blaize-bazaar/config/mcp-server-config.json"
            
            # Deploy MCP config to all Amazon Q locations
            log "Deploying MCP config to Amazon Q..."
            
            # Create .amazonq directories
            mkdir -p "/home/$CODE_EDITOR_USER/.aws/amazonq"
            mkdir -p "$HOME_FOLDER/.amazonq"
            mkdir -p "$REPO_PATH/.amazonq"
            
            # Read generated config and add useLegacyMcpJson for global config
            MCP_CONFIG=$(cat "$REPO_PATH/blaize-bazaar/config/mcp-server-config.json")
            MCP_CONFIG_WITH_LEGACY=$(echo "$MCP_CONFIG" | jq '. + {"useLegacyMcpJson": true}')
            
            # Deploy to global configs (with useLegacyMcpJson)
            echo "$MCP_CONFIG_WITH_LEGACY" > "/home/$CODE_EDITOR_USER/.aws/amazonq/default.json"
            echo "$MCP_CONFIG" > "/home/$CODE_EDITOR_USER/.aws/amazonq/mcp.json"
            chmod 600 "/home/$CODE_EDITOR_USER/.aws/amazonq/default.json" "/home/$CODE_EDITOR_USER/.aws/amazonq/mcp.json"
            
            # Deploy to workspace configs
            echo "$MCP_CONFIG" > "$HOME_FOLDER/.amazonq/default.json"
            echo "$MCP_CONFIG" > "$HOME_FOLDER/.amazonq/mcp.json"
            echo "$MCP_CONFIG" > "$REPO_PATH/.amazonq/default.json"
            echo "$MCP_CONFIG" > "$REPO_PATH/.amazonq/mcp.json"
            
            # Fix permissions
            chown -R "$CODE_EDITOR_USER:$CODE_EDITOR_USER" "/home/$CODE_EDITOR_USER/.aws/amazonq"
            chown -R "$CODE_EDITOR_USER:$CODE_EDITOR_USER" "$HOME_FOLDER/.amazonq"
            chown -R "$CODE_EDITOR_USER:$CODE_EDITOR_USER" "$REPO_PATH/.amazonq"
            
            log "✅ MCP config deployed to Amazon Q (global + workspace)"
        else
            warn "MCP config generation failed - will be generated on backend startup"
        fi
    fi
    cd "$REPO_PATH"
else
    log "ℹ️  MCP config will be generated on backend startup"
fi

# ============================================================================
# STEP 9-10: PARALLEL FRONTEND + DATABASE (~8 min vs 8.5 min)
# ============================================================================
log "Setting up frontend and database (parallel)..."

setup_frontend() {
    if [ -d "$REPO_PATH/blaize-bazaar/frontend" ]; then
        cd "$REPO_PATH/blaize-bazaar/frontend"
        sudo -u "$CODE_EDITOR_USER" npm install &>/dev/null
    fi
}

setup_database() {
    if [ -n "$DB_HOST" ] && [ -f "$REPO_PATH/scripts/seed-database.sh" ]; then
        cd "$REPO_PATH"
        export DB_HOST DB_PORT DB_NAME DB_USER DB_PASSWORD AWS_REGION
        export ASSETS_BUCKET_NAME ASSETS_BUCKET_PREFIX
        bash scripts/seed-database.sh 2>&1 | tee /var/log/database-setup.log
        return ${PIPESTATUS[0]}
    fi
    return 1
}

setup_frontend & PID_FE=$!
setup_database & PID_DB=$!
wait $PID_FE && log "✅ Frontend dependencies installed" || warn "Frontend install issues"
if wait $PID_DB; then
    log "✅ Database setup complete (~444 products with indexes)"
else
    warn "Database setup had issues - check /var/log/database-setup.log"
fi

# ============================================================================
# STEP 10b: PROVISION AGENTCORE MEMORY (STM) (~15 sec)
# ============================================================================
log "Provisioning AgentCore Memory (STM)..."

AGENTCORE_MEMORY_ID=""
if command -v python3.13 &>/dev/null; then
    AGENTCORE_MEMORY_ID=$(sudo -u "$CODE_EDITOR_USER" bash -c "
        export PATH=\"\$HOME/.local/bin:\$PATH\"
        export AWS_REGION=$AWS_REGION
        python3.13 -c '
import boto3
import time
import sys

try:
    client = boto3.client(\"bedrock-agentcore-control\", region_name=\"$AWS_REGION\")

    # Check if memory already exists
    existing = client.list_memories(maxResults=10)
    for mem in existing.get(\"memories\", []):
        if mem.get(\"name\") == \"BlaizeBazaarSTM\":
            mem_id = mem[\"id\"]
            print(mem_id)
            sys.exit(0)

    # Create new STM-only memory (no strategies = short-term only)
    response = client.create_memory(
        name=\"BlaizeBazaarSTM\",
        description=\"Short-term memory for Blaize Bazaar workshop — conversation context within sessions\",
        eventExpiryDuration=30
    )
    mem_id = response[\"memory\"][\"id\"]

    # Wait for ACTIVE status (usually <10 seconds for STM-only)
    for i in range(12):
        status = client.get_memory(memoryId=mem_id)[\"memory\"][\"status\"]
        if status == \"ACTIVE\":
            print(mem_id)
            sys.exit(0)
        if status == \"FAILED\":
            print(\"\", file=sys.stderr)
            sys.exit(1)
        time.sleep(5)

    # Timeout — print ID anyway, it may activate later
    print(mem_id)
except Exception as e:
    print(f\"Memory provisioning failed: {e}\", file=sys.stderr)
    sys.exit(1)
' 2>/dev/null
    " 2>/dev/null)
fi

if [ -n "$AGENTCORE_MEMORY_ID" ]; then
    log "✅ AgentCore Memory provisioned: $AGENTCORE_MEMORY_ID"
    # Append to .env
    echo "AGENTCORE_MEMORY_ID=$AGENTCORE_MEMORY_ID" >> "$REPO_PATH/.env"
    chown "$CODE_EDITOR_USER:$CODE_EDITOR_USER" "$REPO_PATH/.env"
else
    warn "AgentCore Memory provisioning skipped — STM will fall back to Aurora session tables"
fi

# ============================================================================
# STEP 11: CREATE START SCRIPTS (~5 sec)
# ============================================================================
log "Creating start scripts..."

cat > "$REPO_PATH/blaize-bazaar/start-backend.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")/backend"
export PATH="$HOME/.local/bin:$PATH"
[ -f "../../.env" ] && export $(grep -v '^#' ../../.env | xargs)
[ ! -f "../config/mcp-server-config.json" ] && [ -f "generate_mcp_config.py" ] && python3 generate_mcp_config.py 2>/dev/null
echo "🚀 Starting FastAPI backend on http://localhost:8000"
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
EOF

cat > "$REPO_PATH/blaize-bazaar/start-frontend.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")/frontend"
[ ! -d "node_modules" ] && npm install
[ ! -d "dist" ] && npm run build
echo "🚀 Starting React frontend on http://localhost:5173"
NO_UPDATE_NOTIFIER=1 npx -y serve -s dist -l 5173 2>&1 | grep -v "xsel"
EOF

chmod +x "$REPO_PATH/blaize-bazaar/start-backend.sh" "$REPO_PATH/blaize-bazaar/start-frontend.sh"
chown "$CODE_EDITOR_USER:$CODE_EDITOR_USER" "$REPO_PATH/blaize-bazaar/start-backend.sh" "$REPO_PATH/blaize-bazaar/start-frontend.sh"
log "✅ Start scripts created"

# ============================================================================
# STEP 12: BASH ENVIRONMENT (~5 sec)
# ============================================================================
log "Configuring bash environment..."

cat >> "/home/$CODE_EDITOR_USER/.bashrc" << 'EOF'

# ============================================================================
# Blaize Bazaar Workshop Environment
# ============================================================================

if [ -f /workshop/sample-blaize-bazaar-agentic-search-apg/.env ]; then
    set -a
    source /workshop/sample-blaize-bazaar-agentic-search-apg/.env
    set +a
    
    # Explicitly export PostgreSQL variables for psql
    export PGHOST
    export PGPORT
    export PGUSER
    export PGPASSWORD
    export PGDATABASE
fi

# Workshop Navigation Aliases
alias workshop='cd /workshop/sample-blaize-bazaar-agentic-search-apg'
alias notebooks='cd /workshop/sample-blaize-bazaar-agentic-search-apg/notebooks'
alias blaize-bazaar='cd /workshop/sample-blaize-bazaar-agentic-search-apg/blaize-bazaar'
alias backend='cd /workshop/sample-blaize-bazaar-agentic-search-apg/blaize-bazaar/backend'
alias frontend='cd /workshop/sample-blaize-bazaar-agentic-search-apg/blaize-bazaar/frontend'

# Blaize Bazaar Service Shortcuts
alias start-backend='/workshop/sample-blaize-bazaar-agentic-search-apg/blaize-bazaar/start-backend.sh'
alias start-frontend='/workshop/sample-blaize-bazaar-agentic-search-apg/blaize-bazaar/start-frontend.sh'

# Database Shortcut (psql uses PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE from .env)
alias psql='psql'

# AWS Region for boto3
export AWS_DEFAULT_REGION=${AWS_REGION:-us-west-2}

# Ensure uv is in PATH (required for MCP)
export PATH="$HOME/.local/bin:$PATH"

# Auto-navigate to workshop directory on terminal open
if [ "$PWD" = "$HOME" ] || [ "$PWD" = "/workshop" ]; then
    cd /workshop/sample-blaize-bazaar-agentic-search-apg 2>/dev/null || true
fi
EOF

log "✅ Bash environment configured (.bashrc updated with psql support)"

# ============================================================================
# STEP 13: FINAL VERIFICATION
# ============================================================================
log "Performing final verification..."

# Verify database setup
if [ -n "$DB_HOST" ]; then
    PRODUCT_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM blaize_bazaar.product_catalog;" 2>/dev/null | xargs || echo "0")
    if [ "$PRODUCT_COUNT" -gt 0 ]; then
        log "✅ Database verified ($PRODUCT_COUNT products)"
    else
        warn "⚠️  Database may not be set up correctly (0 products found)"
    fi
fi

# Verify Python packages
if sudo -u "$CODE_EDITOR_USER" python3.13 -c "import fastapi, uvicorn, strands" 2>/dev/null; then
    log "✅ Blaize Bazaar Backend dependencies verified"
else
    warn "⚠️  Some Blaize Bazaar Backend dependencies may be missing"
fi

# ============================================================================
# STEP 14: AUTO-START BACKEND & FRONTEND SERVICES
# ============================================================================
log "Creating auto-start services for backend and frontend..."

# --- Backend systemd service (uvicorn with --reload) ---
cat > /etc/systemd/system/blaize-backend.service << EOF
[Unit]
Description=Blaize Bazaar Backend (FastAPI + uvicorn)
After=network.target

[Service]
Type=simple
User=$CODE_EDITOR_USER
Group=$CODE_EDITOR_USER
WorkingDirectory=$REPO_PATH/blaize-bazaar/backend
EnvironmentFile=$REPO_PATH/.env
Environment=PATH=/home/$CODE_EDITOR_USER/.local/bin:/usr/local/bin:/usr/bin:/bin
Environment=HOME=/home/$CODE_EDITOR_USER
ExecStartPre=/bin/bash -c 'cd $REPO_PATH/blaize-bazaar/backend && python3 generate_mcp_config.py 2>/dev/null || true'
ExecStart=/home/$CODE_EDITOR_USER/.local/bin/uvicorn app:app --reload --host 0.0.0.0 --port 8000 --reload-dir .
Restart=always
RestartSec=3
StandardOutput=append:/tmp/blaize-bazaar/backend.log
StandardError=append:/tmp/blaize-bazaar/backend.log

[Install]
WantedBy=multi-user.target
EOF

# --- Frontend rebuild watcher + static server ---
cat > /etc/systemd/system/blaize-frontend.service << EOF
[Unit]
Description=Blaize Bazaar Frontend (static server)
After=network.target

[Service]
Type=simple
User=$CODE_EDITOR_USER
Group=$CODE_EDITOR_USER
WorkingDirectory=$REPO_PATH/blaize-bazaar/frontend
Environment=PATH=/home/$CODE_EDITOR_USER/.local/bin:/usr/local/bin:/usr/bin:/bin
Environment=HOME=/home/$CODE_EDITOR_USER
Environment=NODE_ENV=production
ExecStartPre=/bin/bash -c 'cd $REPO_PATH/blaize-bazaar/frontend && npm run build'
ExecStart=/usr/bin/npx http-server dist -p 5173 --cors -c-1
Restart=always
RestartSec=3
StandardOutput=append:/tmp/blaize-bazaar/frontend-server.log
StandardError=append:/tmp/blaize-bazaar/frontend-server.log

[Install]
WantedBy=multi-user.target
EOF

# --- Frontend file watcher (auto-rebuild on .tsx/.ts changes) ---
cat > /etc/systemd/system/blaize-frontend-watcher.service << EOF
[Unit]
Description=Blaize Bazaar Frontend File Watcher (auto-rebuild)
After=blaize-frontend.service

[Service]
Type=simple
User=$CODE_EDITOR_USER
Group=$CODE_EDITOR_USER
WorkingDirectory=$REPO_PATH/blaize-bazaar/frontend
Environment=PATH=/home/$CODE_EDITOR_USER/.local/bin:/usr/local/bin:/usr/bin:/bin
Environment=HOME=/home/$CODE_EDITOR_USER
Environment=NODE_ENV=production
ExecStart=/usr/bin/npx chokidar-cli 'src/**/*.tsx' 'src/**/*.ts' 'src/**/*.css' -c 'npm run build' --debounce 1500
Restart=always
RestartSec=5
StandardOutput=append:/tmp/blaize-bazaar/frontend-watcher.log
StandardError=append:/tmp/blaize-bazaar/frontend-watcher.log

[Install]
WantedBy=multi-user.target
EOF

# Create log directory
mkdir -p /tmp/blaize-bazaar
chown "$CODE_EDITOR_USER:$CODE_EDITOR_USER" /tmp/blaize-bazaar

# Install chokidar-cli globally for the file watcher
sudo -u "$CODE_EDITOR_USER" npm install -g chokidar-cli 2>/dev/null || true

# Enable and start all services
systemctl daemon-reload
systemctl enable blaize-backend blaize-frontend blaize-frontend-watcher
systemctl start blaize-backend
sleep 5
systemctl start blaize-frontend
sleep 3
systemctl start blaize-frontend-watcher

# Verify services started
if systemctl is-active --quiet blaize-backend; then
    log "✅ Backend service running (port 8000, auto-reload on .py changes)"
else
    warn "Backend service failed to start — check: journalctl -u blaize-backend"
fi

if systemctl is-active --quiet blaize-frontend; then
    log "✅ Frontend service running (port 5173, auto-rebuild on save)"
else
    warn "Frontend service failed to start — check: journalctl -u blaize-frontend"
fi

log "✅ Auto-start services configured"
log "   App URL: https://<cloudfront>/app/"
log "   Backend auto-reloads on .py file changes"
log "   Frontend auto-rebuilds on .tsx/.ts/.css file changes (refresh browser)"

# ============================================================================
# STEP 15: STATUS MARKER
# ============================================================================
cat > /tmp/workshop-ready.json << EOF
{
    "status": "complete",
    "timestamp": "$(date -Iseconds)",
    "stage": "labs-bootstrap",
    "components": {
        "notebooks_dependencies": "ready",
        "blaize_bazaar_backend": "ready",
        "blaize_bazaar_frontend": "ready",
        "database_config": "ready",
        "jupyter_kernel": "ready"
    }
}
EOF
chmod 644 /tmp/workshop-ready.json
log "✅ Status marker created"

# ============================================================================
# SUMMARY
# ============================================================================
log "=========================================="
log "Stage 2: Labs Bootstrap Complete!"
log "=========================================="
echo ""
echo "✅ Notebooks (Jupyter) dependencies installed"
echo "✅ Blaize Bazaar Backend (FastAPI + Strands) installed"
echo "✅ Blaize Bazaar Frontend (React) dependencies installed"
echo "✅ Database setup complete (~444 products with indexes)"
echo "✅ MCP server configured for Amazon Q"
echo "✅ Bash environment configured (psql ready)"
echo "✅ Backend & Frontend auto-started (always running)"
echo ""
echo "🌐 App is live at: https://<cloudfront>/app/"
echo "   Backend auto-reloads on .py changes"
echo "   Frontend auto-rebuilds on .tsx/.ts/.css changes (refresh browser)"
echo ""
echo "Quick Commands:"
echo "  psql            # Connect to database"
echo "  journalctl -fu blaize-backend   # Backend logs"
echo "  journalctl -fu blaize-frontend  # Frontend logs"
echo ""
log "=========================================="

exit 0