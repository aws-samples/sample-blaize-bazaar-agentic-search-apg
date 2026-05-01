/**
 * Footer — brand + three live columns + bottom strip.
 *
 * Earlier footer shipped with five columns and a newsletter form.
 * Every link pointed to a placeholder route. Replaced with three
 * live surfaces that map 1:1 to routes that exist in the router:
 *
 *   - Brand column: "Blaize Bazaar" mark + tagline (unchanged).
 *   - Explore:      The floor (`/#shop`), Discover, Storyboard.
 *   - Storyboard:   Italic blurb + a real link to `/storyboard`.
 *   - Atelier:      Italic blurb + a real link to `/atelier`.
 *   - Bottom strip: Copyright + current year. No Privacy/Terms/
 *                   Accessibility stubs — those were the same dead
 *                   links this rewrite is eliminating.
 *
 * Copy from `FOOTER` in copy.ts.
 */
import { Link } from 'react-router-dom'

import { FOOTER } from '../copy'

const CREAM = '#fbf4e8'
const CREAM_WARM = '#f5e8d3'
const INK = '#2d1810'
const INK_SOFT = '#6b4a35'
const INK_QUIET = '#a68668'
const ACCENT = '#c44536'

const INTER_STACK = 'Inter, system-ui, sans-serif'
const FRAUNCES_STACK = 'Fraunces, Georgia, serif'

export default function Footer() {
  const year = new Date().getFullYear()
  const copyrightLine = `${FOOTER.BOTTOM_STRIP.COPYRIGHT} ${year}`

  return (
    <footer
      data-testid="footer"
      role="contentinfo"
      style={{
        background: CREAM_WARM,
        color: INK,
        padding: '72px 24px 32px',
        fontFamily: INTER_STACK,
        borderTop: `1px solid rgba(45, 24, 16, 0.08)`,
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div
          data-testid="footer-columns"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 48,
            paddingBottom: 48,
          }}
        >
          <BrandColumn />
          <ExploreColumn />
          <EditorialColumn
            testId="footer-column-storyboard"
            heading={FOOTER.STORYBOARD.HEADING}
            copy={FOOTER.STORYBOARD.COPY}
            ctaLabel={FOOTER.STORYBOARD.CTA_LABEL}
            ctaHref={FOOTER.STORYBOARD.CTA_HREF}
          />
          <EditorialColumn
            testId="footer-column-atelier"
            heading={FOOTER.ATELIER.HEADING}
            copy={FOOTER.ATELIER.COPY}
            ctaLabel={FOOTER.ATELIER.CTA_LABEL}
            ctaHref={FOOTER.ATELIER.CTA_HREF}
          />
        </div>
        <BottomStrip copyrightLine={copyrightLine} />
      </div>
    </footer>
  )
}

function BrandColumn() {
  return (
    <section
      data-testid="footer-column-brand"
      aria-label="Blaize Bazaar"
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          aria-hidden="true"
          className="inline-flex items-center justify-center rounded-full"
          style={{
            width: 32,
            height: 32,
            background: INK,
            color: CREAM,
            fontFamily: FRAUNCES_STACK,
            fontWeight: 600,
            fontSize: 16,
          }}
        >
          B
        </span>
        <span
          style={{
            fontFamily: FRAUNCES_STACK,
            fontSize: 20,
            fontWeight: 500,
            letterSpacing: '-0.01em',
          }}
        >
          Blaize Bazaar
        </span>
      </div>
      <p
        data-testid="footer-brand-tagline"
        style={{
          fontSize: 13,
          lineHeight: 1.6,
          color: INK_SOFT,
          margin: 0,
          maxWidth: 260,
        }}
      >
        {FOOTER.BRAND.TAGLINE}
      </p>
    </section>
  )
}

function ExploreColumn() {
  return (
    <section
      data-testid="footer-column-explore"
      aria-labelledby="footer-column-explore-heading"
      style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
    >
      <h3
        id="footer-column-explore-heading"
        style={{
          fontFamily: INTER_STACK,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: INK_QUIET,
          margin: 0,
        }}
      >
        {FOOTER.EXPLORE.HEADING}
      </h3>
      <ul
        role="list"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          margin: 0,
          padding: 0,
          listStyle: 'none',
        }}
      >
        {FOOTER.EXPLORE.ITEMS.map(({ label, href }) => (
          <li key={label}>
            <Link
              to={href}
              data-testid={`footer-explore-link-${label.toLowerCase().replace(/\s+/g, '-')}`}
              style={{
                color: INK,
                fontSize: 14,
                textDecoration: 'none',
                transition: 'color 180ms ease-out',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = ACCENT
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = INK
              }}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

interface EditorialColumnProps {
  testId: string
  heading: string
  copy: string
  ctaLabel: string
  ctaHref: string
}

function EditorialColumn({
  testId,
  heading,
  copy,
  ctaLabel,
  ctaHref,
}: EditorialColumnProps) {
  return (
    <section
      data-testid={testId}
      aria-labelledby={`${testId}-heading`}
      style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
    >
      <h3
        id={`${testId}-heading`}
        style={{
          fontFamily: INTER_STACK,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: INK_QUIET,
          margin: 0,
        }}
      >
        {heading}
      </h3>
      <p
        style={{
          fontFamily: FRAUNCES_STACK,
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: 15,
          lineHeight: 1.55,
          color: INK,
          margin: 0,
        }}
      >
        {copy}
      </p>
      <Link
        to={ctaHref}
        data-testid={`${testId}-cta`}
        style={{
          fontFamily: INTER_STACK,
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: '-0.003em',
          color: ACCENT,
          textDecoration: 'none',
          marginTop: 4,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.textDecoration = 'underline'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.textDecoration = 'none'
        }}
      >
        {ctaLabel}
        <span aria-hidden>&rarr;</span>
      </Link>
    </section>
  )
}

interface BottomStripProps {
  copyrightLine: string
}

function BottomStrip({ copyrightLine }: BottomStripProps) {
  return (
    <div
      data-testid="footer-bottom-strip"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        paddingTop: 24,
        borderTop: `1px solid rgba(45, 24, 16, 0.08)`,
      }}
    >
      <span
        data-testid="footer-copyright"
        style={{ fontSize: 12, color: INK_QUIET }}
      >
        {copyrightLine}
      </span>
      <span
        style={{
          fontFamily: INTER_STACK,
          fontSize: 11,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: INK_QUIET,
        }}
      >
        Made for the workshop
      </span>
    </div>
  )
}
