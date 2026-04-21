/**
 * WorkshopTelemetry — replays the WorkshopEvent stream for the /workshop
 * telemetry tab.
 *
 * Mirrors the Coffee Roastery playEvents() / renderPanel() / renderPlan()
 * helpers with the same animation beats:
 *   - Plan slides in first, steps in `queued` state.
 *   - step events tick individual rows queued → active → done.
 *   - panel events fade in per-panel, rows reveal with a staggered delay.
 *   - response event is handled by the parent (rendered in WorkshopChat).
 *
 * Palette uses placeholder cyan (#0891b2) per Week 1 plan. Final boutique
 * palette integration is deferred to Week 7. `tag_class` values map:
 *   cyan  → data op (pgvector, Gateway, Memory)
 *   amber → LLM / Guardrail
 *   green → grounding / success
 */
import { useMemo } from 'react'
import type {
  WorkshopEvent,
  WorkshopPanelEvent,
  WorkshopPlanEvent,
  WorkshopStepEvent,
} from '../services/workshop'

const INK = '#2d1810'
const INK_SOFT = '#6b4a35'
const INK_QUIET = '#a68668'
const CREAM = '#fbf4e8'
const CREAM_WARM = '#f5e8d3'

// Week 1 placeholder palette — full boutique integration lands Week 7.
const TAG_COLORS: Record<'cyan' | 'amber' | 'green', { bg: string; border: string; fg: string }> = {
  cyan: { bg: '#e0f2fe', border: '#7dd3fc', fg: '#0369a1' },
  amber: { bg: '#fef3c7', border: '#fcd34d', fg: '#b45309' },
  green: { bg: '#ecfdf5', border: '#86efac', fg: '#047857' },
}

const SQL_KEYWORDS =
  /\b(SELECT|FROM|WHERE|AND|OR|ORDER BY|LIMIT|JOIN|LEFT|INNER|ON|AS|GROUP BY|DESC|ASC|INSERT|INTO|VALUES|UPDATE|SET|RETURNING|WITH|BEGIN|COMMIT|CREATE|TABLE|INDEX|USING|EXTENSION|PRIMARY|KEY|NOT|NULL|DEFAULT|TRUE|FALSE|ANY|IN|COUNT|MAX|MIN|SUM|AVG)\b/g

/**
 * SQL syntax highlighter. Ports Coffee Roastery's kwify() with sentinel
 * tokens so keyword matches don't clash with HTML escaping. Output is
 * injected via dangerouslySetInnerHTML on a <pre> with no user content
 * (SQL comes from AgentContext emitters, not user input).
 */
function kwify(sql: string): string {
  let s = sql
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  s = s.replace(/--[^\n]*/g, (m) => `\u0001${m}\u0002`)
  s = s.replace(/'[^']*'/g, (m) => `\u0003${m}\u0004`)
  s = s.replace(/\$\d+/g, (m) => `\u0003${m}\u0004`)
  s = s.replace(SQL_KEYWORDS, '\u0005$1\u0006')
  s = s.replace(/(&lt;=&gt;|&lt;-&gt;|&lt;#&gt;)/g, '\u0007$1\u0008')
  s = s
    .replace(/\u0001/g, '<span style="color:#a68668;font-style:italic">')
    .replace(/\u0002/g, '</span>')
    .replace(/\u0003/g, '<span style="color:#b45309">')
    .replace(/\u0004/g, '</span>')
    .replace(/\u0005/g, '<span style="color:#2d1810;font-weight:600">')
    .replace(/\u0006/g, '</span>')
    .replace(/\u0007/g, '<span style="color:#6b4a35;font-weight:600">')
    .replace(/\u0008/g, '</span>')
  return s
}

function PanelCard({ ev }: { ev: WorkshopPanelEvent }) {
  const colors = TAG_COLORS[ev.tag_class] || TAG_COLORS.cyan
  return (
    <div
      className="rounded-xl overflow-hidden animate-[fadeSlide_0.32s_ease-out]"
      style={{ background: 'rgba(255,255,255,0.7)', border: `1px solid ${INK_QUIET}30` }}
    >
      <div
        className="flex items-center gap-2.5 px-3.5 py-2.5"
        style={{ borderBottom: `1px solid ${INK_QUIET}20`, background: CREAM_WARM }}
      >
        <span
          className="font-mono text-[9.5px] font-semibold tracking-[2px] uppercase px-2 py-0.5 rounded whitespace-nowrap"
          style={{ color: colors.fg, border: `1px solid ${colors.border}`, background: colors.bg }}
        >
          {ev.tag}
        </span>
        <span className="flex-1 text-[14px] font-semibold" style={{ color: INK }}>
          {ev.title}
        </span>
        {ev.duration_ms > 0 && (
          <span className="font-mono text-[10.5px]" style={{ color: INK_QUIET }}>
            {ev.duration_ms}ms
          </span>
        )}
      </div>
      <div className="px-3.5 py-3">
        {ev.sql && (
          <pre
            className="font-mono text-[13px] leading-[1.55] p-2.5 rounded-md overflow-x-auto whitespace-pre-wrap break-words"
            style={{ background: CREAM_WARM, border: `1px solid ${INK_QUIET}20`, color: INK }}
            dangerouslySetInnerHTML={{ __html: kwify(ev.sql) }}
          />
        )}
        {ev.columns.length > 0 && (
          <div className="mt-2 font-mono text-[13px]">
            <div
              className="grid gap-3.5 py-1.5 text-[10px] uppercase tracking-[1px]"
              style={{
                gridTemplateColumns: `repeat(${ev.columns.length}, minmax(min-content, 1fr))`,
                color: INK_QUIET,
                borderBottom: `1px solid ${INK_QUIET}20`,
              }}
            >
              {ev.columns.map((c, i) => (
                <span key={i}>{c}</span>
              ))}
            </div>
            {ev.rows.map((row, rIdx) => (
              <div
                key={rIdx}
                className="grid gap-3.5 py-1.5 animate-[rowIn_0.22s_ease-out]"
                style={{
                  gridTemplateColumns: `repeat(${ev.columns.length}, minmax(min-content, 1fr))`,
                  borderBottom: rIdx === ev.rows.length - 1 ? 'none' : `1px dashed ${INK_QUIET}20`,
                  color: INK,
                  animationDelay: `${rIdx * 80}ms`,
                  animationFillMode: 'both',
                }}
              >
                {row.map((cell, cIdx) => (
                  <span key={cIdx} className="break-words overflow-wrap-anywhere">
                    {cell}
                  </span>
                ))}
              </div>
            ))}
            {ev.meta && (
              <div
                className="font-mono text-[10.5px] mt-2"
                style={{ color: INK_QUIET }}
                dangerouslySetInnerHTML={{ __html: ev.meta }}
              />
            )}
          </div>
        )}
        {!ev.columns.length && ev.meta && (
          <div
            className="font-mono text-[10.5px]"
            style={{ color: INK_QUIET }}
            dangerouslySetInnerHTML={{ __html: ev.meta }}
          />
        )}
      </div>
    </div>
  )
}

interface PlanState {
  event: WorkshopPlanEvent
  stepStates: Array<'queued' | 'active' | 'done'>
}

/**
 * Reduce the event list into render state. The replay is "already played"
 * by the time these events arrive (Week 1 returns the full trail at
 * end-of-turn), so step events are collapsed into their final state
 * against the matching plan.
 */
function usePlanReducer(events: WorkshopEvent[]): {
  plan: PlanState | null
  panels: WorkshopPanelEvent[]
} {
  return useMemo(() => {
    let plan: PlanState | null = null
    const panels: WorkshopPanelEvent[] = []
    for (const ev of events) {
      if (ev.type === 'plan') {
        plan = {
          event: ev,
          stepStates: ev.steps.map(() => 'queued'),
        }
      } else if (ev.type === 'step' && plan) {
        const stepEv = ev as WorkshopStepEvent
        if (stepEv.index >= 0 && stepEv.index < plan.stepStates.length) {
          plan.stepStates[stepEv.index] = stepEv.state
        }
      } else if (ev.type === 'panel') {
        panels.push(ev)
      }
    }
    return { plan, panels }
  }, [events])
}

export default function WorkshopTelemetry({ events }: { events: WorkshopEvent[] }) {
  const { plan, panels } = usePlanReducer(events)

  if (!events.length) {
    return (
      <div className="text-center py-12 text-sm" style={{ color: INK_QUIET }}>
        Ask a question in the chat on the left. Telemetry panels stream in here.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {plan && (
        <div
          className="rounded-xl overflow-hidden animate-[fadeSlide_0.32s_ease-out]"
          style={{ background: 'rgba(255,255,255,0.7)', border: `1px solid ${INK_QUIET}30` }}
        >
          <div
            className="flex items-center gap-2.5 px-3.5 py-2.5"
            style={{ borderBottom: `1px solid ${INK_QUIET}20`, background: CREAM_WARM }}
          >
            <span
              className="font-mono text-[9.5px] font-semibold tracking-[2px] uppercase px-2 py-0.5 rounded"
              style={{
                color: TAG_COLORS.cyan.fg,
                border: `1px solid ${TAG_COLORS.cyan.border}`,
                background: TAG_COLORS.cyan.bg,
              }}
            >
              PLAN
            </span>
            <span className="flex-1 text-[14px] font-semibold" style={{ color: INK }}>
              {plan.event.title}
            </span>
            {plan.event.duration_ms > 0 && (
              <span className="font-mono text-[10.5px]" style={{ color: INK_QUIET }}>
                ~{plan.event.duration_ms}ms
              </span>
            )}
          </div>
          <ol className="px-3.5 py-3 m-0 list-none flex flex-col gap-1.5">
            {plan.event.steps.map((step, i) => {
              const state = plan.stepStates[i]
              const stateLabel = state === 'done' ? 'ok' : state === 'active' ? 'running' : 'queued'
              const stateColor =
                state === 'done' ? '#047857' : state === 'active' ? INK : INK_QUIET
              return (
                <li
                  key={i}
                  className="flex items-start gap-3 px-2.5 py-2 rounded-md text-[14.5px]"
                  style={{
                    background: state === 'active' ? CREAM : CREAM_WARM,
                    border: `1px solid ${state === 'active' ? INK_QUIET + '40' : 'transparent'}`,
                  }}
                >
                  <span
                    className="font-mono text-[11px] font-semibold min-w-[22px]"
                    style={{ color: INK_SOFT }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="flex-1" style={{ color: INK, lineHeight: 1.5 }}>
                    {step}
                  </span>
                  <span
                    className="font-mono text-[10px] uppercase tracking-[1px]"
                    style={{ color: stateColor }}
                  >
                    {stateLabel}
                  </span>
                </li>
              )
            })}
          </ol>
        </div>
      )}

      {panels.map((ev, i) => (
        <PanelCard key={i} ev={ev} />
      ))}
    </div>
  )
}
