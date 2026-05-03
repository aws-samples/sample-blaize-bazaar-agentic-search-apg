import { Brain, Database, Search, BarChart3, Users, Sparkles } from 'lucide-react'
import type { ComponentType } from 'react'

/**
 * AtelierTimeline — the six-step editorial trace that anchors the Atelier.
 *
 * Runs vertically down the center of the canvas. Each row pairs a numbered
 * espresso-bordered badge (connected by a hairline spine), a cream-warm icon
 * tile, a title + description block, a state chip, and a monospace
 * timestamp. The final step carries a soft-green "Completed" chip to
 * reinforce the arc from intent → delivery.
 *
 * The component is deliberately self-contained: when no ``steps`` prop is
 * supplied it renders a muted placeholder set at 45% opacity so the layout
 * still reads before a query lands. Once steps arrive from the runtime they
 * render at full fidelity with live timestamps and state chips.
 *
 * Icons map through a small dictionary to keep the serialised step shape
 * portable (plain strings) rather than dragging React components through
 * props — useful for hydration and for logging step trails to disk.
 */
export interface TimelineStep {
  number: string
  title: string
  description: string
  icon: 'brain' | 'database' | 'search' | 'barchart' | 'users' | 'sparkles'
  state: string
  timestamp: string
  isActive?: boolean
  isCompleted?: boolean
}

export interface AtelierTimelineProps {
  steps?: TimelineStep[]
}

const ICONS: Record<TimelineStep['icon'], ComponentType<{ size?: number; strokeWidth?: number; color?: string }>> = {
  brain: Brain,
  database: Database,
  search: Search,
  barchart: BarChart3,
  users: Users,
  sparkles: Sparkles,
}

const PLACEHOLDER_STEPS: TimelineStep[] = [
  { number: '01', title: 'Understanding intent', description: 'Waiting for your first query…', icon: 'brain', state: '—', timestamp: '' },
  { number: '02', title: 'Retrieving from memory', description: 'Will surface prior context once a query lands.', icon: 'database', state: '—', timestamp: '' },
  { number: '03', title: 'Scanning live inventory', description: 'Fresh catalog scan runs per turn.', icon: 'search', state: '—', timestamp: '' },
  { number: '04', title: 'Ranking & reasoning', description: 'Ranks candidates against intent and memory.', icon: 'barchart', state: '—', timestamp: '' },
  { number: '05', title: 'Agent collaboration', description: 'Specialist agents weigh in on top picks.', icon: 'users', state: '—', timestamp: '' },
  { number: '06', title: 'Final recommendation', description: 'Curated response rendered in the chat.', icon: 'sparkles', state: '—', timestamp: '' },
]

export function AtelierTimeline({ steps }: AtelierTimelineProps) {
  const isPlaceholder = !steps || steps.length === 0
  const rows = isPlaceholder ? PLACEHOLDER_STEPS : steps!
  const rowOpacity = isPlaceholder ? 0.45 : 1

  return (
    <div
      style={{
        background: '#faf3e8',
        padding: '32px 48px 56px',
        maxWidth: '1200px',
        position: 'relative',
      }}
    >
      <div style={{ position: 'relative' }}>
        {/* Vertical spine connecting the badges */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: '19px',
            top: '20px',
            bottom: '20px',
            width: '1px',
            background: 'rgba(31, 20, 16, 0.12)',
          }}
        />

        {rows.map((step) => {
          const Icon = ICONS[step.icon]
          const completed = step.isCompleted
          const active = step.isActive

          const badgeStyle: React.CSSProperties = {
            width: '40px',
            height: '40px',
            borderRadius: '999px',
            border: '1px solid rgba(61, 38, 28, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--sans)',
            fontSize: '13px',
            fontWeight: 500,
            color: '#1f1410',
            background: active ? '#3d261c' : '#faf3e8',
            position: 'relative',
            zIndex: 1,
            flexShrink: 0,
          }

          if (active) {
            badgeStyle.color = '#faf3e8'
            badgeStyle.borderColor = '#3d261c'
          }

          const chipStyle: React.CSSProperties = {
            display: 'inline-flex',
            alignItems: 'center',
            padding: '4px 10px',
            borderRadius: '999px',
            background: completed ? '#dcebd8' : '#f5e8d3',
            color: completed ? '#2f4a2b' : '#1f1410',
            fontFamily: 'var(--sans)',
            fontSize: '11px',
            fontWeight: 500,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }

          return (
            <div
              key={step.number}
              className="flex items-start"
              style={{
                gap: '20px',
                padding: '18px 0',
                opacity: rowOpacity,
              }}
            >
              <div style={badgeStyle}>{step.number}</div>

              <div
                className="flex items-center justify-center"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: '#f5e8d3',
                  flexShrink: 0,
                  marginTop: '2px',
                }}
              >
                <Icon size={18} strokeWidth={1.5} color="#3d261c" />
              </div>

              <div className="flex-1 min-w-0" style={{ paddingTop: '2px' }}>
                <div
                  style={{
                    fontFamily: 'var(--sans)',
                    fontSize: '15px',
                    fontWeight: 500,
                    color: '#1f1410',
                    lineHeight: 1.3,
                  }}
                >
                  {step.title}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--sans)',
                    fontSize: '13px',
                    lineHeight: 1.5,
                    color: 'rgba(31, 20, 16, 0.65)',
                    marginTop: '4px',
                  }}
                >
                  {step.description}
                </div>
              </div>

              <div
                className="flex items-center"
                style={{ gap: '12px', flexShrink: 0, paddingTop: '4px' }}
              >
                <span style={chipStyle}>{step.state}</span>
                {step.timestamp && (
                  <span
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: '11px',
                      color: 'rgba(31, 20, 16, 0.55)',
                      letterSpacing: '0.02em',
                      minWidth: '92px',
                      textAlign: 'right',
                    }}
                  >
                    {step.timestamp}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default AtelierTimeline
