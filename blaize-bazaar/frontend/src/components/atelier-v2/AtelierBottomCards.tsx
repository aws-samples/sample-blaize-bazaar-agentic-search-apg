/**
 * AtelierBottomCards
 *
 * Three expanded detail cards shown below the main Atelier timeline:
 *   1. Observatory — how the system arrived at this recommendation.
 *   2. Memory — short-term and long-term signals that shaped it.
 *   3. Agents — the specialist agents involved and their status.
 *
 * Responsive grid: 3 columns ≥1280px, 2 columns 1024-1279px, 1 column below.
 * Each card is white, rounded, bordered, with a Close button in the top-right.
 *
 * Part of the Atelier v2 redesign. Self-contained; no cross-imports.
 */

import React from 'react'
import { X } from 'lucide-react'

interface AtelierBottomCardsProps {
  sessionId?: string
}

const INK = '#1f1410'
const BURGUNDY = '#c44536'
const CREAM_WARM = '#f5e8d3'
const MUTED = 'rgba(31,20,16,0.6)'
const BORDER = 'rgba(31,20,16,0.08)'

// ---------- shared tokens ----------

const cardStyle: React.CSSProperties = {
  position: 'relative',
  background: '#ffffff',
  borderRadius: '16px',
  padding: '24px',
  border: `1px solid ${BORDER}`,
  minHeight: '380px',
  color: INK,
}

const eyebrowStyle: React.CSSProperties = {
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.22em',
  color: BURGUNDY,
}

const titleStyle: React.CSSProperties = {
  color: INK,
  margin: '8px 0 4px',
}

const subtitleStyle: React.CSSProperties = {
  color: MUTED,
  margin: 0,
}

const chipStyle: React.CSSProperties = {
  background: CREAM_WARM,
  borderRadius: '8px',
  padding: '6px 10px',
  fontSize: '12px',
  color: INK,
  display: 'inline-flex',
  alignItems: 'center',
}

const closeButtonStyle: React.CSSProperties = {
  position: 'absolute',
  top: '16px',
  right: '16px',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: MUTED,
  padding: '4px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
}

function CloseButton() {
  return (
    <button type="button" aria-label="Close" style={closeButtonStyle}>
      <X size={16} />
    </button>
  )
}

// ---------- Card 1: Observatory ----------

const OBSERVATORY_STEPS = [
  { num: '01', title: 'Understanding intent', state: 'Completed', time: '0.8s', expanded: true },
  { num: '02', title: 'Matching memory', state: 'Completed', time: '1.1s' },
  { num: '03', title: 'Routing to agents', state: 'Completed', time: '0.5s' },
  { num: '04', title: 'Evaluating candidates', state: 'Completed', time: '2.3s' },
  { num: '05', title: 'Cross-checking sources', state: 'Completed', time: '1.7s' },
  { num: '06', title: 'Composing the answer', state: 'Completed', time: '0.9s' },
]

const CLASSIFICATIONS: Array<[string, string]> = [
  ['Category', 'Apparel'],
  ['Product type', 'Shirt'],
  ['Use case', 'Warm weather'],
  ['Occasion', 'Casual'],
  ['Gender', 'Men'],
]

function ObservatoryCard({ sessionId }: { sessionId: string }) {
  return (
    <div className="font-sans" style={cardStyle}>
      <CloseButton />
      <div style={eyebrowStyle}>SESSION #{sessionId} · OBSERVATORY</div>
      <h3 className="text-headline italic" style={titleStyle}>How we arrived at this.</h3>
      <p className="text-body-sm" style={subtitleStyle}>Expand any step to see details, context and reasoning.</p>

      <div className="mt-5 flex flex-col gap-2">
        {OBSERVATORY_STEPS.map((step) => (
          <div key={step.num}>
            <div className="flex items-center" style={{ gap: '12px' }}>
              <span
                className="text-mono"
                style={{
                  background: CREAM_WARM,
                  borderRadius: '6px',
                  padding: '4px 8px',
                  color: INK,
                }}
              >
                {step.num}
              </span>
              <span className="text-body-sm" style={{ color: INK, flex: 1 }}>{step.title}</span>
              <span
                style={{
                  background: '#dcebd8',
                  color: '#3b5f2e',
                  borderRadius: '6px',
                  padding: '2px 8px',
                  fontSize: '11px',
                }}
              >
                {step.state}
              </span>
              <span className="text-mono" style={{ color: MUTED }}>{step.time}</span>
            </div>

            {step.expanded && (
              <div
                className="mt-3"
                style={{
                  background: '#fbf6ed',
                  borderRadius: '12px',
                  padding: '14px',
                  border: `1px solid ${BORDER}`,
                }}
              >
                <div style={{ fontSize: '11px', color: MUTED, marginBottom: '4px' }}>Intent</div>
                <div
                  className="font-display italic text-body"
                  style={{
                    color: INK,
                    marginBottom: '12px',
                  }}
                >
                  “Linen shirt for hot summer in Goa”
                </div>

                <div style={{ fontSize: '11px', color: MUTED, marginBottom: '6px' }}>Entities</div>
                <div className="flex flex-wrap" style={{ gap: '6px', marginBottom: '12px' }}>
                  {['linen', 'shirt', 'summer', 'Goa', 'men'].map((e) => (
                    <span key={e} style={chipStyle}>
                      {e}
                    </span>
                  ))}
                </div>

                <div style={{ fontSize: '11px', color: MUTED, marginBottom: '6px' }}>Classification</div>
                <div className="flex flex-col" style={{ gap: '4px', marginBottom: '12px' }}>
                  {CLASSIFICATIONS.map(([k, v]) => (
                    <div key={k} className="flex" style={{ gap: '12px', fontSize: '12px' }}>
                      <span style={{ width: '100px', color: MUTED }}>{k}</span>
                      <span style={{ color: INK }}>{v}</span>
                    </div>
                  ))}
                </div>

                <div style={{ fontSize: '11px', color: MUTED, marginBottom: '6px' }}>Confidence</div>
                <div className="flex items-baseline" style={{ gap: '8px' }}>
                  <span className="font-display" style={{ fontSize: '32px', color: INK }}>0.94</span>
                  <span
                    style={{
                      fontSize: '11px',
                      letterSpacing: '0.18em',
                      color: '#3b5f2e',
                      textTransform: 'uppercase',
                    }}
                  >
                    HIGH
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------- Card 2: Memory ----------

const STM_ITEMS = [
  'Prefers natural fabrics',
  'Dislikes synthetic feel',
  'Warm weather shopping',
  'Neutral & earthy tones',
  'Relaxed fits over slim',
  'Frequently travels',
]

const LTM_ITEMS = [
  'Bought linen shirts 3 times',
  'Returned 1 item (too tight)',
  'Shops in Goa every May',
  'Values breathable fabrics',
  'Avg. spend range $120-$200',
  'Prefers minimal styles',
]

function MemoryOrbit() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" style={{ display: 'block' }}>
      <circle cx="60" cy="60" r="55" fill="none" stroke={BORDER} />
      <circle cx="60" cy="60" r="40" fill="none" stroke={BORDER} />
      <circle cx="60" cy="60" r="25" fill="none" stroke={BORDER} />
      <circle cx="60" cy="60" r="14" fill={INK} />
      <text
        x="60"
        y="64"
        textAnchor="middle"
        fontFamily="var(--serif)"
        fontSize="14"
        fill="#faf3e8"
        fontStyle="italic"
      >
        B
      </text>
      <circle cx="115" cy="60" r="4" fill={BURGUNDY} />
      <circle cx="40" cy="20" r="4" fill={BURGUNDY} />
      <circle cx="25" cy="85" r="4" fill={BURGUNDY} />
    </svg>
  )
}

function MemoryCard({ sessionId }: { sessionId: string }) {
  return (
    <div className="font-sans" style={cardStyle}>
      <CloseButton />
      <div style={eyebrowStyle}>SESSION #{sessionId} · MEMORY</div>
      <h3 className="text-headline italic" style={titleStyle}>What we know about you.</h3>
      <p className="text-body-sm" style={subtitleStyle}>Signals and preferences that shaped this recommendation.</p>

      <div className="mt-4 flex" style={{ gap: '16px' }}>
        <div className="flex flex-col" style={{ gap: '12px', flex: 1 }}>
          <div>
            <div style={{ fontSize: '11px', color: MUTED, marginBottom: '6px' }}>
              Short-term (STM) · From this session · 6 items
            </div>
            <div className="flex flex-wrap" style={{ gap: '6px' }}>
              {STM_ITEMS.map((item) => (
                <span key={item} style={chipStyle}>
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: MUTED, marginBottom: '6px' }}>
              Long-term (LTM) · Across your history · 24 items
            </div>
            <div className="flex flex-wrap" style={{ gap: '6px' }}>
              {LTM_ITEMS.map((item) => (
                <span key={item} style={chipStyle}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center" style={{ gap: '8px' }}>
          <MemoryOrbit />
          <div className="flex flex-col items-center" style={{ gap: '2px', fontSize: '10px', color: MUTED }}>
            <span>History</span>
            <span>Preferences</span>
            <span>Behavior</span>
          </div>
        </div>
      </div>

      <a
        href="#memory"
        className="mt-4 inline-block text-body-sm text-accent"
        style={{
          textDecoration: 'none',
        }}
      >
        Explore full memory →
      </a>
    </div>
  )
}

// ---------- Card 3: Agents ----------

const AGENTS = [
  {
    name: 'Style Advisor',
    role: 'Lead',
    latency: '2.1s',
    desc: 'Interprets intent and curates options.',
  },
  {
    name: 'Quality Analyst',
    role: 'Specialist',
    latency: '1.8s',
    desc: 'Evaluates quality, materials, craftsmanship and product quality.',
  },
  {
    name: 'Price Agent',
    role: 'Specialist',
    latency: '1.8s',
    desc: 'Analyzes pricing, discounts and value for money.',
  },
  {
    name: 'Inventory Agent',
    role: 'Specialist',
    latency: '1.2s',
    desc: 'Checks availability across sources and locations.',
  },
  {
    name: 'Experience Agent',
    role: 'Reviewer',
    latency: '1.6s',
    desc: 'Reviews reviews and customer satisfaction.',
  },
]

function AgentsCard({ sessionId }: { sessionId: string }) {
  return (
    <div className="font-sans" style={cardStyle}>
      <CloseButton />
      <div style={eyebrowStyle}>SESSION #{sessionId} · AGENTS</div>
      <h3 className="text-headline italic" style={titleStyle}>
        A team of specialists.
        <br />
        Working in harmony.
      </h3>
      <p className="text-body-sm" style={subtitleStyle}>Each agent contributes a perspective.</p>

      <div
        className="mt-5 grid"
        style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}
      >
        {AGENTS.map((a) => (
          <div key={a.name} className="flex flex-col items-center" style={{ gap: '8px', textAlign: 'center' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '9999px',
                background: '#e8d9bf',
              }}
            />
            <div className="text-body-sm" style={{ fontWeight: 500, color: INK }}>
              {a.name}
            </div>
            <div className="text-microcopy" style={{ color: MUTED }}>{a.role}</div>
            <div
              style={{
                background: '#dcebd8',
                color: '#3b5f2e',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '10px',
              }}
            >
              Completed
            </div>
            <div className="text-mono" style={{ color: MUTED }}>{a.latency}</div>
            <div className="text-microcopy" style={{ color: MUTED }}>{a.desc}</div>
          </div>
        ))}
      </div>

      <a
        href="#agents"
        className="mt-5 inline-block text-body-sm text-accent"
        style={{
          textDecoration: 'none',
        }}
      >
        View agent insights →
      </a>
    </div>
  )
}

// ---------- Container with responsive grid ----------

export function AtelierBottomCards({ sessionId = '7F5A' }: AtelierBottomCardsProps) {
  return (
    <div
      className="grid"
      style={{
        gap: '16px',
        gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
      }}
    >
      <style>{`
        @media (min-width: 1024px) {
          .atelier-bottom-cards-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (min-width: 1280px) {
          .atelier-bottom-cards-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
      `}</style>
      <div className="atelier-bottom-cards-grid grid" style={{ gap: '16px' }}>
        <ObservatoryCard sessionId={sessionId} />
        <MemoryCard sessionId={sessionId} />
        <AgentsCard sessionId={sessionId} />
      </div>
    </div>
  )
}

export default AtelierBottomCards
