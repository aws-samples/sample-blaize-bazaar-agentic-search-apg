/**
 * DiscoverPage - minimal `/discover` index route.
 *
 * Validates Requirements 1.13.2, 1.13.3, 1.13.4.
 *
 * Composition:
 *   - Header (sticky) with `current="discover"` so the Discover nav
 *     item takes the ink-highlighted current-page state (Req 1.13.4).
 *   - Signed out: a centered sign-in CTA with the exact copy from
 *     `DISCOVER_PAGE_SIGNED_OUT` in copy.ts.
 *   - Signed in: the personalized `ProductGrid` followed by the same
 *     ComingSoonLine that the Storyboard route uses.
 *   - Footer and floating CommandPill always render so the chrome
 *     matches the home page (Req 1.13.2).
 *
 * Copy rules from Req 1.12 apply - copy.ts is the single source of
 * truth for the strings on this page; the scanner in copy.test.ts
 * keeps forbidden words out.
 */
import CommandPill from '../components/CommandPill'
import Footer from '../components/Footer'
import Header from '../components/Header'
import ProductGrid from '../components/ProductGrid'
import { useAuth } from '../contexts/AuthContext'
import {
  DISCOVER_PAGE_COMING_SOON,
  DISCOVER_PAGE_SIGNED_OUT,
  SIGN_IN_STRIP,
} from '../copy'
import ComingSoonLine from './ComingSoonLine'

const CREAM = '#fbf4e8'
const INK = '#2d1810'
const ACCENT = '#c44536'
const INK_SOFT = '#6b4a35'
const INK_QUIET = '#a68668'
const FRAUNCES_STACK = 'Fraunces, Georgia, serif'
const INTER_STACK = 'Inter, system-ui, sans-serif'

/** Centered sign-in CTA rendered when the visitor is signed out. */
function DiscoverSigninPrompt() {
  const { login } = useAuth()
  return (
    <section
      data-testid="discover-signin-prompt"
      style={{
        background: CREAM,
        color: INK,
        padding: '120px 24px',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <p
          data-testid="discover-eyebrow"
          style={{
            fontFamily: INTER_STACK,
            fontSize: 11,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: INK_QUIET,
            margin: 0,
          }}
        >
          {SIGN_IN_STRIP.EYEBROW}
        </p>
        <p
          data-testid="discover-signin-copy"
          style={{
            fontFamily: FRAUNCES_STACK,
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: 28,
            lineHeight: 1.3,
            color: INK,
            margin: '16px 0 0',
          }}
        >
          {DISCOVER_PAGE_SIGNED_OUT}
        </p>
        <button
          type="button"
          data-testid="discover-signin-cta"
          onClick={login}
          style={{
            marginTop: 32,
            padding: '14px 28px',
            background: INK,
            color: CREAM,
            border: 'none',
            borderRadius: 9999,
            fontFamily: INTER_STACK,
            fontSize: 14,
            fontWeight: 500,
            letterSpacing: '0.02em',
            cursor: 'pointer',
            transition: 'background 180ms ease-out',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = ACCENT
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = INK
          }}
        >
          {SIGN_IN_STRIP.CTA}
        </button>
        <p
          style={{
            fontFamily: INTER_STACK,
            fontSize: 13,
            color: INK_SOFT,
            marginTop: 16,
          }}
        >
          {SIGN_IN_STRIP.HEADLINE}
        </p>
      </div>
    </section>
  )
}

export default function DiscoverPage() {
  const { isAuthenticated } = useAuth()

  return (
    <div
      data-testid="discover-page"
      style={{
        minHeight: '100vh',
        background: CREAM,
      }}
    >
      <Header current="discover" />
      <main>
        {isAuthenticated ? (
          <>
            <ProductGrid />
            <ComingSoonLine
              copy={DISCOVER_PAGE_COMING_SOON}
              testId="discover-coming-soon"
            />
          </>
        ) : (
          <DiscoverSigninPrompt />
        )}
      </main>
      <Footer />
      <CommandPill />
    </div>
  )
}
