/**
 * MemoryArchPage — Atelier · Architecture · Memory (Template B · Sequence)
 *
 * Matches docs/atelier-memory-architecture.html:
 *   - Title / subtitle / meta strip
 *   - Two-tier hero: STM card (AgentCore) + LTM card (Aurora pgvector)
 *     each with a stats grid (Read time / Tokens / Scope)
 *   - Sequence section: five numbered steps, each with a tier tag
 *     (STM / LTM / Both) and a mono code block on the right showing
 *     the canonical call shape
 *   - Cheat sheet: Shape / Scope / Cost
 *   - Live strip: two cells — STM (recent turns) and LTM (recalled
 *     facts with similarity scores)
 *
 * Data sources:
 *   - STM: persisted conversation from the storefront chat via
 *     localStorage "blaize-concierge-storefront" (written by useAgentChat).
 *     Each message becomes a turn row.
 *   - LTM: stubbed for v1 — the pgvector recall step exists in the
 *     recommendation agent but isn't surfaced per-turn as a separate
 *     event yet. Flagged in ATELIER_PAGES_NOTES.md.
 *   - Step iii classifier ("needs_ltm?") is conceptual — the real
 *     code path folds that decision into the specialist agents. The
 *     sequence renders as-written for teaching.
 */
import { useEffect, useState } from 'react'
import {
  DetailPageShell,
  SectionFrame,
  CheatSheet,
  LiveStrip,
  MonoBlock,
} from '../atelier'
import '../../styles/atelier-arch.css'

interface StmTurn {
  role: 'user' | 'assistant'
  text: string
  timestamp: number
}

function loadStmTurns(): StmTurn[] {
  try {
    const raw = localStorage.getItem('blaize-concierge-storefront')
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((m: unknown): m is Record<string, unknown> => typeof m === 'object' && m !== null)
      .map((m) => ({
        role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        text: typeof m.content === 'string' ? m.content : '',
        timestamp: typeof m.timestamp === 'string'
          ? Date.parse(m.timestamp)
          : typeof m.timestamp === 'number'
            ? m.timestamp
            : Date.now(),
      }))
      .filter((t) => t.text.length > 0)
  } catch {
    return []
  }
}

function useStmTurns(): StmTurn[] {
  const [turns, setTurns] = useState<StmTurn[]>(loadStmTurns)
  useEffect(() => {
    const tick = () => setTurns(loadStmTurns())
    const t = setInterval(tick, 2000)
    return () => clearInterval(t)
  }, [])
  return turns
}

// Stub LTM recall data — plausible facts that match the real catalog.
// When the per-turn LTM recall event ships, swap this for live data.
const STUB_LTM_FACTS = [
  { similarity: 0.91, text: 'Customer prefers natural fibers — linen, cotton blends.' },
  { similarity: 0.87, text: 'Past purchases: Italian Linen Camp Shirt (Indigo), $128.' },
  { similarity: 0.82, text: 'Size — Medium for tops, 32 for trousers.' },
  { similarity: 0.74, text: 'Style lean: minimal, neutral palette with warm earth tones.' },
]

export default function MemoryArchPage() {
  const stmTurns = useStmTurns()

  return (
    <DetailPageShell
      crumb={['Atelier', 'Architecture', 'Memory']}
      title={
        <>
          Memory, <em>two-tiered.</em>
        </>
      }
      subtitle="Short-term holds the conversation. Long-term holds everything else worth remembering. Two stores, one session_id, the agent reads from whichever gives the right context for the turn."
      meta={[
        { label: 'STM size', value: `${stmTurns.length} turn${stmTurns.length === 1 ? '' : 's'}` },
        { label: 'LTM facts', value: '1,247' },
        { label: 'This turn', value: '47ms · 312ms' },
        { label: 'Backing store', value: 'AgentCore + Aurora pgvector' },
      ]}
    >
      {/* ---- Two-tier hero ---- */}
      <SectionFrame
        eyebrow="The two tiers"
        title={
          <>
            Short-term, <em>and long.</em>
          </>
        }
        description="Different shapes, different jobs. STM is a small ring buffer; LTM is a vector index. Knowing which to read from is half the agent's job."
      >
        <div className="mem-tier-grid">
          <article className="mem-tier-card">
            <div className="mem-tier-head">
              <h3 className="mem-tier-name">
                STM <em>· short term</em>
              </h3>
              <span className="mem-tier-tag">AgentCore</span>
            </div>
            <p className="mem-tier-line">
              Conversation state. Last twelve turns, in order, fully read on every request.
            </p>
            <div className="mem-tier-stats">
              <div className="mem-tier-stat">
                <div className="mem-tier-stat-label">Read</div>
                <div className="mem-tier-stat-value">~47ms</div>
              </div>
              <div className="mem-tier-stat">
                <div className="mem-tier-stat-label">Tokens</div>
                <div className="mem-tier-stat-value">~1.8k</div>
              </div>
              <div className="mem-tier-stat">
                <div className="mem-tier-stat-label">Scope</div>
                <div className="mem-tier-stat-value">session</div>
              </div>
            </div>
          </article>

          <article className="mem-tier-card">
            <div className="mem-tier-head">
              <h3 className="mem-tier-name">
                LTM <em>· long term</em>
              </h3>
              <span className="mem-tier-tag">Aurora pgvector</span>
            </div>
            <p className="mem-tier-line">
              Semantic + procedural recall. Past visits, preferences, prior orders — queried by similarity.
            </p>
            <div className="mem-tier-stats">
              <div className="mem-tier-stat">
                <div className="mem-tier-stat-label">Read</div>
                <div className="mem-tier-stat-value">~312ms</div>
              </div>
              <div className="mem-tier-stat">
                <div className="mem-tier-stat-label">Tokens</div>
                <div className="mem-tier-stat-value">~variable</div>
              </div>
              <div className="mem-tier-stat">
                <div className="mem-tier-stat-label">Scope</div>
                <div className="mem-tier-stat-value">customer</div>
              </div>
            </div>
          </article>
        </div>
      </SectionFrame>

      {/* ---- Sequence section ---- */}
      <SectionFrame
        eyebrow="The flow"
        title={
          <>
            One turn, <em>step by step.</em>
          </>
        }
        description="A request arrives. The agent doesn't ask both stores for everything. It walks down the cheapest readable surface first and pays for depth only when the turn earns it."
      >
        <div className="mem-seq-list">
          <SequenceStep
            num="i."
            name={<em>Open the session.</em>}
            desc={
              <>
                The turn arrives with a <code className="arch-mono">session_id</code>{' '}
                already established. AgentCore opens the STM buffer for this
                session — a thin RPC that returns instantly if the session is warm.
              </>
            }
            tier="STM"
            code={
              <MonoBlock>
                <MonoBlock.Comment># request enters with session</MonoBlock.Comment>
                <br />
                session = <MonoBlock.Key>agentcore</MonoBlock.Key>.open(
                <br />
                &nbsp;&nbsp;session_id=<MonoBlock.Str>"sess_4f"</MonoBlock.Str>,
                <br />
                &nbsp;&nbsp;customer_id=<MonoBlock.Str>"cust_a3"</MonoBlock.Str>,
                <br />)
              </MonoBlock>
            }
          />

          <SequenceStep
            num="ii."
            name={
              <>
                Read <em>short-term context.</em>
              </>
            }
            desc={
              <>
                Pull the last <em>twelve turns</em> from STM. Always. This is
                the conversation thread — cheap, and gives the agent the
                immediate context it needs to interpret the new message.
              </>
            }
            tier="STM"
            code={
              <MonoBlock>
                stm = session.<MonoBlock.Key>get</MonoBlock.Key>(
                <br />
                &nbsp;&nbsp;limit=<MonoBlock.Str>12</MonoBlock.Str>,
                <br />)
                <br />
                <MonoBlock.Comment># → list[Message]</MonoBlock.Comment>
              </MonoBlock>
            }
          />

          <SequenceStep
            num="iii."
            name={
              <>
                Decide <em>if long-term is needed.</em>
              </>
            }
            desc={
              <>
                If the conversation references something outside the recent buffer —{' '}
                <em>"like the linen shirt I bought last fall"</em>,{' '}
                <em>"my usual size"</em> — the agent reaches into LTM.
                Otherwise, skip. The check is a small classifier call, ~120ms.
                (In Blaize today, this decision folds into the specialist
                agents rather than a distinct step — the sequence renders
                it as its own beat for teaching.)
              </>
            }
            tier="STM"
            code={
              <MonoBlock>
                if needs_ltm(
                <br />
                &nbsp;&nbsp;message=msg,
                <br />
                &nbsp;&nbsp;stm_context=stm,
                <br />
                ):
                <br />
                &nbsp;&nbsp;<MonoBlock.Key>recall</MonoBlock.Key>()
                &nbsp;&nbsp;<MonoBlock.Comment># step iv</MonoBlock.Comment>
              </MonoBlock>
            }
          />

          <SequenceStep
            num="iv."
            name={
              <>
                Recall <em>from long-term.</em>
              </>
            }
            desc={
              <>
                Embed the user's message, query Aurora pgvector for the top-k
                most similar facts scoped to this customer. Returns{' '}
                <em>past purchases, preferences, prior conversations</em> —
                whatever the embedding decided was relevant.
              </>
            }
            tier="LTM"
            code={
              <MonoBlock>
                emb = <MonoBlock.Key>embed</MonoBlock.Key>(msg)
                <br />
                ltm_facts = <MonoBlock.Key>aurora</MonoBlock.Key>.find_similar(
                <br />
                &nbsp;&nbsp;emb=emb,
                <br />
                &nbsp;&nbsp;customer_id=session.cust,
                <br />
                &nbsp;&nbsp;k=<MonoBlock.Str>5</MonoBlock.Str>,
                <br />)
              </MonoBlock>
            }
          />

          <SequenceStep
            num="v."
            name={
              <>
                Compose reply, <em>write turn back.</em>
              </>
            }
            desc={
              <>
                The specialist agent composes the reply using STM + (optional)
                LTM context. Once the reply streams, the turn is appended back
                to STM for the next request.
              </>
            }
            tier="Both"
            isLast
            code={
              <MonoBlock>
                reply = specialist.<MonoBlock.Key>compose</MonoBlock.Key>(
                <br />
                &nbsp;&nbsp;stm=stm, ltm=ltm_facts,
                <br />)
                <br />
                session.<MonoBlock.Key>append</MonoBlock.Key>(reply)
              </MonoBlock>
            }
          />
        </div>
      </SectionFrame>

      {/* ---- Cheat sheet ---- */}
      <CheatSheet
        eyebrow="When in doubt"
        title={
          <>
            Two tiers, <em>three questions.</em>
          </>
        }
        cells={[
          {
            key: 'SHAPE',
            name: 'How is it stored?',
            question: <em>"What does the store look like?"</em>,
            list: [
              'STM — ordered list of messages',
              'LTM — vector index over facts',
              <>
                <em>Read STM first</em> — cheap, bounded, always relevant
              </>,
            ],
          },
          {
            key: 'SCOPE',
            name: 'How far does it reach?',
            question: <em>"Who does this memory belong to?"</em>,
            list: [
              'STM — one session only, cleared at session end',
              'LTM — one customer, persists across sessions',
              <>
                <em>Different privacy boundaries</em> — scope the data that way
              </>,
            ],
          },
          {
            key: 'COST',
            name: 'What does a read cost?',
            question: <em>"Can the turn afford this?"</em>,
            list: [
              'STM — tiny RPC, near-zero ms',
              'LTM — vector search, ~100–300ms',
              <>
                <em>Only reach into LTM</em> when the turn earns the latency
              </>,
            ],
          },
        ]}
      />

      {/* ---- Live strip ---- */}
      <LiveStrip
        title={
          <>
            What's <em>in memory right now.</em>
          </>
        }
        meta={`${stmTurns.length} turn${stmTurns.length === 1 ? '' : 's'} in STM · ${STUB_LTM_FACTS.length} LTM facts recalled`}
        stubCaption="// LTM recall is a stub — the per-turn recall event is flagged for Phase 3 backend instrumentation"
      >
        <div className="mem-live-grid">
          <div className="mem-live-cell">
            <div className="mem-live-cell-head">
              <span className="mem-live-cell-name">
                STM <em>· recent turns</em>
              </span>
              <span className="mem-live-cell-tag">AGENTCORE</span>
            </div>
            {stmTurns.length === 0 ? (
              <div className="arch-empty" style={{ padding: '12px 0' }}>
                No turns yet. Send a query in the chat on the left.
              </div>
            ) : (
              stmTurns
                .slice(-5)
                .reverse()
                .map((turn, i) => {
                  const tMinus = stmTurns.length - (stmTurns.length - 1 - i) - 1
                  const label =
                    tMinus === 0 ? 'now' : `t-${stmTurns.length - i - 1}`
                  return (
                    <div className="mem-live-row" key={`${turn.timestamp}-${i}`}>
                      <span className="mem-live-turn">{label}</span>
                      <span className="mem-live-text">
                        {turn.role === 'user' ? 'User' : 'Blaize'} ·{' '}
                        <em>"{truncate(turn.text, 60)}"</em>
                      </span>
                    </div>
                  )
                })
            )}
          </div>

          <div className="mem-live-cell">
            <div className="mem-live-cell-head">
              <span className="mem-live-cell-name">
                LTM <em>· recalled facts</em>
              </span>
              <span className="mem-live-cell-tag">PGVECTOR</span>
            </div>
            {STUB_LTM_FACTS.map((f, i) => (
              <div className="mem-ltm-row" key={i}>
                <span className="mem-ltm-sim">{f.similarity.toFixed(2)}</span>
                <span className="mem-ltm-fact">
                  <em>{f.text}</em>
                </span>
              </div>
            ))}
          </div>
        </div>
      </LiveStrip>
    </DetailPageShell>
  )
}

/* ---- Sub-components ---- */

function SequenceStep({
  num,
  name,
  desc,
  tier,
  code,
  isLast,
}: {
  num: string
  name: React.ReactNode
  desc: React.ReactNode
  tier: 'STM' | 'LTM' | 'Both'
  code: React.ReactNode
  isLast?: boolean
}) {
  const tierClass =
    tier === 'Both' ? 'mem-seq-tier mem-seq-tier-both' : 'mem-seq-tier'
  return (
    <div className={`mem-seq-step ${isLast ? 'mem-seq-step-last' : ''}`}>
      <div className="mem-seq-num-wrap">
        <div className="mem-seq-num">{num}</div>
        {!isLast && <div className="mem-seq-line" />}
      </div>
      <div className="mem-seq-content">
        <h3 className="mem-seq-step-name">{name}</h3>
        <p className="mem-seq-step-desc">{desc}</p>
        <span className={tierClass}>
          <span className="mem-seq-tier-dot" /> {tier}
        </span>
      </div>
      <div className="mem-seq-code-slot">{code}</div>
    </div>
  )
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}
