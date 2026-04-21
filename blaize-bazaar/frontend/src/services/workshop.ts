/**
 * Workshop telemetry API client.
 *
 * Thin fetch wrapper around `POST /api/workshop/query`. Intentionally
 * separate from `services/chat.ts` (ConciergeModal's SSE path) because
 * the shapes don't overlap — workshop returns a flat
 * `{session_id, events: WorkshopEvent[]}` payload, chat streams SSE
 * frames carrying products and cart ops.
 *
 * The `events` contract matches the Coffee Roastery reference
 * (`conferences/2026-postgresconf-agentic-ai/static/index.html`
 * playEvents()). The panel renderer ports 1:1 — no transformation.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

export type WorkshopEventType = 'plan' | 'step' | 'panel' | 'response'

export interface WorkshopPlanEvent {
  type: 'plan'
  title: string
  steps: string[]
  duration_ms: number
  ts_ms: number
}

export interface WorkshopStepEvent {
  type: 'step'
  index: number
  state: 'active' | 'done'
  ts_ms: number
}

export interface WorkshopPanelEvent {
  type: 'panel'
  agent: string
  tag: string
  tag_class: 'cyan' | 'amber' | 'green'
  title: string
  sql: string
  columns: string[]
  rows: string[][]
  meta: string
  duration_ms: number
  ts_ms: number
}

export interface WorkshopCitation {
  k: string
  ref: string
}

export interface WorkshopResponseEvent {
  type: 'response'
  text: string
  citations: WorkshopCitation[]
  confidence: number | null
  ts_ms: number
}

export type WorkshopEvent =
  | WorkshopPlanEvent
  | WorkshopStepEvent
  | WorkshopPanelEvent
  | WorkshopResponseEvent

export interface WorkshopQueryRequest {
  query: string
  session_id?: string | null
  customer_id?: string | null
}

export interface WorkshopQueryResponse {
  session_id: string
  events: WorkshopEvent[]
}

export async function queryWorkshop(
  req: WorkshopQueryRequest,
): Promise<WorkshopQueryResponse> {
  const res = await fetch(`${API_BASE_URL}/api/workshop/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: req.query,
      session_id: req.session_id ?? null,
      customer_id: req.customer_id ?? null,
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`workshop query failed (${res.status}): ${body || res.statusText}`)
  }
  return (await res.json()) as WorkshopQueryResponse
}
