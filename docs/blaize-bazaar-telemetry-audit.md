# Blaize Bazaar `/workshop` — Telemetry Discovery Audit

**Audience:** PostgresConf Builders Session (DAT406) authors
**Prepared:** 2026-04-20
**Scope:** Read-only discovery. No code changes. No migrations. No services started.
**Target delivery:** 8-week build window, kickoff 2026-04-20.

**Teaching narrative — the anchor for every call in this document:**
> **Use AgentCore for solved primitives. Use Aurora for domain state you own.**

This audit treats that sentence as a constraint, not a slogan. Every build-vs-buy call below is tested against it. A decision is "good" when the pedagogical mental model stays clean — attendees leave knowing when to reach for managed AWS AI primitives and when to reach for Postgres.

---

## Executive Summary

**The foundational finding.** AgentCore is GA in 9 regions as of 2026-04-20 (incl. us-west-2, us-east-1, eu-west-1) with a full managed-primitive stack: Memory, Gateway, Runtime, Observability, Identity — plus 4 others not in narrative scope (Policy, Evaluations, Code Interpreter, Browser). Every component has concrete pricing, a stable API, and a Python SDK. The "buy" side of build-vs-buy is real and ready. Source: https://aws.amazon.com/bedrock/agentcore/faqs/.

**The codebase reality.** The backend has shipped implementations for Challenges 4-8 (Orchestrator, Runtime wiring, Memory, Gateway, OTEL) — all with explicit `CHALLENGE N: START/END` markers that the workshop will reset to stubs. The frontend ships `AgentReasoningTraces` and `IndexPerformanceDashboard` on `/workshop` today, and has four more fully-built panels (`MemoryDashboard`, `ObservabilityPanel`, `RuntimeStatusPanel`, `GatewayToolsPanel`) sitting in `components/` **unmounted**. Wiring those four is the highest-leverage frontend work on this project — the code exists, the components are done, but the `/workshop` route never imports them.

**The "12 cards" framing is a parent-audit construct, not a codebase constant.** There is no `12` anywhere in the frontend. The closest real number is 6 telemetry surfaces: the 2 currently live (`AgentReasoningTraces`, `IndexPerformanceDashboard`) plus the 4 unmounted (`MemoryDashboard`, `ObservabilityPanel`, `RuntimeStatusPanel`, `GatewayToolsPanel`). The other 6 cards from the original PostgresConf Coffee Roastery mockup (cost-per-query, session replay, evaluation scorecard, guardrail hit rate, identity/auth status, tool-registry-teaching) are **not yet scaffolded** in Blaize Bazaar and are the bulk of the 8-week build.

**The teaching opportunity in Module 3.** Today's Module 3 spec instructs attendees to build a pgvector-backed Tool Registry over `tools.description_emb`. That pattern is now commoditized by AgentCore Gateway — which does semantic tool discovery, OAuth/SigV4 outbound auth, Cedar policy, and tool indexing for $0.005/1k invocations (https://aws.amazon.com/bedrock/agentcore/pricing/). The build-vs-buy reframe is: **keep the Aurora Tool Registry as a deliberate teaching moment labeled `AURORA-teaching`**, and flank it with a Gateway panel that shows the managed equivalent side-by-side. That single juxtaposition is the most pedagogically dense surface in the whole session.

**The biggest technical risks (Section 9 has the full list).** (1) `otel_trace_extractor.py:69-72` silently falls through to a keyword-inference fallback when Strands' tracer provider isn't SDK-backed — meaning the waterfall view can look "working" with zero real spans. (2) Three Lambda MCP deploy scripts reference a non-existent column `product_description_embeddings` and will fail at deployment. (3) `aurora_session_manager.py` is documented as "Active" in `docs/ServiceAudit_Full.md:33` but the file has been deleted from the repo — two doc files are stale. (4) `BEDROCK_GUARDRAIL_ID` is read via raw `os.environ` at `guardrails.py:19` and is not part of the Pydantic `Settings` schema. (5) Challenge 9 (`frontend/src/utils/agentIdentity.ts`) is a TODO stub — `resolveAgentType` always returns `'orchestrator'`, collapsing all 6 agent identities into one.

---

## Section 1 — AgentCore Capabilities Baseline

This section establishes the "buy" side for every downstream recommendation. Every factual claim cites a 2026-04-20 source. Open questions are called out inline as `OPEN:` and consolidated in Section 9.

### 1.1 Memory (short-term + long-term)

**What it does.** Managed conversation-context store with two tiers: short-term (turn-by-turn within a session) and long-term (cross-session extracted insights via semantic search). Three strategy modes: built-in fully managed, built-in with prompt overrides, and self-managed.
Sources: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory.html, https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory-strategies.html

**Primitives.**
- Control: `CreateMemory`, `UpdateMemory`, `DeleteMemory`, `GetMemory`, `ListMemories`, `Start/ListMemoryExtractionJobs`
- Data plane: `CreateEvent`, `RetrieveMemoryRecords`, `ListMemoryRecords`, `GetMemoryRecord`, `BatchCreate/Update/DeleteMemoryRecords`
- SDK: `from bedrock_agentcore.memory import MemorySessionManager` with `add_turns()`, `search_long_term_memories(query, namespace_prefix, top_k)`, `get_last_k_turns(k)`

**Key constraints.**
- `CreateEvent`: payload max 100 items; metadata max 15 KV pairs; sessionId max 100 chars; memoryId pattern `[a-zA-Z][a-zA-Z0-9-_]{0,99}-[a-zA-Z0-9]{10}`. Source: https://docs.aws.amazon.com/bedrock-agentcore/latest/APIReference/API_CreateEvent.html
- `RetrieveMemoryRecords`: maxResults 1-100 (default 20); namespace max 1024 chars. Source: https://docs.aws.amazon.com/bedrock-agentcore/latest/APIReference/API_RetrieveMemoryRecords.html
- Throttling attributes to customer's Bedrock model quotas — ingestion can **fail silently** if those quotas are exceeded. Requires `memoryExecutionRoleArn` for built-in strategies. Source: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/bedrock-capacity.html
- IAM condition keys: `bedrock-agentcore:actorId`, `namespace`, `sessionId`, `strategyId`.

**Pricing.** STM events: $0.25/1k. LTM built-in storage: $0.75/1k records/month. LTM self-managed: $0.25/1k records/month. LTM retrieval: $0.50/1k retrievals.
Source: https://aws.amazon.com/bedrock/agentcore/pricing/

**Where it falls short.** Semantic search only — no SQL-style relational queries over memory. Vectors are opaque (not exportable to pgvector). No CDC / pub-sub — callers must poll. Built-in strategy schemas are fixed. `OPEN:` per-item payload byte limit, max retention window, data-plane TPS quota.

### 1.2 Gateway (tool discovery + execution)

**What it does.** Converts OpenAPI/Smithy/Lambda into MCP-compatible tools behind a single endpoint. Handles semantic tool selection, ingress auth (SigV4/OAuth2/API-key), outbound token refresh to third-party APIs, and integrates with Cedar-based Policy for per-call authorization.
Source: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html

**Primitives.** Control: `CreateGateway`, `CreateGatewayTarget`, `SynchronizeGatewayTargets` (rebuilds semantic index). Data plane: `InvokeGateway` (MCP protocol). Pre-integrated SaaS targets: Salesforce, Slack, Jira, Asana, Zendesk. Supported input schemas: OpenAPI, Smithy, Lambda. Auth: SigV4, OAuth 2.0, API keys.

**Pricing.** API invocations (ListTools/InvokeTool/Ping): $0.005/1k. Search invocations: $0.025/1k. Tool indexing: $0.02/100 tools/month.
Source: https://aws.amazon.com/bedrock/agentcore/pricing/

**Where it falls short.** No GraphQL or gRPC target types. Re-indexing on schema change is explicit (`SynchronizeGatewayTargets`). Cedar policy language has a learning curve. No client SDK — raw MCP over HTTP or framework adapter. `OPEN:` max tools per gateway, max payload size, published TPS.

### 1.3 Runtime (agent execution host)

**What it does.** Serverless, session-isolated agent execution. HTTP/WebSocket invocation. Zero-to-hundreds auto-scale. Supports sync and long-running async up to 8 hours.
Sources: https://aws.amazon.com/bedrock/agentcore/, https://aws.amazon.com/bedrock/agentcore/faqs/

**Primitives.** Control: `Create/Update/DeleteAgentRuntime`, `CreateAgentRuntimeEndpoint`. Data plane: `InvokeAgentRuntime`, `InvokeAgentRuntimeForUser`, WebSocket variants. CLI: `npm install -g @aws/agentcore` → `agentcore create`/`deploy`/`invoke`.

**Key constraints.** Payload max 100 MB; `runtimeSessionId` 33-256 chars; max session 8 hours; W3C trace context (`traceparent`, `tracestate`, `baggage`) propagated in headers.
Source: https://docs.aws.amazon.com/bedrock-agentcore/latest/APIReference/API_InvokeAgentRuntime.html

**Pricing.** $0.0895/vCPU-hr, $0.00945/GB-hr, 128 MB min memory billing, no charge during I/O wait.
Source: https://aws.amazon.com/bedrock/agentcore/pricing/

**Where it falls short.** No warm-pool option documented (cold-start sensitive apps need workarounds). No local emulator. 8-hour hard cap. `OPEN:` cold start figures, concurrent session ceiling, container size limits, VPC config mechanics.

### 1.4 Observability (traces, metrics, replay)

**What it does.** OTEL-compatible telemetry → CloudWatch. Automatic for Runtime-hosted agents; manual ADOT wrapper for external agents. Pre-built CloudWatch GenAI dashboard: tokens, latency, session duration, errors, tool timelines.
Sources: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html, https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability-get-started.html

**Integration for non-Runtime agents.**
```
AGENT_OBSERVABILITY_ENABLED=true
OTEL_PYTHON_DISTRO=aws_distro
OTEL_PYTHON_CONFIGURATOR=aws_configurator
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_EXPORTER_OTLP_LOGS_HEADERS=x-aws-log-group=<LG>,x-aws-log-stream=<LS>,x-aws-metric-namespace=<NS>
OTEL_RESOURCE_ATTRIBUTES=service.name=<AGENT_NAME>
opentelemetry-instrument python agent.py
```
One-time account setup for Transaction Search: `aws xray update-trace-segment-destination --destination CloudWatchLogs` + `update-indexing-rule`. ~10-minute delay before spans appear.

**Storage locations.**
- Runtime logs: `/aws/bedrock-agentcore/runtimes/<agent_id>-<endpoint_name>/runtime-logs`
- Trace spans: `/aws/spans/default` (via Transaction Search)
- Metrics: `bedrock-agentcore` CloudWatch namespace

**Pricing.** Standard CloudWatch rates — no AgentCore surcharge. 1% Transaction Search sampling is free.
Source: https://aws.amazon.com/bedrock/agentcore/pricing/

**Where it falls short.** No structured session replay (only timeline trace view). No native anomaly detection. Memory spans require explicit enablement. Non-Runtime agents have material manual setup; misconfigurations cause silent telemetry loss. `OPEN:` default log retention, replay feature status.

### 1.5 Identity (auth, session state)

**What it does.** Workload Identities (agents authenticate to AWS/third-party without static creds) + Token Vault (encrypted OAuth2/API key storage with 3LO flow support).
Sources: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/identity.html, https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/identity-overview.html

**Primitives.** `CreateWorkloadIdentity`, `GetWorkloadAccessToken` (opaque bearer token, max 131,072 chars), `GetWorkloadAccessTokenForJWT`, `CreateOauth2CredentialProvider`, `GetResourceOauth2Token`, `CompleteResourceTokenAuth` (3LO). Token Vault supports CMK via `SetTokenVaultCMK`. Documented IdP integrations: Okta, Entra ID, Cognito.

**JWT condition keys for Gateway inbound auth:** `bedrock-agentcore:InboundJwtClaim/iss|sub|aud|scope|client_id`.

**Pricing.** AWS-resource access: no charge. Non-AWS token/API-key fetches: $0.010/1k requests.
Source: https://aws.amazon.com/bedrock/agentcore/pricing/

**Where it falls short.** No documented PKCE or device flow. Token TTL undocumented. Identity does NOT hold business session state (cart, orders) — that stays in an application DB. SAML/proprietary IdPs need custom work. `OPEN:` token TTL, credential-provider rate limits, PKCE support.

### 1.6 Bedrock Guardrails (agent-flow integration)

**What it does.** Pre/post-turn safety evaluation over agent input and output. Six filter types: content, denied topics, word filters, sensitive info (PII), contextual grounding (RAG hallucination), automated reasoning (formal logic).
Sources: https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html, https://aws.amazon.com/bedrock/guardrails/

**Integration with agents.** Attach at `CreateAgent` / `UpdateAgent`:
```json
"guardrailConfiguration": {
  "guardrailIdentifier": "<id_or_arn>",
  "guardrailVersion": "<version>"
}
```
Or call `ApplyGuardrail` standalone (e.g., for RAG pre-generation). AgentCore is explicitly listed as a supported integration surface on the Guardrails product page.

**Pricing per 1k text units (1 TU = up to 1000 chars).** Content filters $0.15; denied topics $0.15; PII $0.10; contextual grounding $0.10; automated reasoning $0.17/policy; word filters free; regex-only PII free. **Costs stack** across filter types and evaluations (input + output = 2×/turn).
Source: https://aws.amazon.com/bedrock/pricing/

**Key constraints.** 100 guardrails/account; 30 topics/guardrail; 20 versions/guardrail; 10k words/policy; 25-200 TU/sec region-dependent. Does **not** evaluate reasoning content blocks (e.g., Claude extended thinking) — only final visible response. Classic tier: EN/FR/ES only, no cross-region inference.

**Where it falls short.** No streaming evaluation (adds per-turn latency). No behavioral guardrails (can't enforce max-N-tool-calls). Multilingual e-commerce hits the Classic tier language limit.

### 1.7 Cross-cutting security

Encryption at rest (DynamoDB/S3, CMK supported). TLS 1.2+. FIPS endpoints for US/GovCloud. VPC/PrivateLink supported. AWS states customer content is NOT used for model training.
Source: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/data-protection.html

---

## Section 2 — Module 3 Spec Review

Sources audited: `docs/Workshop-Structure-Revamped.md` (WSR), `docs/blaize-bazaar-workshop-structure.md` (BWS), `docs/blaize-bazaar-abstract.md` (ABS), `docs/ServiceAudit_Full.md` (SA).

### 2.1 Module 3 requirements, verbatim-extracted

| Challenge | Target | Spec refs |
|---|---|---|
| C5 — Runtime | Replace local Strands invocation with `run_agent_on_runtime` via `bedrock-agentcore` SDK. Feature flag `USE_AGENTCORE_RUNTIME`. Graviton/ARM64 container. Concurrency limits + timeout policies. Verify: "same queries work, runtime invocation metrics observable." | WSR:399-415, BWS:395-415 |
| C6 — STM Memory | `AgentCoreMemoryConfig` + `AgentCoreMemorySessionManager` from `bedrock_agentcore.memory.integrations.strands`. Namespace: `user:{user_id}:session:{session_id}` or `anon:{session_id}`. **Explicit prohibition:** do NOT use `aurora_session_manager.py` custom-table pattern. Verify: multi-turn recall ("what about the cheapest one?"). | WSR:418-473, BWS:417-473 |
| C7 — MCP Gateway | Wire AgentCore Gateway. Rate limiting per tool. Audit logging. 9 exact tool names: `search_products`, `get_trending_products`, `get_price_analysis`, `get_product_by_category`, `get_inventory_health`, `get_low_stock_products`, `restock_product`, `compare_products`, `get_return_policy`. | WSR:479-497, BWS:478-497 |
| C8 — Observability | Wire OTEL trace export. Span hierarchy: Orchestrator → Specialist → Tool → DB Query. Required attributes: `session.id`, `agent.name`, `tool.name`, `query.tokens`. Cost-per-query from token spans. CloudWatch X-Ray integration. Verify: Agent Reasoning Traces waterfall full execution. | WSR:499-519, BWS:499-519 |
| C9 — Agent Identity | File `frontend/src/utils/agentIdentity.ts`. 6 types: `orchestrator`, `search`, `inventory`, `pricing`, `recommendation`, `support`. `resolveAgentType()` priority: support > inventory > pricing > recommendation > search > orchestrator. | WSR:522-577, BWS:521-567 |

### 2.2 `/workshop` page spec (WSR:697-702, BWS:681-694)

- Instrumentation-only surface. **No storefront chrome.**
- Agent traces side panel driven by `agent-execution-complete` event.
- Index Performance Dashboard (HNSW vs seq-scan).
- Spec file map lists `MemoryDashboard`, `ObservabilityPanel`, `RuntimeStatusPanel`, `GatewayToolsPanel` as "pre-built." **These are NOT imported in the current `WorkshopPage.tsx`.** (See Section 7.)

### 2.3 Spec assumptions — flagged against Section 1 findings

| # | Spec assumption | Status against current AgentCore docs |
|---|---|---|
| SA-1 | `bedrock_agentcore.memory.integrations.strands` module is installable | OK — `agentcore_memory.py:307` imports it; SDK present in `.venv` |
| SA-2 | TracerProvider registered by Strands is SDK-based | **FRAGILE** — `otel_trace_extractor.py:69-72` checks `isinstance(provider, TracerProvider)` and silently degrades to keyword inference if not. Ordering of `StrandsTelemetry` setup matters. |
| SA-3 | `AGENTCORE_MEMORY_ID` pre-provisioned by bootstrap | OK — `agentcore_memory.py:71` has in-memory dict fallback |
| SA-4 | `AGENTCORE_RUNTIME_ENDPOINT` set | OK — `agentcore_runtime.py:139-144` falls back to in-process |
| SA-5 | `AGENTCORE_GATEWAY_URL` pre-provisioned | OK — `agentcore_gateway.py:114` returns None if unset |
| SA-6 | Aurora PG 17.5 + pgvector 0.8.0 available | OK — hardcoded in seed; `hnsw.iterative_scan` needs pgvector ≥0.7 |
| SA-7 | `OTEL_EXPORTER_OTLP_ENDPOINT` provisioned | **GAP** — `config.py:147` has no default; no bootstrap step documented. Section 1.4 requires this plus `x-aws-log-group` etc. headers in OTLP headers env var. Current code sets `OTEL_RESOURCE_ATTRIBUTES` only (`app.py:147-156`). |
| SA-8 | No Aurora session tables needed | OK — `seed-database.sh:266` comment confirms STM is managed by AgentCore Memory |
| SA-9 | Participants observe runtime invocation metrics | **UI GAP** — `OPEN:` where this surfaces. `RuntimeStatusPanel.tsx` exists (Section 7) but isn't mounted. |
| SA-10 | Strands propagates `trace_attributes` dict onto span attributes | `OPEN:` — `agentcore_runtime.py:81-87` sets session.id/user.id on the Agent object, but whether Strands copies them onto emitted spans is not verified in code |

### 2.4 Stale spec references (will mislead contributors)

- **`aurora_session_manager.py` listed as "Active"** in `docs/ServiceAudit_Full.md:33` — **file absent from `blaize-bazaar/backend/services/`** (Glob confirms). Deleted when STM migrated to AgentCore. SA doc must be updated or contributors will waste time searching.
- **`AIAssistant.tsx` referenced** in WSR:698 — file absent from frontend. Role fulfilled by `ConciergeModal.tsx` (`App.tsx:27`). Expected deletion; spec needs updating.

### 2.5 What the spec does NOT cover

- Where runtime invocation metrics surface (SA-9).
- OTLP endpoint provisioning (SA-7) including the AgentCore-specific `x-aws-log-group` header convention from Section 1.4.
- Bedrock Guardrails wiring — the spec does not mention Guardrails at all. The codebase has partial implementation (Section 6).
- Session replay (the docs do not describe it as a supported AgentCore feature either — OQ-12).
- Any of the 4 built-but-unmounted panels' intended screen placement within `/workshop`.

---

## Section 3 — OTEL + Trace Inventory

### 3.1 Span creation model — zero manual spans

No `tracer.start_as_current_span`, no `with tracer.start_span` anywhere. All spans are emitted automatically by the Strands SDK via `StrandsTelemetry`.

### 3.2 TracerProvider setup

| Location | file:line | Role |
|---|---|---|
| Lifespan startup | `blaize-bazaar/backend/app.py:108-169` | Calls `StrandsTelemetry()`, `setup_console_exporter()`, then conditionally `setup_otlp_exporter()` if `OTEL_EXPORTER_OTLP_ENDPOINT` is set |
| OTLP env prep | `app.py:147-156` | Sets `OTEL_SERVICE_NAME=blaize-bazaar`, `OTEL_RESOURCE_ATTRIBUTES=...deployment.environment=workshop` |
| In-memory capture | `app.py:161-164` | `init_span_capture()` |
| Capture implementation | `otel_trace_extractor.py:53-83` | `trace.get_tracer_provider()` → `SimpleSpanProcessor(InMemorySpanExporter)`; warns and sets `_span_exporter = None` if provider isn't SDK-based |

**Fragility — critical.** `otel_trace_extractor.py:69-72`: if Strands' provider isn't `TracerProvider`-typed, `_span_exporter` stays `None`. The downstream fallback (`infer_agent_from_query()`, lines 360-423) **builds fake agent steps from keyword heuristics** and returns `"otel_enabled": False, "inferred": True`. The UI can render convincingly without any real spans. This is a known attack surface for the workshop — attendees will think OTEL is working when it isn't.

### 3.3 Span inventory (Strands auto-emitted)

| Span name | When emitted | Attributes | Destination |
|---|---|---|---|
| `invoke_agent {agent_name}` | Per Strands `Agent.__call__` | `gen_ai.agent.name`, `gen_ai.usage.total_tokens`, `prompt_tokens`, `completion_tokens` | Console (always), OTLP (conditional), `InMemorySpanExporter` |
| `chat` | Per LLM invocation | `gen_ai.usage.total_tokens` | Same |
| `execute_event_loop_cycle` | Per event-loop cycle | `event_loop.cycle_id` | Same |
| `execute_tool {tool_name}` | Per `@tool` call | `gen_ai.tool.name` | Same |

`orchestrator.trace_attributes` dict (`agentcore_runtime.py:81-87`) sets `session.id`, `user.id`, `runtime`, `workshop` on the Agent object. `OPEN:` whether these propagate onto individual span attributes in the emitted OTLP spans.

### 3.4 Extraction pipeline

```
Strands SDK
  → SimpleSpanProcessor(InMemorySpanExporter)  [_span_exporter]
    → extract_trace()                          (agentcore_runtime.py:100)
    → extract_agent_execution_from_otel()      (chat.py:397-399; app.py:1329-1330)
    → get_waterfall_data()                     (app.py:1346-1347)
      → GET /api/traces/waterfall
        → AgentReasoningTraces.tsx (live)
        → InspectorPage.tsx (localStorage snapshot)
```

### 3.5 Persistence

- **No Aurora persistence.** Spans live in `InMemorySpanExporter`; cleared each read (`otel_trace_extractor.py:201-205`).
- **No S3 persistence.**
- Durable path: OTLP → CloudWatch X-Ray, requires `OTEL_EXPORTER_OTLP_ENDPOINT`.
- Section 1.4: AgentCore-hosted agents get this for free; external agents (current state) need ADOT env vars + Transaction Search enablement.

### 3.6 Duplicates, orphans, gaps

- **Specialist double-appearance (intentional):** once as `execute_tool` (orchestrator calling specialist-as-tool), once as `invoke_agent` (specialist's inner agent). Both classified `"specialist"` by `_classify_span()` at `otel_trace_extractor.py:86-113`. Docstring confirms.
- **Synthetic fallback spans (risk):** `infer_agent_from_query()` at `otel_trace_extractor.py:360-423` — keyword heuristics produce fake agent step dicts. See 3.2 fragility note.
- **Missing tracing:** `GET /api/search`, `POST /api/search/image`, all `/api/performance/*` endpoints emit zero spans. For the workshop's cost-per-query narrative, embedding calls and pgvector queries being untraced is a material gap.

---


## Section 4 — Build-vs-Buy Scorecard (The Centerpiece)

This is the pedagogical core of the workshop. Every recommendation maps onto one of five provenance labels attendees will see on the `/workshop` UI:

- **AGENTCORE** — use the managed primitive; the "buy" answer.
- **AURORA-domain** — genuine business state that belongs in Postgres (products, orders, inventory, return policies).
- **AURORA-teaching** — deliberately re-implemented in Postgres as a demystification exercise, even though a managed primitive exists. Flagged as teaching-only, never production advice.
- **HYBRID** — split between the two; the split is a design decision worth explaining.
- **OPEN** — under-specified; Section 9 lists what's needed to decide.

### 4.1 Concern-level scorecard

| Concern | AgentCore capability | Aurora alternative | Recommendation | Provenance | Rationale |
|---|---|---|---|---|---|
| **Short-term memory** (within-session turns) | Memory STM: `add_turns`, `get_last_k_turns`, $0.25/1k events | Custom `conversation_history` table | AGENTCORE | AGENTCORE | Spec explicitly prohibits the custom table (WSR:446). STM is a solved primitive; price is trivial at workshop scale. |
| **Long-term memory** (cross-session insights) | Memory LTM: `search_long_term_memories`, built-in extraction strategies, $0.75/1k records/month | pgvector over a custom `user_facts` table | AGENTCORE | AGENTCORE | Managed extraction + semantic retrieval is exactly the AgentCore value proposition. Attendees don't learn anything by re-building extraction pipelines. |
| **Tool discovery** (agent finds right tool) | Gateway: semantic tool search, $0.025/1k search invocations, `SynchronizeGatewayTargets` | pgvector over `tools.description_emb` | **AURORA-teaching** | AURORA-teaching | This is the Module 3 teaching moment. Building it in Aurora demystifies what Gateway does; labeling it honestly keeps us truthful about production. |
| **Tool execution** (MCP over HTTP) | Gateway: unified MCP endpoint, $0.005/1k invocations | Custom Python `@tool` registry | HYBRID | HYBRID | Today's code uses Python `@tool` decorators (`agent_tools.py`). Section 7 shows `GatewayToolsPanel.tsx` built but unmounted. Hybrid: keep `@tool` for local dev and spec-driven invocation; Gateway is the production target and deserves its own panel. |
| **Agent runtime host** | Runtime: serverless, 8hr sessions, 100MB payload, $0.0895/vCPU-hr | FastAPI + local Strands | AGENTCORE | AGENTCORE | `agentcore_runtime.py:120-193` already wraps this. `USE_AGENTCORE_RUNTIME` feature-flag preserves local-dev path. Spec (WSR:399-415) aligns. |
| **Trace collection** (span emission) | Observability: auto for Runtime agents; ADOT env vars for external | Manual OTEL + `StrandsTelemetry` | HYBRID | HYBRID | Current code is external ADOT path (`app.py:108-169`). When C5 (Runtime) ships, auto-trace kicks in. Teach both paths — "here's what you do if you're NOT on Runtime" is a legitimate external-observability story. |
| **Trace persistence** (durable trace store) | Observability: CloudWatch Logs `/aws/spans/default`, standard CW pricing | `agent_trace_spans` table, 24h TTL | AURORA-teaching | AURORA-teaching | CloudWatch is fine for durable traces, but a Postgres table with a JSONB `span_data` column + 24h TTL is a fantastic teaching surface for "what OTEL data actually looks like" + "how to expire data at scale." Workshop v1 decision per memory file. |
| **Trace replay** (turn-by-turn playback) | **Not documented** as a supported feature (OQ-12) | Replay endpoint over `agent_trace_spans` | AURORA-teaching | AURORA-teaching | Section 1.4: AgentCore Observability offers timeline view, not structured replay. Aurora gives us the primitive and demonstrably beats the managed service — a rare case where owning the state is strictly better. |
| **Guardrails** (content safety) | Bedrock Guardrails: attach to agent via `guardrailConfiguration`, $0.15/1k TU content filters | Prompt-suffix injection | AGENTCORE | AGENTCORE | `GuardrailsService` (`guardrails.py:15-146`) is already the Bedrock API path; only chat-loop wiring is missing (Section 6). Prompt injection is not a real guardrail and should not be taught as one. |
| **Identity / auth** (agent authN) | Identity: Workload Identities, Token Vault, $0.010/1k third-party token fetches | Cognito + app-managed session | AGENTCORE | AGENTCORE | Identity is the "buy" lane. Cognito stays as the *user* IdP; Identity handles the *agent* tokens. Not mutually exclusive. |
| **User session state** (cart, auth state) | Not covered by Identity | Postgres `users`/`sessions` tables + JWT | AURORA-domain | AURORA-domain | Section 1.5 calls out the distinction: Identity does NOT hold business session state. Cart contents and auth state are always app-owned. |
| **RAG retrieval** (product search) | Knowledge Bases (separate service, out of narrative) | pgvector HNSW over `product_catalog.embedding` | AURORA-domain | AURORA-domain | `product_catalog` is genuine domain state. pgvector + HNSW is the headline pedagogical story of the whole session. Never buy this for this workshop. |
| **Evaluation** (correctness, groundedness) | AgentCore Evaluations (separate component, out of 5-component scope) | Custom scorecard | OPEN | OPEN | Narrative scope is 5 components. Whether to bring Evaluations in as a 6th card is a decision the authors need to make. See Section 9. |

### 4.2 Provenance labels on the 12 telemetry cards

The parent narrative calls for 12 cards on `/workshop`. Section 7 confirms only 2 are live and 4 are built-but-unmounted. The remaining 6 are design targets. Assigning provenance to each:

| # | Card | Data source | Label | Status | Notes |
|---|---|---|---|---|---|
| 1 | Agent Reasoning Traces (waterfall) | `InMemorySpanExporter` → `/api/traces/waterfall` | HYBRID | LIVE | Current source in-memory; production adds Runtime auto-trace and CloudWatch |
| 2 | Index Performance Dashboard (HNSW vs seq-scan) | `/api/performance/*` | AURORA-domain | LIVE | pgvector is core Aurora teaching |
| 3 | Memory Dashboard | `/api/agentcore/memories` (`MemoryDashboard.tsx`) | AGENTCORE | BUILT, NOT MOUNTED | Mount in `WorkshopPage.tsx` |
| 4 | Observability Status | `/api/agentcore/observability/status` (`ObservabilityPanel.tsx`) | AGENTCORE | BUILT, NOT MOUNTED | Mount in `WorkshopPage.tsx` |
| 5 | Runtime Status | `/api/agentcore/runtime/status` (`RuntimeStatusPanel.tsx`) | AGENTCORE | BUILT, NOT MOUNTED | Closes the C5 UI gap (SA-9) |
| 6 | Gateway Tools | `/api/agentcore/gateway/tools` (`GatewayToolsPanel.tsx`) | AGENTCORE | BUILT, NOT MOUNTED | Pairs with card 7 for the build-vs-buy juxtaposition |
| 7 | Tool Registry (teaching) | pgvector over `tools.description_emb` | AURORA-teaching | **NOT BUILT** | Module 3 challenge — produces the `tools` table and the registry lookup. Must visually label "teaching moment — production uses Gateway" |
| 8 | Cost per Query | Token spans → computed $ | HYBRID | **NOT BUILT** | Tokens come from OTEL (hybrid source). Rate card lives in config. |
| 9 | Trace Replay (turn-by-turn) | `agent_trace_spans` table | AURORA-teaching | **NOT BUILT** | Schema delta: new Postgres table. Not in current DB. |
| 10 | Guardrail Hit Rate | `guardrail_events` table or Bedrock Guardrails CloudWatch | HYBRID | **NOT BUILT** | OPEN: storage location (see Section 6) |
| 11 | Identity/Auth Status | Cognito + Workload Identity summary | AGENTCORE | **NOT BUILT** | Read-only status panel; no Aurora state |
| 12 | Evaluation Scorecard | AgentCore Evaluations OR custom table | OPEN | **NOT BUILT** | Scope question for Section 9 |

**Summary counts.** AGENTCORE: 5. AURORA-domain: 2. AURORA-teaching: 3. HYBRID: 3. OPEN: 1 (card 12) + 1 concern (evaluation).

### 4.3 Why this distribution is pedagogically correct

- **Not "everything in AgentCore"** — cards 2, 7, 9 live in Aurora for real pedagogical reasons (pgvector, demystification, schema control).
- **Not "everything in Aurora"** — cards 3, 4, 5, 6, 11 are unapologetically AgentCore. Attendees must leave knowing when the managed path wins.
- **The teaching cards are the bridges.** Card 7 (Tool Registry) sits next to Card 6 (Gateway Tools) — same concern, two implementations, honest labels. Card 9 (Trace Replay) sits next to Card 4 (Observability Status) for the same pairing.
- **Single narrative through-line.** Every card answers: "is this my domain problem, or a solved primitive?" That question is the whole workshop.

---


## Section 5 — Postgres Schema State

### 5.1 Migration mechanism

**No Alembic.** Schema is owned by shell scripts and Python loaders:
- `scripts/seed-database.sh` — primary DDL (shell script with embedded SQL).
- `scripts/load-database-rds-api.py:86` — duplicate DDL for RDS Data API path.
- `scripts/load_catalog.py:398` — duplicate DDL for direct-load path.
- `catalog-legacy-backup-20260419.sql` — `pg_dump` of live schema (PG 17.7 source, pg_dump 17.5).

### 5.2 Current tables

| Table | Schema | Key columns | Evidence |
|---|---|---|---|
| `product_catalog` | `blaize_bazaar` | `"productId" CHAR(10) PK NOT NULL`, `product_description VARCHAR(500)`, `"imgUrl" VARCHAR(200)`, `"productURL" VARCHAR(40)`, `stars NUMERIC(2,1)`, `reviews INT`, `price NUMERIC(8,2)`, `category_id SMALLINT`, `"isBestSeller" BOOL`, `"boughtInLastMonth" INT`, `category_name VARCHAR(50)`, `quantity SMALLINT`, `embedding vector(1024)` | `catalog-legacy-backup-20260419.sql:28-48`; `seed-database.sh:77` |
| `return_policies` | `blaize_bazaar` | `category_name VARCHAR(50) PK`, `return_window_days INT`, `conditions TEXT`, `refund_method TEXT` | `seed-database.sh:229-264`; 25 rows |

**Vector details.** `embedding public.vector(1024)` — Cohere Embed v4. HNSW index pre-built. `SET hnsw.iterative_scan = 'relaxed_order'` applied per-connection at `database.py:23-35` and re-asserted at `database.py:231`. Startup verification at `database.py:155-182`.

### 5.3 Current / needed / delta

| Table | Current | Needed (by card) | Delta |
|---|---|---|---|
| `product_catalog` | EXISTS | Card 2 (pgvector), RAG | — |
| `return_policies` | EXISTS | Used by `get_return_policy` tool | — |
| `agent_trace_spans` | **MISSING** | Card 9 (Trace Replay) | CREATE: `(trace_id UUID, span_id UUID, parent_span_id UUID, span_name TEXT, started_at TIMESTAMPTZ, ended_at TIMESTAMPTZ, attributes JSONB, session_id TEXT, created_at TIMESTAMPTZ DEFAULT now())` + `pg_cron` 24h cleanup |
| `tools` (with `description_emb vector(1024)`) | **MISSING** | Card 7 (Tool Registry teaching) | CREATE: `(tool_id TEXT PK, name TEXT, description TEXT, description_emb vector(1024), schema JSONB)` + HNSW index |
| `guardrail_events` | **MISSING** | Card 10 (Guardrail Hit Rate) | CREATE if/when Aurora-sourced; or skip if CloudWatch-sourced (Section 6, Section 9) |
| `conversation_history` / `sessions` | ABSENT (deliberately) | — | **Leave absent.** Spec explicitly prohibits reviving. `seed-database.sh:266` comment: "Session management is handled by AgentCore Memory (STM) — no Aurora session tables needed." |

### 5.4 Deploy script schema divergence (broken code path)

`scripts/deploy/blaize_pricing_server.py:91`, `blaize_search_server.py:102`, `blaize_recommend_server.py:95` reference column **`product_description_embeddings`**. Real column is **`embedding`**. These three Lambda MCP server scripts will fail against the actual Aurora schema. Fix is trivial (rename) but must happen before Module 3 ships or the Gateway path is broken.

---

## Section 6 — Bedrock Guardrails State

### 6.1 What's in code

| Location | file:line | What it does |
|---|---|---|
| `GuardrailsService` | `guardrails.py:15-146` | Full `check_input()` / `check_output()` via `bedrock-runtime.apply_guardrail`; regex `detect_pii()`; pass-through when `BEDROCK_GUARDRAIL_ID` unset |
| `GUARDRAILS_PROMPT_SUFFIX` | `orchestrator.py:48-56` | Prompt-injection content rules |
| `create_guarded_orchestrator()` | `orchestrator.py:59-77` | Appends the suffix — NOT a real Bedrock call |
| Chat flag propagation | `chat.py:321-322` | `if guardrails_enabled: orchestrator = create_guarded_orchestrator()` |
| Request params | `app.py:740,773` | Boolean from chat body |
| Demo endpoint | `app.py:1378-1386` | `POST /api/guardrails/check` directly calls `GuardrailsService` |

### 6.2 What's NOT wired

`GuardrailsService.check_input()` / `check_output()` — the actual Bedrock Guardrails API calls — are **not called in the agent turn**. The production flow uses only prompt-suffix injection, which Section 1.6 shows is not equivalent to a real guardrail (no pre/post evaluation, no CloudWatch telemetry, no content classification).

### 6.3 Nearest integration point

`services/chat.py` around the orchestrator invocation (~lines 320-400):
- Pre-turn: `guardrails_svc.check_input(message)` before `orchestrator(message)`.
- Post-turn: `guardrails_svc.check_output(str(response))` after the response.
- Error path: on block, return the family-friendly message and emit a guardrail event.

### 6.4 Config gap

`BEDROCK_GUARDRAIL_ID` is read via `os.environ.get("BEDROCK_GUARDRAIL_ID", "")` at `guardrails.py:19`. It is NOT declared in the Pydantic `Settings` class in `config.py`. Consequence: no `.env` auto-population, no validation, no presence in settings schema. Fix: add to `Settings`.

### 6.5 Card 10 (Guardrail Hit Rate) data source

Two candidates, listed as an OPEN question in Section 9:
- CloudWatch-sourced (from the Bedrock Guardrails metrics published per evaluation).
- Aurora-sourced `guardrail_events` table populated at the chat.py wiring point.

Preference (not a final call — authors must decide): CloudWatch is the "bought" answer. An Aurora table duplicates state and only adds value if we want a teaching-labeled replay surface for blocked prompts. If the workshop time budget is tight, start with CloudWatch and skip the table.

---

## Section 7 — Frontend `/workshop` State

### 7.1 Route wiring

`blaize-bazaar/frontend/src/App.tsx:126` — `<Route path="/workshop" element={<WorkshopPage />} />`
`App.tsx:127` — `<Route path="/inspector" element={<InspectorPage />} />`. Both wrapped in `AuthGate` (`App.tsx:61-87`): pass-through if no Cognito env; gated if configured.

### 7.2 Live surfaces on `/workshop`

| Surface | file:line | Data source | Status |
|---|---|---|---|
| "Agent traces" section + trigger button | `pages/WorkshopPage.tsx:57-83` | Opens `AgentReasoningTraces` side panel | SHIPPED |
| "pgvector index benchmarks" section + trigger | `WorkshopPage.tsx:85-110` | Opens `IndexPerformanceDashboard` modal | SHIPPED |
| `AgentReasoningTraces` panel | `components/AgentReasoningTraces.tsx` | `agent-execution-complete` event + `WaterfallSpan[]` from SSE | SHIPPED — simulated when OTEL disabled |
| `IndexPerformanceDashboard` modal | `components/IndexPerformanceDashboard.tsx` | `/api/performance/*` | SHIPPED |

### 7.3 Built-but-unmounted panels (the highest-leverage gap)

All four are fully implemented modal overlays. None are imported or rendered anywhere in the route tree.

| Panel | file | API called | Hooked into `/workshop`? |
|---|---|---|---|
| `MemoryDashboard` | `components/MemoryDashboard.tsx` | `GET /api/agentcore/memories` (with Authorization header) | NO |
| `ObservabilityPanel` | `components/ObservabilityPanel.tsx` | `GET /api/agentcore/observability/status` | NO |
| `RuntimeStatusPanel` | `components/RuntimeStatusPanel.tsx` | `GET /api/agentcore/runtime/status` | NO |
| `GatewayToolsPanel` | `components/GatewayToolsPanel.tsx` | `GET /api/agentcore/gateway/tools` | NO |

**Implication.** Cards 3-6 of the 12-card plan are "free" in implementation terms — add four imports and four section blocks to `WorkshopPage.tsx`, and provenance-label them AGENTCORE. This is probably the first concrete coding task after the audit.

### 7.4 "12 cards" doesn't exist in code

Grepping the frontend for "12" or "twelve" in a telemetry context: no matches. The 12-card framing comes from the external mockup (the Coffee Roastery one), not from Blaize Bazaar source. The audit has operationalized it in Section 4.2's provenance table.

### 7.5 Challenge 9 (agent identity) is a TODO stub

`frontend/src/utils/agentIdentity.ts:18-43`:
- `AGENT_IDENTITIES` has all visual fields as empty strings (`gradient: ''`, etc.) at lines 31-37.
- `resolveAgentType(_agentName)` always returns `'orchestrator'` at lines 39-42.
- `// === CHALLENGE 9: START/END ===` markers present.

Consequence: `AgentReasoningTraces.tsx:138` falls back to a default gray gradient for every agent. `InspectorPage.tsx:44-48` renders all agents with orchestrator styling. The 6-agent visual identity intent is entirely dormant.

### 7.6 Deletions (expected, don't re-flag)

`AIAssistant.tsx` and `ImageSearchModal.tsx` are absent from `blaize-bazaar/frontend/src/components/`. `ConciergeModal.tsx` (`App.tsx:27`) replaces the chat UI. Spec WSR:698 references the old `AIAssistant.tsx` — spec doc drift; not a code problem.

---

## Section 8 — Workshop Time Budget + Module 3 Reframing

PostgresConf builder sessions are typically 90-180 minutes. A common allocation for a 4-module session:

| Module | Focus | Proposed time |
|---|---|---|
| 1 | Setup + Storefront tour | 20 min |
| 2 | pgvector + hybrid search | 30 min |
| 3 | **Build-vs-buy: AgentCore vs Aurora** | **35 min** |
| 4 | Observability walkthrough + close | 25 min |

### Module 3 reframe — from "Tool Registry in pgvector" to "Tool Registry as teaching moment"

**Old framing** (from spec): "Build a tool registry in Postgres using pgvector over `tools.description_emb`."
**Problem with that framing today (Section 1.2):** AgentCore Gateway is GA and does exactly this for $0.005/1k invocations, with semantic tool selection + Cedar policy + OAuth/SigV4 outbound auth included. Teaching only the Aurora build implicitly claims it's a production recommendation — which is wrong.

**New framing.** Module 3 narrates both:

1. **"Here's what Gateway does for you."** 3-minute demo: open `GatewayToolsPanel` (Card 6), show tool discovery, invocation, indexing status. Honest about what's managed: semantic index, auth, rate limiting, audit log.
2. **"Here's what it looks like if you had to build it."** 20-minute hands-on: attendees scaffold the `tools` table with `description_emb vector(1024)`, create an HNSW index, implement `find_tool(query)` as a pgvector nearest-neighbor. Wire it into a demo endpoint. This is Card 7 (AURORA-teaching).
3. **"Now the juxtaposition."** 5-minute wrap: side-by-side the two panels on `/workshop`. Discuss: what changes when you own the state? (indexing cadence, schema evolution, cost profile, debuggability). What do you give up? (managed auth, SaaS integrations, no-ops for drift).
4. **"How do you know which lane to choose?"** 7-minute framework: the choice rule = "is this my domain problem, or a solved primitive?" Walk through 3-4 sample concerns from Section 4.1 as practice.

**Key guardrail for the reframe.** Card 7's visual provenance must be AURORA-teaching, not plain AURORA. If the label reads identical to Card 2 (AURORA-domain pgvector), attendees will generalize the wrong rule and start putting solved primitives in Postgres in production. The label is the whole lesson.

---


## Section 9 — Open Questions

Consolidated list of every `OPEN:` marker dropped above, with what would resolve each and what's blocked until then.

### 9.1 AgentCore capability gaps (undocumented quotas/limits)

| # | Question | Resolver | What's blocked |
|---|---|---|---|
| OQ-1 | Memory `CreateEvent` per-item payload byte limit | File AWS support ticket; or inspect SDK source for client-side validation | Sizing the STM path for long multi-turn reasoning transcripts. |
| OQ-2 | Memory LTM maximum retention duration | AWS support ticket; read Service Quotas | Cost projection and a "this is permanent" claim in teaching content. |
| OQ-3 | Memory data-plane TPS quota (`CreateEvent`, `RetrieveMemoryRecords`) | AWS Service Quotas console | Demo-day load planning for live attendee demos. |
| OQ-4 | Gateway max tools per Gateway or GatewayTarget | Docs gap; AWS support | Card 6's "how many tools can you register" narrative. |
| OQ-5 | Gateway `InvokeGateway` max payload | Docs gap | Request-size sanity check for Module 3. |
| OQ-6 | Gateway per-account TPS quota | Service Quotas | Live-demo safety. |
| OQ-7 | Runtime cold-start latency | Empirical benchmark on a real deploy | Claims about "zero-to-hundreds" auto-scale in narrative. |
| OQ-8 | Runtime concurrent-session hard ceiling | AWS support or load test | Capacity planning for workshop cohort size (~200 attendees). |
| OQ-9 | Runtime container image size ceiling | Docs or support | Packaging decision for the final C5 container. |
| OQ-10 | Runtime VPC injection mechanics | Docs | Whether the demo Runtime needs VPC access to Aurora (probably yes). |
| OQ-11 | CloudWatch default log retention for AgentCore log groups | Console inspection on a deployed runtime | Cost projection for Card 1. |
| OQ-12 | Is structured session replay a supported Observability feature? | Docs gap — currently not found | Card 9 framing. If replay is managed, Card 9's AURORA-teaching label becomes AURORA-teaching-only; if not, Aurora is strictly necessary for the feature. |
| OQ-13 | Identity workload access token TTL | AWS support; or experiment | Card 11 refresh story. |
| OQ-14 | Identity `GetWorkloadAccessToken` rate limits | Service Quotas | Not blocking today. |
| OQ-15 | Identity PKCE / device-flow OAuth support | Docs gap | Not blocking; default to client credentials. |

### 9.2 Blaize Bazaar code / spec ambiguities

| # | Question | Resolver | What's blocked |
|---|---|---|---|
| OQ-16 | Does Strands propagate `orchestrator.trace_attributes` dict values onto OTLP span attributes? | Read Strands source or enable OTLP and inspect a real span in CloudWatch | Spec assertion SA-10 (Section 2.3) that `session.id` appears on spans. Section 3.3 open item. |
| OQ-17 | Where do C5 "runtime invocation metrics" surface in UI? | Author decision + screen placement | SA-9 in Section 2.3. Likely answer: `RuntimeStatusPanel.tsx` mounted in `/workshop`. |
| OQ-18 | Card 10 (Guardrail Hit Rate) data source — CloudWatch or Aurora `guardrail_events`? | Author decision | Section 6.5. Also drives whether any new Aurora table is needed. |
| OQ-19 | Card 12 (Evaluation Scorecard) — include AgentCore Evaluations as a 6th narrative component, build Aurora-teaching version, or drop? | Author decision; narrative-scope call | Whether there are 11 or 12 cards, and whether "5 AgentCore components" becomes 6. |
| OQ-20 | `AIAssistant.tsx` reference in WSR:698 — update spec or restore concept? | Spec doc update (low-effort) | Spec doc drift; not a code change. |
| OQ-21 | `docs/ServiceAudit_Full.md:33` claims `aurora_session_manager.py` is "Active" but file is deleted. Update SA doc? | Spec doc update | Spec doc drift; mild contributor-confusion risk. |
| OQ-22 | Three Lambda MCP server scripts reference column `product_description_embeddings` (doesn't exist; real column is `embedding`). Rename or align schema? | Trivial code fix; not in scope for this audit | Lambda MCP deploy path is currently broken. Blocks any demo that uses Lambda-backed Gateway targets. |
| OQ-23 | `BEDROCK_GUARDRAIL_ID` not in Pydantic `Settings` | Trivial code fix | Hidden config pitfall for attendees. |
| OQ-24 | `_span_exporter = None` silent-fallback to keyword inference (`otel_trace_extractor.py:69-72, 360-423`) | Author decision: surface an explicit error instead of inferring; or keep the fallback but badge the UI clearly | **High-impact risk.** Workshop can appear to "work" with zero real OTEL. Recommend failing loud. |

### 9.3 Narrative-scope decisions

| # | Question | Resolver | What's blocked |
|---|---|---|---|
| OQ-25 | Session replay (Card 9) — commit to the Aurora-backed build, or drop the card if AgentCore Observability gains replay by workshop date? | Re-check AgentCore Observability docs in mid-May; decide late | Aurora migration for `agent_trace_spans` + replay endpoint work. |
| OQ-26 | Does the workshop need to demonstrate Bedrock Guardrails end-to-end (Section 6 wiring + CloudWatch evidence), or just wire the code? | Author decision + 25-minute time budget for Module 4 | Guardrails is currently a prompt-injection, which is pedagogically misleading if left unwired. |
| OQ-27 | What's the final region for the workshop's Bedrock account? Affects Guardrails tier availability (Section 1.6), Memory region coupling, Runtime cold-start. | AWS account owner | Cross-region-inference pitfalls, Guardrail Classic/Standard choice. |

---

## Appendix A — Decision rule for future audits

When a new telemetry concern appears, apply in order:

1. **Is it genuine business state?** (products, orders, inventory, cart) → `AURORA-domain`.
2. **Does AgentCore provide it as a primitive?** → `AGENTCORE` unless pedagogical reason overrides.
3. **Is re-implementing it in Aurora a clear teaching moment that won't confuse attendees about production patterns?** → `AURORA-teaching` with explicit UI labeling.
4. **Does it split cleanly?** → `HYBRID` with the split documented.
5. **Otherwise** → `OPEN`, land in Section 9, don't guess.

## Appendix B — Sources and dates

All AgentCore sources accessed 2026-04-20. Full list in `/tmp/agentcore-research.md` (27 cited URLs). All code references cite `file:line` against the working tree at `/Users/shayons/Desktop/Workshops/sample-blaize-bazaar-agentic-search-apg` on 2026-04-20. The parallel code audit is archived at `/tmp/blaize-code-audit.md`.

