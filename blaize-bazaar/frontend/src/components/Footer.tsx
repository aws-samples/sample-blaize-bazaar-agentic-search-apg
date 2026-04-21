/**
 * Footer - 5-column site footer.
 *
 * Validates Requirements 1.10.1, 1.10.2, 1.10.3.
 *
 * Contract:
 *   - Exactly 5 columns in order: Brand, Shop, About, Service,
 *     Storyboard newsletter (Req 1.10.1).
 *   - The About column carries `Our story`, `Makers we love`,
 *     `Sustainability`, `Press` - these live here rather than in the
 *     top nav (Req 1.10.2, 1.2.4).
 *   - Bottom strip shows the copyright line plus `Privacy`, `Terms`,
 *     `Accessibility` (Req 1.10.3).
 *
 * Copy comes from the `FOOTER` block in copy.ts so the scanner in
 * `src/__tests__/copy.test.ts` keeps it honest. The newsletter form
 * is intentionally client-only: subscribing is wired downstream.
 */
import { useState } from 'react'

import { FOOTER } from '../copy'

// --- Design tokens (storefront.md) ---------------------------------------
const CREAM = '#fbf4e8'
const CREAM_WARM = '#f5e8d3'
const INK = '#2d1810'
const INK_SOFT = '#6b4a35'
const INK_QUIET = '#a68668'
const ACCENT = '#c44536'

const INTER_STACK = 'Inter, system-ui, sans-serif'
const FRAUNCES_STACK = 'Fraunces, Georgia, serif'

// --- Public component ----------------------------------------------------

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
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 48,
            paddingBottom: 48,
          }}
        >
          <BrandColumn />
          <LinkColumn
            testId="footer-column-shop"
            heading={FOOTER.SHOP.HEADING}
            items={FOOTER.SHOP.ITEMS}
          />
          <LinkColumn
            testId="footer-column-about"
            heading={FOOTER.ABOUT.HEADING}
            items={FOOTER.ABOUT.ITEMS}
          />
          <LinkColumn
            testId="footer-column-service"
            heading={FOOTER.SERVICE.HEADING}
            items={FOOTER.SERVICE.ITEMS}
          />
          <NewsletterColumn />
        </div>

        <BottomStrip copyrightLine={copyrightLine} />
      </div>
    </footer>
  )
}

// --- Brand column -------------------------------------------------------

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

// --- Generic link column -----------------------------------------------

interface LinkColumnProps {
  testId: string
  heading: string
  items: readonly string[]
}

function LinkColumn({ testId, heading, items }: LinkColumnProps) {
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
        {items.map((label) => (
          <li key={label}>
            <a
              href="#"
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
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}

// --- Newsletter column --------------------------------------------------

function NewsletterColumn() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (email.trim().length === 0) return
    setSubmitted(true)
  }

  return (
    <section
      data-testid="footer-column-newsletter"
      aria-labelledby="footer-column-newsletter-heading"
      style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
    >
      <h3
        id="footer-column-newsletter-heading"
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
        {FOOTER.STORYBOARD_NEWSLETTER.HEADING}
      </h3>
      <p
        style={{
          fontFamily: FRAUNCES_STACK,
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: 15,
          lineHeight: 1.5,
          color: INK,
          margin: 0,
        }}
      >
        {FOOTER.STORYBOARD_NEWSLETTER.COPY}
      </p>
      <form
        data-testid="footer-newsletter-form"
        onSubmit={onSubmit}
        style={{
          display: 'flex',
          alignItems: 'stretch',
          gap: 8,
          marginTop: 4,
        }}
      >
        <label htmlFor="footer-newsletter-email" className="sr-only">
          {FOOTER.STORYBOARD_NEWSLETTER.EMAIL_PLACEHOLDER}
        </label>
        <input
          id="footer-newsletter-email"
          data-testid="footer-newsletter-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={FOOTER.STORYBOARD_NEWSLETTER.EMAIL_PLACEHOLDER}
          required
          style={{
            flex: 1,
            minWidth: 0,
            padding: '10px 12px',
            border: `1px solid ${INK_QUIET}`,
            borderRadius: 2,
            background: CREAM,
            color: INK,
            fontFamily: INTER_STACK,
            fontSize: 13,
          }}
        />
        <button
          type="submit"
          data-testid="footer-newsletter-submit"
          style={{
            padding: '10px 16px',
            background: INK,
            color: CREAM,
            border: 'none',
            borderRadius: 2,
            fontFamily: INTER_STACK,
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: '0.02em',
            cursor: 'pointer',
          }}
        >
          {FOOTER.STORYBOARD_NEWSLETTER.SUBMIT}
        </button>
      </form>
      {submitted ? (
        <p
          data-testid="footer-newsletter-ack"
          role="status"
          style={{ fontSize: 12, color: INK_SOFT, margin: 0 }}
        >
          Thank you. The next letter lands soon.
        </p>
      ) : null}
    </section>
  )
}

// --- Bottom strip -------------------------------------------------------

interface BottomStripProps {
  copyrightLine: string
}

function BottomStrip({ copyrightLine }: BottomStripProps) {
  return (
    <div
      data-testid="footer-bottom-strip"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
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
      <ul
        role="list"
        style={{
          display: 'flex',
          gap: 20,
          margin: 0,
          padding: 0,
          listStyle: 'none',
        }}
      >
        {FOOTER.BOTTOM_STRIP.LINKS.map((label) => (
          <li key={label}>
            <a
              data-testid={`footer-bottom-link-${label.toLowerCase()}`}
              href="#"
              style={{
                fontSize: 12,
                color: INK_QUIET,
                textDecoration: 'none',
                transition: 'color 180ms ease-out',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = ACCENT
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = INK_QUIET
              }}
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
