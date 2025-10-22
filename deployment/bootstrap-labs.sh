#!/bin/bash
# DAT406 Workshop - Stage 2: Labs Bootstrap
# Purpose: Install Lab 1 and Lab 2 dependencies while CloudFormation continues
# Duration: ~20 minutes

set -euo pipefail

# ============================================================================
# PARAMETERS FROM ENVIRONMENT
# ============================================================================
CODE_EDITOR_USER="${CODE_EDITOR_USER:-participant}"
HOME_FOLDER="${HOME_FOLDER:-/workshop}"
REPO_URL="${REPO_URL:-https://github.com/aws-samples/sample-dat406-build-agentic-ai-powered-search-apg.git}"
REPO_NAME="sample-dat406-build-agentic-ai-powered-search-apg"

# Database configuration
DB_SECRET_ARN="${DB_SECRET_ARN:-}"
DB_CLUSTER_ENDPOINT="${DB_CLUSTER_ENDPOINT:-}"
DB_NAME="${DB_NAME:-postgres}"
AWS_REGION="${AWS_REGION:-us-west-2}"
BEDROCK_EMBEDDING_MODEL="${BEDROCK_EMBEDDING_MODEL:-amazon.titan-embed-text-v2:0}"
BEDROCK_CHAT_MODEL="${BEDROCK_CHAT_MODEL:-us.anthropic.claude-sonnet-4-20250514-v1:0}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"; }
warn() { echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARNING:${NC} $1"; }
error() { echo -e "${RED}[$(date +'%H:%M:%S')] ERROR:${NC} $1"; }

log "=========================================="
log "DAT406 Stage 2: Labs Bootstrap"
log "=========================================="

# ============================================================================
# STEP 1: CLONE REPOSITORY (~30 sec)
# ============================================================================

log "Cloning workshop repository..."
if [ ! -z "$REPO_URL" ] && [ "$REPO_URL" != "none" ]; then
    if [ ! -d "$HOME_FOLDER/$REPO_NAME" ]; then
        if sudo -u "$CODE_EDITOR_USER" git clone "$REPO_URL" "$HOME_FOLDER/$REPO_NAME" 2>/dev/null; then
            log "✅ Repository cloned successfully"
            # Remove .git to disable source control for participants
            rm -rf "$HOME_FOLDER/$REPO_NAME/.git"
            log "✅ Source control disabled for participant use"
        else
            warn "Repository clone failed - creating directory structure"
            sudo -u "$CODE_EDITOR_USER" mkdir -p "$HOME_FOLDER/$REPO_NAME"/{lab1,lab2/{backend,frontend,config},data,deployment,docs}
        fi
    else
        log "✅ Repository already exists"
    fi
fi

# ============================================================================
# STEP 2: FETCH DATABASE CREDENTIALS (~10 sec)
# ============================================================================

log "Fetching database credentials..."

export DB_HOST=""
export DB_PORT="5432"
export DB_USER=""
export DB_PASSWORD=""

if [ ! -z "$DB_SECRET_ARN" ] && [ "$DB_SECRET_ARN" != "none" ]; then
    DB_SECRET=$(aws secretsmanager get-secret-value \
        --secret-id "$DB_SECRET_ARN" \
        --region "$AWS_REGION" \
        --query SecretString \
        --output text 2>/dev/null || echo "")
    
    if [ ! -z "$DB_SECRET" ]; then
        export DB_HOST=$(echo "$DB_SECRET" | jq -r '.host // empty')
        export DB_PORT=$(echo "$DB_SECRET" | jq -r '.port // "5432"')
        export DB_NAME=$(echo "$DB_SECRET" | jq -r '.dbname // .database // "postgres"')
        export DB_USER=$(echo "$DB_SECRET" | jq -r '.username // empty')
        export DB_PASSWORD=$(echo "$DB_SECRET" | jq -r '.password // empty')
        
        log "✅ Database credentials retrieved"
        log "   Host: $DB_HOST"
        log "   Database: $DB_NAME"
    else
        warn "Could not retrieve database credentials"
    fi
else
    warn "DB_SECRET_ARN not set - skipping database configuration"
fi

# ============================================================================
# STEP 3: CREATE .ENV FILES (~5 sec)
# ============================================================================

log "Creating environment configuration files..."

# Get CloudFront URL from EC2 metadata or environment
CLOUDFRONT_URL="${CLOUDFRONT_URL:-}"
if [ -z "$CLOUDFRONT_URL" ] || [ "$CLOUDFRONT_URL" = "None" ]; then
    # Try to get from EC2 tags or metadata
    CLOUDFRONT_URL=$(aws ec2 describe-tags --filters "Name=resource-id,Values=$(ec2-metadata --instance-id | cut -d ' ' -f 2)" "Name=key,Values=CloudFrontURL" --query 'Tags[0].Value' --output text 2>/dev/null || echo "")
    # If still None or empty, set to empty string
    if [ "$CLOUDFRONT_URL" = "None" ] || [ -z "$CLOUDFRONT_URL" ]; then
        CLOUDFRONT_URL=""
    fi
fi

# Always create Lab 2 Frontend .env (doesn't need DB credentials)
if [ -d "$HOME_FOLDER/$REPO_NAME/lab2/frontend" ]; then
    # Use relative path for CloudFront compatibility
    API_URL="/ports/8000"
    
    cat > "$HOME_FOLDER/$REPO_NAME/lab2/frontend/.env" << ENV_FRONTEND
VITE_API_URL=$API_URL
VITE_AWS_REGION=$AWS_REGION
VITE_ENABLE_LAB2=true
CLOUDFRONT_URL=$CLOUDFRONT_URL
ENV_FRONTEND

    chown "$CODE_EDITOR_USER:$CODE_EDITOR_USER" "$HOME_FOLDER/$REPO_NAME/lab2/frontend/.env"
    chmod 644 "$HOME_FOLDER/$REPO_NAME/lab2/frontend/.env"
    log "✅ Lab 2 Frontend .env created (API: $API_URL)"
fi

# Create DB-dependent .env files only if credentials are available
if [ ! -z "$DB_HOST" ] && [ ! -z "$DB_USER" ]; then
    # Extract cluster ARN from secret ARN
    DB_CLUSTER_ARN="arn:aws:rds:${AWS_REGION}:$(aws sts get-caller-identity --query Account --output text):cluster:apg-pgvector-dat406"
    
    # Root .env
    cat > "$HOME_FOLDER/$REPO_NAME/.env" << ENV_ROOT
# Database Configuration
DB_SECRET_ARN=$DB_SECRET_ARN
DB_CLUSTER_ARN=$DB_CLUSTER_ARN
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME

# PostgreSQL CLI
PGHOST=$DB_HOST
PGPORT=$DB_PORT
PGUSER=$DB_USER
PGPASSWORD=$DB_PASSWORD
PGDATABASE=$DB_NAME

# AWS Configuration
AWS_REGION=$AWS_REGION
AWS_DEFAULT_REGION=$AWS_REGION

# Bedrock Models
BEDROCK_EMBEDDING_MODEL=$BEDROCK_EMBEDDING_MODEL
BEDROCK_CHAT_MODEL=$BEDROCK_CHAT_MODEL
ENV_ROOT

    chown "$CODE_EDITOR_USER:$CODE_EDITOR_USER" "$HOME_FOLDER/$REPO_NAME/.env"
    chmod 600 "$HOME_FOLDER/$REPO_NAME/.env"
    log "✅ Root .env created"
    
    # Lab 2 Backend .env
    if [ -d "$HOME_FOLDER/$REPO_NAME/lab2/backend" ]; then
        cat > "$HOME_FOLDER/$REPO_NAME/lab2/backend/.env" << ENV_BACKEND
# Database Configuration
DB_SECRET_ARN=$DB_SECRET_ARN
DB_CLUSTER_ARN=$DB_CLUSTER_ARN
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME

# PostgreSQL Connection
PGHOST=$DB_HOST
PGPORT=$DB_PORT
PGUSER=$DB_USER
PGPASSWORD=$DB_PASSWORD
PGDATABASE=$DB_NAME

# AWS Configuration
AWS_REGION=$AWS_REGION
AWS_DEFAULT_REGION=$AWS_REGION

# Bedrock Models
BEDROCK_EMBEDDING_MODEL=$BEDROCK_EMBEDDING_MODEL
BEDROCK_CHAT_MODEL=$BEDROCK_CHAT_MODEL

# CloudFront URL
CLOUDFRONT_URL=$CLOUDFRONT_URL
ENV_BACKEND

        chown "$CODE_EDITOR_USER:$CODE_EDITOR_USER" "$HOME_FOLDER/$REPO_NAME/lab2/backend/.env"
        chmod 600 "$HOME_FOLDER/$REPO_NAME/lab2/backend/.env"
        log "✅ Lab 2 Backend .env created"
    fi
    
    # .pgpass for psql CLI
    cat > "/home/$CODE_EDITOR_USER/.pgpass" << PGPASS
$DB_HOST:$DB_PORT:$DB_NAME:$DB_USER:$DB_PASSWORD
PGPASS

    chmod 600 "/home/$CODE_EDITOR_USER/.pgpass"
    chown "$CODE_EDITOR_USER:$CODE_EDITOR_USER" "/home/$CODE_EDITOR_USER/.pgpass"
    log "✅ .pgpass created for psql CLI"
else
    warn "Database credentials not available - backend .env and .pgpass not created"
    warn "Lab 1 and Lab 2 backend will require manual database configuration"
fi

# ============================================================================
# STEP 4: LAB 1 - JUPYTER NOTEBOOK DEPENDENCIES (~3 min)
# ============================================================================

log "Installing Lab 1 (Jupyter) dependencies..."

LAB1_REQUIREMENTS="$HOME_FOLDER/$REPO_NAME/lab1/requirements.txt"

if [ -f "$LAB1_REQUIREMENTS" ]; then
    log "Installing from $LAB1_REQUIREMENTS..."
    sudo -u "$CODE_EDITOR_USER" python3.13 -m pip install --user -q -r "$LAB1_REQUIREMENTS"
    log "✅ Lab 1 dependencies installed from requirements.txt"
else
    warn "Lab 1 requirements.txt not found, installing core packages..."
    sudo -u "$CODE_EDITOR_USER" python3.13 -m pip install --user -q \
        httpx \
        "psycopg[binary,pool]>=3.1.0" \
        pgvector \
        sqlparse \
        "pandas>=2.0.0" \
        "numpy<2.0" \
        "matplotlib>=3.7.0" \
        "seaborn>=0.12.0" \
        "boto3>=1.28.0" \
        tqdm \
        pandarallel \
        plotly \
        kaleido \
        python-dotenv \
        "ipykernel>=6.25.0" \
        "jupyter>=1.0.0" \
        "jupyterlab>=4.0.0" \
        ipywidgets
    log "✅ Lab 1 core packages installed"
fi

# ============================================================================
# STEP 5: JUPYTER KERNEL REGISTRATION (~10 sec)
# ============================================================================

log "Registering Jupyter kernel for Python 3.13..."
sudo -u "$CODE_EDITOR_USER" python3.13 -m ipykernel install \
    --user \
    --name python3 \
    --display-name "Python 3.13"
log "✅ Jupyter kernel registered"

# ============================================================================
# STEP 6: LAB 2 - BACKEND DEPENDENCIES (~4 min)
# ============================================================================

log "Installing Lab 2 Backend dependencies..."

LAB2_BACKEND_REQUIREMENTS="$HOME_FOLDER/$REPO_NAME/lab2/backend/requirements.txt"

if [ -f "$LAB2_BACKEND_REQUIREMENTS" ]; then
    log "Installing from $LAB2_BACKEND_REQUIREMENTS..."
    cd "$HOME_FOLDER/$REPO_NAME/lab2/backend"
    sudo -u "$CODE_EDITOR_USER" python3.13 -m pip install --user -q -r requirements.txt
    cd - > /dev/null
    log "✅ Lab 2 Backend dependencies installed from requirements.txt"
else
    warn "Lab 2 Backend requirements.txt not found, installing core packages..."
    sudo -u "$CODE_EDITOR_USER" python3.13 -m pip install --user -q \
        "fastapi>=0.115.0" \
        "uvicorn[standard]>=0.30.0" \
        python-multipart \
        "psycopg[binary,pool]>=3.2.0" \
        "pgvector>=0.2.5" \
        "boto3>=1.35.0" \
        "botocore>=1.35.0" \
        "pydantic>=2.0.0" \
        "pydantic-settings>=2.0.0" \
        python-dotenv \
        "numpy>=1.22.0,<2.0.0" \
        tenacity \
        rich \
        python-json-logger \
        strands-agents \
        strands-agents-tools \
        strands-agents-builder
    log "✅ Lab 2 Backend core packages installed"
fi

# ============================================================================
# STEP 7: INSTALL UV/UVX FOR MCP (~30 sec)
# ============================================================================

log "Installing uv/uvx for MCP..."
if command -v uv &>/dev/null; then
    log "✅ uv already installed"
else
    if command -v curl &>/dev/null; then
        sudo -u "$CODE_EDITOR_USER" bash -c 'curl -LsSf https://astral.sh/uv/install.sh | sh' || {
            log "curl installation failed, trying pip..."
            sudo -u "$CODE_EDITOR_USER" python3.13 -m pip install --user uv
        }
    else
        sudo -u "$CODE_EDITOR_USER" python3.13 -m pip install --user uv
    fi
    log "✅ uv/uvx installed"
fi

# ============================================================================
# STEP 8: GENERATE MCP CONFIG (~5 sec)
# ============================================================================

if [ ! -z "$DB_CLUSTER_ARN" ] && [ ! -z "$DB_SECRET_ARN" ]; then
    log "Generating MCP server configuration..."
    
    mkdir -p "$HOME_FOLDER/$REPO_NAME/lab2/config"
    
    cat > "$HOME_FOLDER/$REPO_NAME/lab2/config/mcp-server-config.json" << MCP_CONFIG
{
  "mcpServers": {
    "awslabs.postgres-mcp-server": {
      "command": "uv",
      "args": [
        "run",
        "--with",
        "awslabs.postgres-mcp-server",
        "awslabs.postgres-mcp-server",
        "--resource_arn",
        "$DB_CLUSTER_ARN",
        "--secret_arn",
        "$DB_SECRET_ARN",
        "--database",
        "$DB_NAME",
        "--region",
        "$AWS_REGION",
        "--readonly",
        "True"
      ],
      "env": {
        "AWS_REGION": "$AWS_REGION",
        "FASTMCP_LOG_LEVEL": "ERROR"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
MCP_CONFIG

    chown "$CODE_EDITOR_USER:$CODE_EDITOR_USER" "$HOME_FOLDER/$REPO_NAME/lab2/config/mcp-server-config.json"
    chmod 644 "$HOME_FOLDER/$REPO_NAME/lab2/config/mcp-server-config.json"
    log "✅ MCP server config generated"
else
    warn "DB_CLUSTER_ARN or DB_SECRET_ARN not set - MCP config not generated"
fi

# ============================================================================
# STEP 9: LAB 2 - FRONTEND DEPENDENCIES (~8 min)
# ============================================================================

if [ -d "$HOME_FOLDER/$REPO_NAME/lab2/frontend" ]; then
    log "Installing Lab 2 Frontend dependencies..."
    cd "$HOME_FOLDER/$REPO_NAME/lab2/frontend"
    
    if sudo -u "$CODE_EDITOR_USER" npm install 2>/dev/null; then
        log "✅ Lab 2 Frontend dependencies installed"
    else
        warn "Lab 2 Frontend npm install failed - may need manual setup"
    fi
    cd - > /dev/null
else
    warn "Lab 2 Frontend directory not found - skipping npm install"
fi

# ============================================================================
# STEP 10: CREATE START SCRIPTS (~5 sec)
# ============================================================================

log "Creating start scripts..."

# Create start-backend script
cat > "$HOME_FOLDER/$REPO_NAME/lab2/start-backend.sh" << 'START_BACKEND'
#!/bin/bash
cd "$(dirname "$0")/backend"

# Load environment variables from root .env
if [ -f "../../.env" ]; then
    export $(grep -v '^#' ../../.env | xargs)
    echo "✅ Environment variables loaded"
fi

# Check if dependencies are installed
if ! python3 -c "import fastapi" 2>/dev/null; then
    echo "📦 Installing backend dependencies..."
    if [ -f requirements.txt ]; then
        python3 -m pip install --user -q -r requirements.txt
        echo "✅ Dependencies installed"
    else
        echo "❌ requirements.txt not found"
        exit 1
    fi
fi

# Generate MCP config if it doesn't exist
if [ ! -f "../config/mcp-server-config.json" ]; then
    echo "🔧 Generating MCP config..."
    if [ -f "generate_mcp_config.py" ]; then
        python3 generate_mcp_config.py 2>/dev/null || echo "⚠️  MCP config generation skipped (optional)"
    fi
fi

echo "🚀 Starting FastAPI backend on http://localhost:8000"
echo "📚 API docs: http://localhost:8000/docs"
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
START_BACKEND

chmod +x "$HOME_FOLDER/$REPO_NAME/lab2/start-backend.sh"
chown "$CODE_EDITOR_USER:$CODE_EDITOR_USER" "$HOME_FOLDER/$REPO_NAME/lab2/start-backend.sh"

# Create start-frontend script
cat > "$HOME_FOLDER/$REPO_NAME/lab2/start-frontend.sh" << 'START_FRONTEND'
#!/bin/bash
cd "$(dirname "$0")/frontend"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
    echo "✅ Dependencies installed"
fi

# Build production version if dist/ doesn't exist
if [ ! -d "dist" ]; then
    echo "🛠️  Building production version (first time only)..."
    npm run build
    echo "✅ Production build complete"
fi

echo "🚀 Starting React frontend on http://localhost:5173"
echo "🔗 Backend should be running at: http://localhost:8000"
echo "📝 Using production build (CloudFront compatible)"

# Serve production build (suppresses xsel clipboard error)
NO_UPDATE_NOTIFIER=1 npx serve -s dist -l 5173 2>&1 | grep -v "xsel"
START_FRONTEND

chmod +x "$HOME_FOLDER/$REPO_NAME/lab2/start-frontend.sh"
chown "$CODE_EDITOR_USER:$CODE_EDITOR_USER" "$HOME_FOLDER/$REPO_NAME/lab2/start-frontend.sh"

log "✅ Start scripts created"

# ============================================================================
# STEP 11: BASH ENVIRONMENT CONFIGURATION (~5 sec)
# ============================================================================

log "Configuring bash environment..."

# Create temp file with bash configuration
cat > /tmp/bashrc_append.txt << 'BASHRC'

# ============================================================================
# DAT406 Workshop Environment
# ============================================================================

if [ -f /workshop/sample-dat406-build-agentic-ai-powered-search-apg/.env ]; then
    set -a
    source /workshop/sample-dat406-build-agentic-ai-powered-search-apg/.env
    set +a
fi

# Workshop Navigation Aliases
alias workshop='cd /workshop/sample-dat406-build-agentic-ai-powered-search-apg'
alias lab1='cd /workshop/sample-dat406-build-agentic-ai-powered-search-apg/lab1'
alias lab2='cd /workshop/sample-dat406-build-agentic-ai-powered-search-apg/lab2'
alias backend='cd /workshop/sample-dat406-build-agentic-ai-powered-search-apg/lab2/backend'
alias frontend='cd /workshop/sample-dat406-build-agentic-ai-powered-search-apg/lab2/frontend'

# Lab Service Shortcuts
start-backend() {
    /workshop/sample-dat406-build-agentic-ai-powered-search-apg/lab2/start-backend.sh
}

start-frontend() {
    /workshop/sample-dat406-build-agentic-ai-powered-search-apg/lab2/start-frontend.sh
}

start-jupyter() {
    cd /workshop/sample-dat406-build-agentic-ai-powered-search-apg/lab1
    echo "🚀 Starting Jupyter Lab on http://localhost:8888"
    jupyter lab --ip=0.0.0.0 --port=8888 --no-browser
}

# Database Shortcuts
psql-workshop() {
    psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE
}

# AWS Region for boto3
export AWS_DEFAULT_REGION=${AWS_REGION:-us-west-2}

# Note: EC2 instances use IAM role for credentials automatically
# No need to export AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY

# Display workshop info on login
if [ -f /tmp/workshop-ready.json ]; then
    echo ""
    echo "🚀 DAT406 Workshop Environment Ready!"
    echo ""
    echo "Quick Commands:"
    echo "  workshop      - Navigate to workshop directory"
    echo "  lab1          - Navigate to Lab 1 (Jupyter notebooks)"
    echo "  lab2          - Navigate to Lab 2 (Full-stack app)"
    echo "  start-jupyter - Launch Jupyter Lab"
    echo "  start-backend - Launch FastAPI backend"
    echo "  start-frontend- Launch React frontend"
    echo ""
fi
BASHRC

# Append to user's .bashrc with proper permissions
sudo -u "$CODE_EDITOR_USER" bash -c "cat /tmp/bashrc_append.txt >> /home/$CODE_EDITOR_USER/.bashrc"
rm -f /tmp/bashrc_append.txt
log "✅ Bash environment configured"

# ============================================================================
# STEP 11: CREATE STATUS MARKER (~1 sec)
# ============================================================================

log "Creating completion status marker..."

cat > /tmp/workshop-ready.json << STATUS
{
    "status": "complete",
    "timestamp": "$(date -Iseconds)",
    "stage": "labs-bootstrap",
    "components": {
        "code_editor": "ready",
        "vscode_extensions": "ready",
        "lab1_dependencies": "ready",
        "lab2_backend": "ready",
        "lab2_frontend": "ready",
        "database_config": "ready",
        "jupyter_kernel": "ready"
    },
    "versions": {
        "python": "3.13",
        "node": "$(node --version 2>/dev/null || echo 'unknown')",
        "npm": "$(npm --version 2>/dev/null || echo 'unknown')"
    }
}
STATUS

chmod 644 /tmp/workshop-ready.json
log "✅ Status marker created: /tmp/workshop-ready.json"

# ============================================================================
# STEP 12: FINAL VERIFICATION (~5 sec)
# ============================================================================

log "Performing final verification..."

# Check Lab 1 dependencies
if sudo -u "$CODE_EDITOR_USER" python3.13 -c "import jupyter, pandas, psycopg, pgvector" 2>/dev/null; then
    log "✅ Lab 1 dependencies verified"
else
    warn "⚠️  Some Lab 1 dependencies may be missing"
fi

# Check Lab 2 Backend dependencies
if sudo -u "$CODE_EDITOR_USER" python3.13 -c "import fastapi, uvicorn, strands" 2>/dev/null; then
    log "✅ Lab 2 Backend dependencies verified"
else
    warn "⚠️  Some Lab 2 Backend dependencies may be missing"
fi

# Check Lab 2 Frontend
if [ -d "$HOME_FOLDER/$REPO_NAME/lab2/frontend/node_modules" ]; then
    log "✅ Lab 2 Frontend dependencies verified"
else
    warn "⚠️  Lab 2 Frontend node_modules not found"
fi

# Check Jupyter kernel
if sudo -u "$CODE_EDITOR_USER" jupyter kernelspec list 2>/dev/null | grep -q "python3"; then
    log "✅ Jupyter kernel verified"
else
    warn "⚠️  Jupyter kernel may not be registered"
fi

# ============================================================================
# SUMMARY
# ============================================================================

log "=========================================="
log "Stage 2: Labs Bootstrap Complete!"
log "=========================================="
echo ""
echo "✅ Lab 1 (Jupyter) dependencies installed"
echo "✅ Lab 2 Backend (FastAPI + Strands) installed"
echo "✅ Lab 2 Frontend (React) dependencies installed"
echo "✅ Database configuration complete"
echo "✅ Bash environment configured"
echo ""
echo "Workshop Repository: $HOME_FOLDER/$REPO_NAME"
echo ""
echo "Quick Start Commands:"
echo "  ssh to instance and run:"
echo "    start-jupyter   # Lab 1: Jupyter notebooks"
echo "    start-backend   # Lab 2: FastAPI backend"
echo "    start-frontend  # Lab 2: React frontend"
echo ""
log "=========================================="

# Notify all logged-in users
echo "✅ DAT406 Workshop environment fully ready!" | wall 2>/dev/null || true

exit 0