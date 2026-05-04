/**
 * EditorialBrief — "About the workshop" contributor card.
 *
 * Sits above the Footer as a warm editorial band — the quiet page
 * at the back of a magazine where the editor writes their note.
 * Features the editorial portrait illustration (or a warm gradient
 * fallback) with the workshop credit and a short philosophical note
 * about how the demo was built.
 */

const BRIEF_IMAGE = '/products/editorial-brief-shayon.png'

export default function EditorialBrief() {
  return (
    <section
      data-testid="editorial-brief"
      aria-label="About this workshop"
      className="w-full"
      style={{
        background: 'linear-gradient(180deg, #F7F3EE 0%, #EDE4D6 100%)',
      }}
    >
      <div className="max-w-[1440px] mx-auto px-container-x py-20 md:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: editorial illustration */}
          <div className="relative rounded-2xl overflow-hidden shadow-warm-md" style={{ aspectRatio: '16 / 10' }}>
            <img
              src={BRIEF_IMAGE}
              alt="Editorial brief — workshop curator at desk"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback: hide image and show gradient
                e.currentTarget.style.display = 'none'
              }}
            />
            {/* Warm overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              aria-hidden
              style={{
                background: 'linear-gradient(135deg, rgba(247,243,238,0.05) 0%, rgba(59,47,47,0.08) 100%)',
              }}
            />
          </div>

          {/* Right: editorial text */}
          <div className="flex flex-col gap-6">
            {/* Eyebrow */}
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                style={{ color: '#a8423a', fontSize: '9px' }}
              >
                &#9679;
              </span>
              <span
                className="font-sans"
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: '#a8423a',
                }}
              >
                Editorial Brief
              </span>
            </div>

            {/* Headline */}
            <h2
              className="font-display italic text-espresso"
              style={{
                fontSize: 'clamp(28px, 3.5vw, 44px)',
                lineHeight: 1.1,
                letterSpacing: '-0.01em',
                fontWeight: 400,
              }}
            >
              Workshop built and
              <br />
              curated by
            </h2>

            {/* Name */}
            <div
              className="font-sans text-espresso"
              style={{
                fontSize: 'clamp(22px, 2.5vw, 32px)',
                fontWeight: 600,
                letterSpacing: '-0.01em',
              }}
            >
              Shayon Sanyal
            </div>

            {/* Philosophy */}
            <p
              className="font-sans text-ink-soft"
              style={{
                fontSize: '15px',
                lineHeight: 1.65,
                maxWidth: '480px',
              }}
            >
              Every agent decision in this workshop traces back to a real
              product, a real embedding, and a real database query. The
              boutique is built to feel like a place you'd actually shop —
              because the best way to teach agentic AI is to build something
              worth using.
            </p>

            {/* Stack */}
            <div
              className="flex flex-wrap gap-2 mt-2"
              style={{ maxWidth: '480px' }}
            >
              {[
                'Amazon Aurora',
                'pgvector',
                'Amazon Bedrock',
                'AgentCore',
                'Strands SDK',
                'Claude',
                'Cohere Embed v4',
                'Amazon Transcribe',
                'Cedar',
              ].map((tech) => (
                <span
                  key={tech}
                  className="font-mono"
                  style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    letterSpacing: '0.06em',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: 'rgba(31, 20, 16, 0.06)',
                    color: '#6b4a35',
                  }}
                >
                  {tech}
                </span>
              ))}
            </div>

            {/* Closing note */}
            <p
              className="font-display italic text-ink-quiet mt-4"
              style={{
                fontSize: '14px',
                lineHeight: 1.5,
              }}
            >
              Built for re:Invent. Designed to be taken apart.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
