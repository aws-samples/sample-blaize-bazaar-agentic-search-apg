import { cssVar as c } from '../design/cssVars'
/**
 * FieldNotes — short editorial essays for the Storyboard route.
 *
 * Four notes total: catalog, declared profiles, execution evidence,
 * and Theo's optional returns scenario. Each
 * note is a tight italic Fraunces dek + a prose body in Instrument Sans, 15px/
 * 1.7, matching Pellier Labs AssistantText register so the page reads
 * as "the storefront wrote this, not a marketing page."
 *
 * The footer tagline "Field notes from a slower kind of shopping" is
 * the section's single editorial anchor — carried over from the old
 * footer newsletter column so the phrase earns a home instead of
 * being decoration beneath a dead subscribe form.
 */
const RULE_1 = 'rgba(45, 24, 16, 0.08)'

const FRAUNCES_STACK = 'Fraunces, Georgia, serif'
const MONO_STACK = 'JetBrains Mono, ui-monospace, monospace'

interface Note {
  id: string
  kicker: string
  title: string
  body: string[]
  signature: string
}

const NOTES: readonly Note[] = [
  {
    id: 'catalog',
    kicker: 'Field note · No. 01',
    title: 'One catalog, different ways to find a piece.',
    body: [
      'Forty seeded products give every participant the same starting point: linen, leather, ceramics, gifts, and home objects. The storefront edit uses checked-in products and explicit profile tags; a live search retrieves from Aurora PostgreSQL.',
      'The request “A housewarming gift under $100 that is in stock” holds the need steady while four retrieval strategies change how candidates are found, filtered, and ranked. Compare the returned products and hard constraints before deciding whether the extra model call earns its time and cost.',
    ],
    signature: '— The editors',
  },
  {
    id: 'profiles',
    kicker: 'Field note · No. 02',
    title: 'A profile starts with declared signals.',
    body: [
      "Marco starts with natural fibers and travel pieces, Anna with considered gifts and budgets, and Theo with ceramics and care. Their tag weights and seeded orders are authored workshop inputs, not preferences inferred from a conversation you have yet to run.",
      'AgentCore Memory stores completed session turns and can extract learned preferences. Aurora owns catalog, inventory, orders, and action receipts. Inspect the memory source and session before treating a remembered detail as evidence.',
    ],
    signature: '— Workshop profile note',
  },
  {
    id: 'evidence',
    kicker: 'Field note · No. 03',
    title: 'How an answer earns its proof.',
    body: [
      'In the Builders’ Session, you first implement floor_check and verify its Aurora result directly. Later, you grant that capability to Stock Keeper and ask Marco’s warehouse question again. The tool body and the agent’s authority are two separate control points.',
      'An answer alone does not prove the invocation. Match the named tool, caller, arguments, time, and session to its durable Aurora receipt. The Live Workbench helps inspect a turn; reference scorecards and replay fixtures explain the design but do not prove your request ran.',
    ],
    signature: '— Workshop profile note',
  },
  {
    id: 'optional-returns',
    kicker: 'Field note · No. 04',
    title: 'Theo, as a workshop profile.',
    body: [
      "Theo's seed favors ceramics, linen throws, stoneware, repair, and durable post-purchase handling.",
      "His damaged-bowl scenario is optional follow-up beyond the 60-minute build. On a live configured environment, it exercises an ownership check, return write, inventory effect, and action receipt in Aurora. A seeded story is not a completed return.",
    ],
    signature: '— Workshop profile note',
  },
]

export default function FieldNotes() {
  return (
    <section
      data-testid="field-notes"
      aria-labelledby="field-notes-heading"
      style={{
        background: c.bg,
        padding: '72px 24px 96px',
      }}
    >
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <header style={{ marginBottom: 48 }}>
          <p
            style={{
              fontFamily: MONO_STACK,
              fontSize: 11,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: c.accent,
              fontWeight: 500,
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span
              aria-hidden
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: c.accent,
                display: 'inline-block',
              }}
            />
            Field notes
          </p>
          <h2
            id="field-notes-heading"
            style={{
              fontFamily: FRAUNCES_STACK,
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 44,
              lineHeight: 1.1,
              letterSpacing: '-0.01em',
              color: c.ink,
              margin: '16px 0 0',
            }}
          >
            A slower kind of shopping,{' '}
            <span style={{ color: c.ink2 }}>in four notes.</span>
          </h2>
          <p
            style={{
              fontFamily: FRAUNCES_STACK,
              fontStyle: 'italic',
              fontSize: 17,
              lineHeight: 1.6,
              color: c.ink2,
              margin: '16px 0 0',
              maxWidth: 560,
            }}
          >
            Short notes about the workshop's declared profile seeds,
            retrieval choices, memory boundary, and action proof.
          </p>
        </header>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 64 }}>
          {NOTES.map((note, i) => (
            <article
              id={note.id}
              key={note.title}
              data-testid={`field-note-${i}`}
              style={{
                borderTop: `1px solid ${RULE_1}`,
                paddingTop: 32,
                scrollMarginTop: 100,
              }}
            >
              <p
                style={{
                  fontFamily: MONO_STACK,
                  fontSize: 10,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: c.muted,
                  fontWeight: 500,
                  margin: 0,
                }}
              >
                {note.kicker}
              </p>
              <h3
                style={{
                  fontFamily: FRAUNCES_STACK,
                  fontStyle: 'italic',
                  fontWeight: 400,
                  fontSize: 28,
                  lineHeight: 1.2,
                  letterSpacing: '-0.005em',
                  color: c.ink,
                  margin: '10px 0 18px',
                }}
              >
                {note.title}
              </h3>
              {note.body.map((paragraph, j) => (
                <p
                  key={j}
                  style={{
                    fontFamily: 'var(--sans)',
                    fontSize: 15,
                    lineHeight: 1.7,
                    letterSpacing: '-0.003em',
                    color: c.ink,
                    margin: j === 0 ? 0 : '16px 0 0',
                  }}
                >
                  {paragraph}
                </p>
              ))}
              <p
                style={{
                  fontFamily: FRAUNCES_STACK,
                  fontStyle: 'italic',
                  fontWeight: 400,
                  fontSize: 14,
                  color: c.ink2,
                  margin: '18px 0 0',
                }}
              >
                {note.signature}
              </p>
            </article>
          ))}
        </div>
        <div
          style={{
            marginTop: 72,
            paddingTop: 24,
            borderTop: `1px solid ${RULE_1}`,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <p
            style={{
              fontFamily: FRAUNCES_STACK,
              fontStyle: 'italic',
              fontWeight: 600,
              fontSize: 15,
              lineHeight: 1.6,
              color: c.ink2,
              textAlign: 'center',
              margin: 0,
              maxWidth: 420,
            }}
          >
            Follow the lab guide for the required build. Return to these
            stories when you want to connect the shopper's request to the
            system that answers it.
          </p>
        </div>
      </div>
    </section>
  )
}
