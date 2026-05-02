/**
 * BecauseYouAsked — "Because you asked..." editorial cards section.
 *
 * A 4-column CSS Grid of editorial teasers. Each card has a category
 * label, italic Fraunces title, and brief description. These are
 * static editorial content, not product cards.
 *
 * Categories: Gifts, Performance and Luxury, Linen Edits, Home Rituals
 */
import { Card } from '../design/primitives'

interface EditorialCard {
  category: string
  title: string
  description: string
}

const EDITORIAL_CARDS: EditorialCard[] = [
  {
    category: 'Gifts',
    title: 'The art of giving well.',
    description:
      'Thoughtful pieces that arrive wrapped in tissue and tied with intention. For the person who notices the details.',
  },
  {
    category: 'Performance and Luxury',
    title: 'Where function meets form.',
    description:
      'Technical fabrics, considered construction. Pieces that perform without announcing it.',
  },
  {
    category: 'Linen Edits',
    title: 'The fabric of slower days.',
    description:
      'Washed, softened, lived-in. Our linen collection gets better with every wear and every wash.',
  },
  {
    category: 'Home Rituals',
    title: 'Objects worth reaching for.',
    description:
      'Ceramic, stoneware, hand-thrown. The everyday pieces that turn a morning routine into a ritual.',
  },
]

export default function BecauseYouAsked() {
  return (
    <section
      data-testid="because-you-asked"
      aria-label="Because you asked"
      className="w-full bg-cream-50 py-16 md:py-20 lg:py-24"
    >
      <div className="max-w-[1440px] mx-auto px-container-x">
        {/* Section header */}
        <div className="mb-12">
          <p className="text-[11px] font-sans font-semibold tracking-[0.22em] uppercase text-ink-quiet mb-3">
            Because you asked
          </p>
          <h2
            data-testid="because-you-asked-headline"
            className="font-display italic text-espresso"
            style={{
              fontSize: 'clamp(28px, 3.5vw, 44px)',
              lineHeight: 1.15,
              letterSpacing: '-0.01em',
              fontWeight: 400,
            }}
          >
            Stories worth exploring.
          </h2>
        </div>

        {/* 4-column grid */}
        <div
          data-testid="because-you-asked-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {EDITORIAL_CARDS.map((card) => (
            <Card key={card.category} className="p-6">
              {/* Category eyebrow */}
              <p className="text-[10px] font-sans font-semibold tracking-[0.2em] uppercase text-accent mb-3">
                {card.category}
              </p>

              {/* Title */}
              <h3
                className="font-display italic text-espresso mb-3"
                style={{
                  fontSize: 'clamp(18px, 1.5vw, 22px)',
                  lineHeight: 1.25,
                  fontWeight: 400,
                }}
              >
                {card.title}
              </h3>

              {/* Description */}
              <p
                className="font-sans text-ink-soft"
                style={{
                  fontSize: 'clamp(13px, 1vw, 14px)',
                  lineHeight: 1.6,
                }}
              >
                {card.description}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
