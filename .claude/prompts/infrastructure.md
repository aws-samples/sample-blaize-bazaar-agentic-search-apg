# Blaize Bazaar — Infrastructure Prompt

**For:** AWS re:Invent 2026 workshop **Build Agentic AI-Powered Search with Amazon Aurora PostgreSQL**.

**What this produces:** the shared infrastructure layer used by both the 2-hour Workshop and the 1-hour Builders Session. CloudFormation templates (VPC, Aurora, Cognito User Pool, Code Editor, parent stack), bootstrap scripts, test user seeding, IAM policies.

**Run this BEFORE** either format-specific prompt (`workshop-content.md` or `builders-content.md`). The lab guides reference infrastructure that must exist.

**Prerequisites:** Repo-wide conventions live in `.kiro/steering/`. Even though this is a Claude Code task (not a Kiro spec), treat those steering files as authoritative context:

- `project.md` — module structure, directories, database
- `tech.md` — tech stack, model IDs
- `coding-standards.md` — coding patterns
- `database.md` — Aurora + pgvector conventions
- `workshop-content.md` — Workshop Studio content guidelines
- `storefront.md` — design tokens, nav, intents, auth UX

Read them first. Do not restate what's already there.

---

## How to use

1. `cd` into repo root: `aws-samples/sample-blaize-bazaar-agentic-search-apg`
2. Run `claude` to start Claude Code
3. Paste the section below as opening message

---

# Claude Code Task: Blaize Bazaar Infrastructure

You are producing the shared infrastructure layer for the Blaize Bazaar workshop. This includes all CloudFormation templates, the Cognito User Pool with real federated auth (Google + Apple + email/password), bootstrap scripts, test user seeding, and scoped IAM policies.

This infrastructure serves **two workshop formats** that share one codebase:

- 2-hour Workshop (9 build challenges)
- 1-hour Builders Session (C1 build + C2-C9 read-and-test)

Both formats need identical infrastructure. The format-specific content (lab guides, Workshop Studio metadata) will be produced by separate prompts.

## Critical context

This is a Level 400 session. Participants expect real, working, production-quality infrastructure. The authentication is real Amazon Cognito + AgentCore Identity, not simulated. IdP secrets live in AWS Secrets Manager, callback URLs are environment-driven, security scoping is production-grade.

## Pre-flight: verify repo state

Before doing anything, confirm:

- Repo: `aws-samples/sample-blaize-bazaar-agentic-search-apg`
- `blaize-bazaar/backend/services/cognito_auth.py` exists (Kiro should have scaffolded it)
- `blaize-bazaar/backend/services/agentcore_identity.py` exists
- `blaize-bazaar/backend/services/agentcore_memory.py` exists (used by preferences storage)
- `blaize-bazaar/frontend/src/utils/auth.ts` exists
- `blaize-bazaar/frontend/src/components/AuthModal.tsx` and `PreferencesModal.tsx` exist
- Database schema is `blaize_bazaar` with `product_catalog` (~444 rows, 1024-dim Cohere Embed v4 embeddings, `tags text[]` column) and `return_policies` (21 rows)
- Model IDs per `tech.md`: Claude Sonnet 4.6 for specialists, Claude Haiku 4.5 for orchestrator, Cohere Embed v4 for embeddings, Cohere Rerank v3.5 for reranking

If any core auth files are missing, stop and surface the gap.

---

## What to build

### 1. CloudFormation templates

#### `infrastructure/blaize-bazaar-vpc.yml`

- Two public + two private subnets across 2 AZs
- NAT gateway in each public subnet
- Internet gateway
- Security groups:
  - Aurora SG (inbound 5432 from private subnets only)
  - Code Editor SG (inbound 22 from Session Manager, outbound all)
  - Backend service SG (inbound 8000 from ALB/Code Editor, outbound to Aurora SG + Bedrock + Cognito endpoints)
- VPC endpoints for Bedrock, Secrets Manager, STS

#### `infrastructure/blaize-bazaar-database.yml`

- Aurora PostgreSQL **latest available (currently 17.7; CF template reads this as a parameter `AuroraEngineVersion` with default `17.7` so it bumps cleanly at re:Invent time)**
- Aurora Serverless v2, 0-16 ACU (scale-to-zero between sessions)
- pgvector 0.8.0 extension enabled via custom parameter group
- Master credentials in Secrets Manager (auto-generated, 24-char random password)
- Secret name: `blaize-bazaar-db-secret`
- Cluster identifier: `blaize-bazaar-cluster`
- Database name: `blaize_bazaar`
- IAM database authentication enabled for `blaize_app` role
- Backup retention: 1 day (workshop throwaway)
- Subnet group spans both private subnets
- Outputs: ClusterEndpoint, ClusterPort, MasterSecretArn, DatabaseName

#### `infrastructure/blaize-bazaar-cognito.yml` (the big one)

**User Pool:**

- Attributes: email (required, verified), name, given_name, family_name, `custom:workshop_id`
- Password policy: 8+ chars, 1 number, 1 symbol, 1 uppercase (Cognito defaults)
- MFA optional (off by default for workshop ease)
- Account recovery: email only
- Auto-verified attributes: email
- **Self-sign-up disabled** (test users pre-seeded; participants don't create accounts)

**Identity Providers:**

- `Google` — Client ID and Secret from Secrets Manager parameter `GoogleOAuthSecretArn`. Attribute mapping: `email` → `email`, `given_name` → `given_name`, `family_name` → `family_name`, `picture` → `picture`, `name` → `name`
- `SignInWithApple` — **template-guarded** by `EnableAppleSignIn` boolean parameter (default: `false`). When enabled, requires Apple Services ID + Team ID + Key ID + private key from Secrets Manager
- Native `COGNITO` provider for email/password

**User Pool Groups:**

- `workshop-participants` — default group for test users
- `instructors` — elevated group for workshop staff

**Hosted UI Domain:**

- Format: `blaize-bazaar-{WorkshopId}` where `WorkshopId` is a CF parameter
- Fully-qualified: `blaize-bazaar-{WorkshopId}.auth.{Region}.amazoncognito.com`

**App Client:**

- Name: `blaize-bazaar-web`
- OAuth flows: `authorization_code_grant` ONLY (no implicit, no client credentials)
- OAuth scopes: `openid email profile`
- Supported IdPs: COGNITO, Google, SignInWithApple (conditional)
- Callback URLs: parameter-driven (`CallbackUrls` list param, e.g., `https://{workshop-domain}/api/auth/callback`)
- Logout URLs: parameter-driven
- Access token validity: 1 hour
- ID token validity: 1 hour
- Refresh token validity: 30 days
- Prevent user existence errors: true
- Generate client secret: **true** (backend handles via env/Secrets Manager; no public SPA flow)
- Read attributes: email, name, given_name, family_name, picture, `custom:workshop_id`
- Write attributes: name, given_name, family_name, picture

**Custom Resource Lambda (Python 3.13):**

- Invoked as CloudFormation custom resource during stack creation
- Receives parameters: UserPoolId, NumberOfTestUsers (default 10), WorkshopId
- Creates `NumberOfTestUsers` accounts via `cognito-idp admin-create-user`:
  - Username format: `workshop-user-{N}-{WorkshopId}`
  - Email: `workshop-user-{N}@{WorkshopId}.blaize-bazaar.invalid` (reserved TLD, won't receive real mail)
  - Password: generated per-workshop instance (rotated, not hardcoded), written to output
  - Sets password permanent via `admin-set-user-password`
  - Assigns user to `workshop-participants` group
- Outputs: list of usernames + passwords (returned as CF stack output, viewable in console + written to secret)
- Handles DELETE event by cleaning up test users (stack teardown leaves no orphans)

**Stack Outputs:**

- `UserPoolId`
- `UserPoolClientId`
- `UserPoolClientSecretArn` (Secrets Manager ARN)
- `UserPoolDomain`
- `HostedUiUrl`
- `OAuthAuthorizeUrl`
- `OAuthTokenUrl`
- `OAuthLogoutUrl`
- `JwksUri`
- `TestUserCredentialsSecretArn`

#### `infrastructure/blaize-bazaar-code-editor.yml`

- EC2 `c6g.2xlarge` (Graviton, matching existing `tech.md` spec)
- VS Code Server + Amazon Q pre-installed via user data
- Pre-cloned repo in `/home/workshop/blaize-bazaar`
- Pre-configured AWS credentials via IAM instance profile
- CloudFront distribution in front of the instance (matching existing infra pattern in `tech.md`)
- Security group from VPC stack

#### `infrastructure/blaize-bazaar-labs.yml` (parent stack, top-level composite)

Composes all of the above. Parameters:

- `WorkshopId` (required, e.g., "reinvent2026-session-a")
- `WorkshopDomain` (required, e.g., "blaize-bazaar-reinvent2026a.example.com")
- `AuroraEngineVersion` (default "17.7"; bump before re:Invent)
- `GoogleOAuthSecretArn` (required)
- `AppleOAuthSecretArn` (optional, conditional on `EnableAppleSignIn`)
- `EnableAppleSignIn` (boolean, default false)
- `NumberOfTestUsers` (default 10)

Outputs aggregate from child stacks: Aurora endpoint, Cognito IDs/URLs, Code Editor URL, test credentials secret ARN.

### 2. Bootstrap scripts

#### `scripts/bootstrap-environment.sh` (fast, <3 min, signals CF)

```bash
#!/bin/bash
set -euo pipefail

cd /home/workshop
if [ ! -d blaize-bazaar ]; then
  git clone <repo-url> blaize-bazaar
fi
cd blaize-bazaar

# System deps (Python 3.13 per tech.md)
sudo apt-get update -qq
sudo apt-get install -y -qq postgresql-client-17 git jq unzip python3.13 python3.13-venv nodejs npm

# Python venv
python3.13 -m venv .venv
source .venv/bin/activate
pip install -q -r blaize-bazaar/backend/requirements.txt

# Frontend deps
(cd blaize-bazaar/frontend && npm ci --silent)

# Populate .env from CloudFormation outputs
./scripts/generate-env-from-cf.sh

# Start services via systemd (matches existing blaize-bazaar.service pattern)
sudo cp scripts/systemd/blaize-backend.service /etc/systemd/system/
sudo cp scripts/systemd/blaize-frontend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now blaize-backend blaize-frontend

# Wait for backend health check
for i in {1..30}; do
  curl -fsS http://localhost:8000/api/health && break
  sleep 2
done

# Signal CloudFormation
/opt/aws/bin/cfn-signal -s true "$WAIT_CONDITION_HANDLE"

echo "Environment ready. Backend at :8000, frontend at :5173."
```

#### `scripts/bootstrap-labs.sh` (async, runs after CF signals ready)

```bash
#!/bin/bash
set -euo pipefail

cd /home/workshop/blaize-bazaar
source .venv/bin/activate

echo "[1/5] Loading catalog..."
./scripts/load-database-fast.sh

echo "[2/5] Generating embeddings (Cohere Embed v4)..."
python -m scripts.generate_embeddings

echo "[3/5] Creating HNSW index (30-60s)..."
psql "$DATABASE_URL" -c "CREATE INDEX IF NOT EXISTS idx_product_embedding_hnsw \
  ON blaize_bazaar.product_catalog USING hnsw (embedding vector_cosine_ops);"

echo "[4/5] Seeding sample preferences for test users..."
./scripts/seed-sample-preferences.sh

echo "[5/5] Smoke-testing endpoints..."
curl -fsS http://localhost:8000/api/search -X POST -H "Content-Type: application/json" \
  -d '{"query":"something for long summer walks"}' | jq -r '.results | length' \
  | xargs -I {} echo "Search returned {} results"

echo ""
echo "==========================================="
echo "Labs ready. Participants can now sign in."
echo "Test credentials: see /home/workshop/test-credentials.txt"
echo "==========================================="
```

**Note on existing scripts:** your repo already has `bootstrap-labs.sh` and `bootstrap-labs-builders.sh`. Reconcile: keep one `bootstrap-labs.sh` (the format-agnostic one) and have each format's CF stack invoke it. The existing `bootstrap-labs-builders.sh` was distinguished only by preference pre-seeding emphasis — fold that into `seed-sample-preferences.sh` instead so both formats run identical bootstrap.

#### `scripts/load-database-fast.sh` (invoked by bootstrap-labs)

- Parallel embedding generation using `asyncio` + Bedrock batching (100 texts per batch, 5 concurrent batches)
- Bulk INSERT via psycopg3 COPY protocol from local CSV
- Products include `tags text[]` populated from a JSON metadata file
- Target: full ~444-product catalog ready in under 4 minutes

#### `scripts/seed-sample-preferences.sh` (NEW)

Retrieves test user credentials from Secrets Manager, then:

1. Authenticates 3 of the 10 test users via Cognito (`admin-initiate-auth`)
2. Gets their Cognito JWT
3. POSTs to `/api/user/preferences` with pre-defined preference sets:
   - `workshop-user-1` — `['minimal','serene','neutral','linen','slow']`
   - `workshop-user-2` — `['bold','creative','warm','evening','dresses']`
   - `workshop-user-3` — `['adventurous','earth','outdoor','outerwear','travel']`

Participants who sign in as user-1 immediately see a personalized storefront (minimal + serene + linen products first), reinforcing the agentic AI story before they touch the preferences modal. Critical for the Builders Session C9 demo.

#### `scripts/write-test-credentials.sh`

Called at end of `bootstrap-labs.sh`. Fetches Cognito test credentials secret and writes to `/home/workshop/test-credentials.txt`:

```
=============================================================
Blaize Bazaar Workshop Test Credentials
=============================================================
These are throwaway credentials for workshop use only.
DO NOT use for any production system.

Sign-in URL: {HostedUiUrl}

Username: workshop-user-1-{workshop-id}
Password: <password>
Pre-configured preferences: minimal, serene, neutral, linen, slow

Username: workshop-user-2-{workshop-id}
Password: <password>
Pre-configured preferences: bold, creative, warm, evening, dresses

... (10 users total)
=============================================================
```

File permissions: 0600 owned by `workshop` user.

### 3. IAM policy

Update `infrastructure/iam_policy.json`. Scoped to workshop role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BedrockModelAccess",
      "Effect": "Allow",
      "Action": "bedrock:InvokeModel",
      "Resource": [
        "arn:aws:bedrock:us-west-2::foundation-model/global.anthropic.claude-sonnet-4-6",
        "arn:aws:bedrock:us-west-2::foundation-model/global.anthropic.claude-haiku-4-5-20251001-v1:0",
        "arn:aws:bedrock:us-west-2::foundation-model/us.cohere.embed-v4:0",
        "arn:aws:bedrock:us-west-2::foundation-model/cohere.rerank-v3-5:0"
      ]
    },
    {
      "Sid": "AgentCoreAccess",
      "Effect": "Allow",
      "Action": [
        "bedrock-agentcore:CreateRuntime",
        "bedrock-agentcore:InvokeRuntime",
        "bedrock-agentcore:GetSession",
        "bedrock-agentcore:PutSessionMemory",
        "bedrock-agentcore:GetSessionMemory",
        "bedrock-agentcore:InvokeGateway",
        "bedrock-agentcore:GetIdentity"
      ],
      "Resource": "arn:aws:bedrock-agentcore:us-west-2:${AWS::AccountId}:runtime/blaize-bazaar-*"
    },
    {
      "Sid": "AuroraDataAccess",
      "Effect": "Allow",
      "Action": ["rds-db:connect"],
      "Resource": "arn:aws:rds-db:us-west-2:${AWS::AccountId}:dbuser:${AuroraClusterResourceId}/blaize_app"
    },
    {
      "Sid": "CognitoAdminActionsForBootstrap",
      "Effect": "Allow",
      "Action": [
        "cognito-idp:AdminCreateUser",
        "cognito-idp:AdminSetUserPassword",
        "cognito-idp:AdminAddUserToGroup",
        "cognito-idp:AdminInitiateAuth",
        "cognito-idp:AdminGetUser"
      ],
      "Resource": "arn:aws:cognito-idp:us-west-2:${AWS::AccountId}:userpool/${CognitoUserPoolId}"
    },
    {
      "Sid": "SecretsManagerRead",
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": [
        "arn:aws:secretsmanager:us-west-2:${AWS::AccountId}:secret:blaize-bazaar-db-secret-*",
        "arn:aws:secretsmanager:us-west-2:${AWS::AccountId}:secret:blaize-bazaar/google-oauth-*",
        "arn:aws:secretsmanager:us-west-2:${AWS::AccountId}:secret:blaize-bazaar/apple-oauth-*",
        "arn:aws:secretsmanager:us-west-2:${AWS::AccountId}:secret:blaize-bazaar/cognito-test-users-*",
        "arn:aws:secretsmanager:us-west-2:${AWS::AccountId}:secret:blaize-bazaar/cognito-client-secret-*"
      ]
    },
    {
      "Sid": "CloudWatchLogs",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:us-west-2:${AWS::AccountId}:log-group:/aws/blaize-bazaar/*"
    }
  ]
}
```

No wildcards on actions or resources except where AWS APIs require them (document inline).

---

## Implementation order

1. **Verify repo state** (pre-flight checks above)
2. **Update IAM policy** first — everything else depends on correct permissions
3. **Create `blaize-bazaar-vpc.yml`**
4. **Create `blaize-bazaar-database.yml`** — references VPC; uses `AuroraEngineVersion` parameter
5. **Create `blaize-bazaar-cognito.yml`** — includes custom resource Lambda for test user seeding
6. **Create `blaize-bazaar-code-editor.yml`** — references VPC + Cognito
7. **Create `blaize-bazaar-labs.yml`** (parent stack)
8. **Validate every template** with `aws cloudformation validate-template`
9. **Write bootstrap scripts** in order: `bootstrap-environment.sh` → `load-database-fast.sh` → `seed-sample-preferences.sh` → `write-test-credentials.sh` → `bootstrap-labs.sh` orchestrator
10. **Reconcile existing `bootstrap-labs-builders.sh`** (fold into `bootstrap-labs.sh`; move builders-specific preference seeding into `seed-sample-preferences.sh`)
11. **End-to-end test** in a throwaway AWS account: deploy parent stack → wait for green → SSH to Code Editor → verify `/home/workshop/test-credentials.txt` exists with 10 entries → sign in as `workshop-user-1` via hosted UI → verify grid is personalized

---

## Validation checklist

### CloudFormation

- [ ] All 5 templates validate with `aws cloudformation validate-template`
- [ ] Parent stack deploys end-to-end in under 12 minutes
- [ ] Aurora version is parameter-driven (`AuroraEngineVersion`, default 17.7)
- [ ] No hardcoded domains or URLs — everything parameter-driven
- [ ] All IdP secrets referenced from Secrets Manager by ARN
- [ ] All resources tagged `Project: blaize-bazaar`, `re:Invent: 2026`
- [ ] Cognito User Pool has `self-sign-up: disabled`
- [ ] App Client uses `authorization_code_grant` only

### Cognito custom resource Lambda

- [ ] Python 3.13 runtime
- [ ] Handles CREATE, UPDATE (idempotent), DELETE events
- [ ] Passwords are per-workshop-instance random, not hardcoded
- [ ] Scoped execution role

### Bootstrap

- [ ] `bootstrap-environment.sh` completes in under 3 minutes
- [ ] `bootstrap-labs.sh` completes in under 5 minutes end-to-end
- [ ] ~444 products indexed with HNSW (per `project.md`)
- [ ] 10 Cognito test users seeded
- [ ] 3 users (user-1, user-2, user-3) have pre-configured preferences in AgentCore Memory
- [ ] `/home/workshop/test-credentials.txt` exists with 0600 perms
- [ ] Smoke tests pass on `/api/search` and `/api/auth/me`
- [ ] Old `bootstrap-labs-builders.sh` reconciled (removed or redirected)

### IAM

- [ ] Every action scoped to specific resources
- [ ] All four models explicitly listed: Sonnet 4.6, Haiku 4.5, Cohere Embed v4, Cohere Rerank v3.5
- [ ] Cognito admin actions scoped to the workshop user pool ARN
- [ ] Secrets Manager scoped to `blaize-bazaar/*` and `blaize-bazaar-*` namespaces

### Security

- [ ] No secrets in repo (grep-check with `detect-secrets`)
- [ ] No hardcoded passwords
- [ ] VPC endpoints used for Bedrock, Secrets Manager, STS
- [ ] Backend SG allows inbound only from Code Editor SG + ALB

---

## Output

One-page summary:

- What was built (CloudFormation stacks, scripts, key parameters)
- Deploy time measured end-to-end
- Validation results
- Manual steps required before first workshop session (e.g., "create Google OAuth client and populate secret `blaize-bazaar/google-oauth`")
- Reconciliation notes on `bootstrap-labs-builders.sh`

Start by verifying repo state, propose a plan, then build.
