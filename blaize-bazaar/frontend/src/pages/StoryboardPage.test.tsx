/**
 * StoryboardPage tests - minimal `/storyboard` index route.
 *
 * Validates Requirements 1.13.1, 1.13.3, 1.13.4.
 *
 * Coverage:
 *   - Header renders with Storyboard in the ink-highlighted
 *     current-page state (Req 1.13.4).
 *   - The 3-card Storyboard grid renders verbatim from copy.ts
 *     (Req 1.13.1 / reuse of Req 1.9).
 *   - The `Coming soon - the full editorial hub arrives with the
 *     next Edit.` editorial line renders in italic Fraunces
 *     (Req 1.13.1).
 *   - Footer and CommandPill render so the chrome matches the home
 *     page (Req 1.13.1).
 *
 * Context providers (AuthContext, CartContext, UIContext) are mocked
 * at the module level so the test focuses on the page composition
 * rather than the full provider chain.
 */
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { TEST_ROUTER_FUTURE_FLAGS } from '../test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// --- Mocks --------------------------------------------------------------

// useAuth - Storyboard page does not read auth, but Header does via the
// AccountButton child. Default to signed out.
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    accessToken: null,
    login: vi.fn(),
    logout: vi.fn(),
    loading: false,
    preferences: null,
    prefsVersion: 0,
  }),
}))

// useCart - Header reads cart items for the bag badge; return an empty bag.
vi.mock('../contexts/CartContext', () => ({
  useCart: () => ({
    items: [],
    setCartOpen: vi.fn(),
  }),
}))

// useUI - CommandPill reads toggleConcierge + activeModal.
const toggleConcierge = vi.fn()
vi.mock('../contexts/UIContext', () => ({
  useUI: () => ({
    activeModal: null,
    openModal: vi.fn(),
    closeModal: vi.fn(),
    toggleConcierge,
    openChat: vi.fn(),
    announcementDismissed: {
      legacy: false,
      search: false,
      agentic: false,
      production: false,
    },
    dismissAnnouncement: vi.fn(),
  }),
}))

import StoryboardPage from './StoryboardPage'
import { STORYBOARD_PAGE_COMING_SOON, STORYBOARD_TEASERS } from '../copy'

/**
 * StoryboardPage nests `<Header>` which renders a `<Link to="/workshop">`,
 * so every render needs a router ancestor. MemoryRouter is the minimal
 * wrapper — the test doesn't care about navigation behavior.
 */
function renderStoryboard(ui: ReactElement = <StoryboardPage />) {
  return render(<MemoryRouter future={TEST_ROUTER_FUTURE_FLAGS}>{ui}</MemoryRouter>)
}

beforeEach(() => {
  toggleConcierge.mockClear()
})

// --- Tests --------------------------------------------------------------

describe('StoryboardPage - header current-page state (Req 1.13.4)', () => {
  it('renders the sticky header with Storyboard in the current-page ink state', () => {
    renderStoryboard()

    const storyboardNav = screen.getByRole('button', { name: 'Storyboard' })
    expect(storyboardNav).toHaveAttribute('data-current', 'true')
    expect(storyboardNav).toHaveAttribute('aria-current', 'page')

    // Sanity: the other nav items are not highlighted.
    expect(screen.getByRole('button', { name: 'Home' })).toHaveAttribute(
      'data-current',
      'false',
    )
    expect(screen.getByRole('button', { name: 'Discover' })).toHaveAttribute(
      'data-current',
      'false',
    )
  })
})

describe('StoryboardPage - 3-card storyboard grid (Req 1.13.1)', () => {
  it('renders the reused StoryboardTeaser with all 3 cards', () => {
    renderStoryboard()

    // The teaser section is present.
    const teaser = screen.getByTestId('storyboard-teaser')
    expect(teaser).toBeInTheDocument()

    // 3 cards, not 1 (never collapse into a single editorial block).
    // Scope to the teaser region so Footer `<li>` elements do not leak
    // into the listitem count.
    const cards = within(teaser).getAllByRole('listitem')
    expect(cards).toHaveLength(3)

    // Spot-check the three authored eyebrows appear.
    STORYBOARD_TEASERS.forEach((_card, i) => {
      expect(
        screen.getByTestId(`storyboard-card-${i}`),
      ).toBeInTheDocument()
    })
  })
})

describe('StoryboardPage - Coming soon editorial line (Req 1.13.1, 1.13.3)', () => {
  it('renders the italic Fraunces coming-soon line with the exact copy from copy.ts', () => {
    renderStoryboard()

    const line = screen.getByTestId('storyboard-coming-soon')
    expect(line).toBeInTheDocument()
    expect(line).toHaveTextContent(STORYBOARD_PAGE_COMING_SOON)

    // The paragraph inside is rendered in italic Fraunces.
    const paragraph = line.querySelector('p')
    expect(paragraph).not.toBeNull()
    const style = paragraph?.getAttribute('style') ?? ''
    expect(style).toMatch(/font-style:\s*italic/)
    expect(style).toMatch(/Fraunces/)
  })
})

describe('StoryboardPage - site chrome (Req 1.13.1)', () => {
  it('renders the Footer and floating CommandPill alongside the header', () => {
    renderStoryboard()

    expect(screen.getByTestId('sticky-header')).toBeInTheDocument()
    expect(screen.getByTestId('footer')).toBeInTheDocument()
    expect(screen.getByTestId('command-pill')).toBeInTheDocument()
  })
})
