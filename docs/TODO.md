# TODO — Pre-Launch Punch List

Items to address before the workshop goes live.

---

## ✅ Completed

- [x] Product images replaced with category-matched Unsplash photos (1,008 products)
- [x] Product counts updated to ~1,000 everywhere
- [x] Solution files validated (all 8 differ from TODOs and compile clean)
- [x] Frontend demo queries match premium dataset
- [x] Search limit reduced to 5 for unique images
- [x] Tour content rewritten for progressive story
- [x] 6 new production features implemented (iterative scan, quantization, semantic search, episodic memory, NL policy, code interpreter)
- [x] Tool renamed: `get_category_price_analysis` → `get_price_analysis`
- [x] Server names renamed: `bazaar-*` → `blaize-*`
- [x] Model IDs verified: Sonnet for specialists, Haiku for orchestrator
- [x] IAM policy updated: Cohere Embed v4, Cohere Rerank, Haiku added; Titan removed
- [x] Keyword placeholders verified against dataset (MacBook Air, Samsung Galaxy, iPhone 15)

---

## CloudFormation Templates

These files live in `lab-content/.../assets/` and `lab-content/.../static/`. They need review before the workshop environment is provisioned.

### `static/genai-dat-406-labs.yml` (Main orchestrator template)

- [ ] **Session ID in description** — Line 5 says "DAT406 workshop". Update if session ID changes.
- [ ] **Workshop name default** — Line 54: `dat406-agentic-search`. Update if renaming.
- [ ] **GitHub repo URL** — Line 73: Points to `aws-samples/sample-blaize-bazaar-agentic-search-apg`. Verify this is the correct public repo at launch time.
- [ ] **Bootstrap script URLs** — Lines 244-245: Hardcoded to `raw.githubusercontent.com/.../main/scripts/bootstrap-environment.sh`. These must match the actual repo and branch at deploy time.
- [ ] **Embedding model default** — Already updated to `us.cohere.embed-v4:0`. Verify.
- [ ] **Tag values** — Multiple `Value: DAT406` tags. Update if session ID changes.

### `assets/dat406-code-editor.yml` (Code Editor EC2 instance)

- [ ] **Description** — Line 3: "DAT406 - Code Editor". Update if session ID changes.
- [ ] **Repo URL default** — Line 50: Same GitHub URL. Must match at launch.
- [ ] **Bootstrap URLs** — Lines 55, 60: Same raw GitHub URLs. Must match.
- [ ] **Labs bootstrap description** — Line 62: Still says "Stage 2 bootstrap script (Lab 1 + Lab 2)". Update to reflect new module structure.
- [ ] **Embedding model** — Already updated to `us.cohere.embed-v4:0`. Verify.
- [ ] **Bedrock IAM permissions** — Already updated with Cohere + Haiku ARNs. Verify.
- [ ] **SSM document description** — Line 380: "DAT406 Two-Stage Bootstrap". Update if needed.
- [ ] **Instance type** — Default `c6g.2xlarge`. Verify this is sufficient for the workshop.

### `assets/dat406-database.yml` (Aurora PostgreSQL cluster)

- [ ] **Secret name** — Line 138: `apg-pgvector-secret-dat406`. Update if session ID changes.
- [ ] **Cluster identifier** — Line 159: `apg-pgvector-dat406`. Update if session ID changes.
- [ ] **imgUrl column width** — The `load-database-fast.sh` script creates the table with `VARCHAR(200)` for imgUrl. Verify the CFN template's schema matches if it creates tables.
- [ ] **Lambda layer** — Line 212: `psycopg-layer-dat406`. Verify the psycopg layer ZIP is current.

### `assets/dat406-vpc.yml` (VPC networking)

- [ ] **VPC name** — Line 14: `APGPGVectorWorkshopDAT406`. Update if session ID changes.
- [ ] No other changes needed — standard VPC template.

### `assets/dat406-rds-version.yml` (RDS version helper)

- [ ] **Aurora version** — Hardcoded to 17.5. Verify this is still the target version.
- [ ] No other changes needed.

### `static/iam_policy.json` (Participant IAM permissions)

- [x] Already updated with Cohere Embed v4, Cohere Rerank, Haiku, Sonnet ARN patterns.
- [ ] **Verify AgentCore permissions** — `bedrock-agentcore:*` is present. Confirm this covers Policy, Evaluations, and Code Interpreter APIs.

### `contentspec.yaml` (Workshop Studio config)

- [ ] **Description** — Line 5: "DAT4XX - Build agentic AI-powered search...". Update session ID when assigned.
- [ ] **Label** — Line 76: "DAT4XX - Blaize Bazaar AI-powered Search Platform". Update session ID.
- [ ] **Region config** — Lines 68-72: Required `us-west-2`, recommended `us-east-1`. Verify AgentCore availability in these regions.

---

## Screenshots

- [ ] **Architecture diagrams** — Content pages have `<!-- TODO: Add architecture diagram screenshot -->` placeholders. Mermaid diagrams are in place but static screenshots may be needed.
- [ ] **Old notebook screenshots** — `static/part1/` through `static/part4/` contain screenshots from the old notebook-based flow. Replace or remove.
- [ ] **Getting Started screenshots** — Verify sign-in flow images in `static/prereq/` are accurate for the workshop environment.
- [ ] **Production Deployment screenshots** — Sub-pages under section 6 have `<!-- TODO: Screenshot -->` placeholders for Lambda deploy, Gateway console, Runtime dashboard, and trace waterfall.

---

## End-to-End Testing

- [ ] **Fresh environment walkthrough** — Deploy a fresh CFN stack, run bootstrap scripts, verify the app starts in TODO/legacy mode, complete each module (or cp solutions), restart, verify storefront evolves correctly.
- [ ] **CloudFront production build** — The workshop environment serves the frontend via CloudFront using `npm run build` + `http-server` (not `npm run dev`). The Vite config sets `base: '/ports/5173/'` in production mode. Verify:
  - `START_FRONTEND.sh` builds and serves correctly behind CloudFront
  - All API proxy calls work through CloudFront (the production build doesn't have Vite's dev proxy — API calls go through CloudFront path routing)
  - Static assets load from `/ports/5173/assets/` path
  - The `vite.config.ts` proxy target port matches the backend port in the workshop environment
- [ ] **AgentCore integration** — Verify Memory, Gateway, and Policy challenges work against a live AgentCore deployment.
- [ ] **Code Interpreter** — Test the analytics agent with `create_analytics_agent()` against a live AgentCore Code Interpreter session.
- [ ] **Database reload** — Run `scripts/load-database-fast.sh` in the workshop environment to confirm the premium CSV loads correctly with the widened imgUrl column.

---

## Bootstrap Scripts

### `scripts/bootstrap-environment.sh`

- [ ] **Welcome message** — Verify the directory structure shown matches the current repo layout.
- [ ] **Auto-open file** — Opens `hybrid_search.py` on startup. Verify this is the right first file for participants.
- [ ] **pip install** — Installs from `blaize-bazaar/backend/requirements.txt`. Verify all dependencies are listed.

### `scripts/bootstrap-labs.sh`

- [ ] **install_notebooks()** — Currently a no-op (notebooks archived). Can be removed entirely if not needed.
- [ ] **Product count message** — Says "~1,000 products". Verify matches actual count after load.

---

## Content Pages (Workshop Studio repo)

Files to copy from `lab-content/.../content/` to the Workshop Studio repo:

| File                                          | Last updated | Notes                                                    |
| --------------------------------------------- | ------------ | -------------------------------------------------------- |
| `1-Welcome/index.en.md`                       | This session | Verify session ID references                             |
| `2-Getting-Started/index.en.md`               | This session | Keyword examples: MacBook Air, Samsung Galaxy, iPhone 15 |
| `3-Semantic-Search/index.en.md`               | This session | Includes iterative scan + quantization sections          |
| `4-Agent-Tools/index.en.md`                   | This session | Uses `get_price_analysis` (renamed)                      |
| `5-Multi-Agent-Orchestration/index.en.md`     | This session | Split into sub-pages                                     |
| `5-.../1-Build-Specialist-Agents/index.en.md` | This session | Challenges 1-2                                           |
| `5-.../2-AgentCore-Services/index.en.md`      | This session | Challenges 3-4 + episodic memory + semantic search       |
| `6-Production-Deployment/index.en.md`         | This session | NL policy section added                                  |
| `6-.../1-Deploy-Lambda-Servers/index.en.md`   | This session | Uses `blaize-*` server names                             |
| `6-.../2-Create-Gateway/index.en.md`          | This session | Uses `blaize-gateway`                                    |
| `6-.../3-Deploy-Runtime/index.en.md`          | This session | Uses `blaize_orchestrator`                               |
| `6-.../4-Code-Interpreter/index.en.md`        | This session | NEW — Code Interpreter sub-page                          |
| `6-.../4-Test-Production/index.en.md`         | This session | Weight changed to 50                                     |
| `7-Reference/a-FAQs/index.en.md`              | This session | 6 new FAQ entries added                                  |
| `7-Reference/b-Troubleshooting/index.en.md`   | Earlier      | Verify directory structure matches                       |
| `7-Reference/c-Credits/index.en.md`           | Earlier      | Verify team info                                         |

---

## Optional / Future

- [ ] **Per-product image refinement** — Run `scripts/fix_product_images.py` with Unsplash production API for per-product matching (~70% hit rate). Current category-level images are good enough for workshop.
- [ ] **AgentCore Evaluations** — LLM-as-a-Judge scoring for agent quality. Could be added as an advanced optional module.
- [ ] **API Gateway MCP Proxy** — New capability that converts REST APIs into MCP tools. Could replace Lambda MCP servers with a more elegant path.
