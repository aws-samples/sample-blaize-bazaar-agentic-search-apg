/**
 * Header tests — storefront sticky header.
 *
 * Validates Requirements 1.1.3, 1.2.1, 1.2.2, 1.2.3, 1.2.4.
 *
 * Design goals:
 *  - renders exactly 5 nav items (Home, Shop, Storyboard, Discover, Account)
 *  - does NOT render an "Ask Blaize" link (superseded by the hero SearchPill
 *    and floating CommandPill — three entry points was noise on one page)
 *  - swaps the Account label based on `useAuth().user` (1.2.2, 1.2.3)
 *  - carries no legacy About/Journal items (1.2.4)
 *
 * The CartContext and AuthContext are mocked at the module level so the test
 * stays focused on the Header's behavior without pulling in the full workshop
 * chrome (CartProvider depends on LayoutContext which pulls in the entire app).
 *
 * Header internally renders a `<Link to="/workshop">` from react-router-dom,
 * so every render wraps in a `<MemoryRouter>` via the `renderHeader` helper.
 */
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { TEST_ROUTER_FUTURE_FLAGS } from '../test-utils'

// --- Mocks -------------------------------------------------------------

// useAuth — controlled per-test via the `mockUser` variable below.
let mockUser: { sub?: string; email?: string; givenName?: string } | null = null
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: mockUser !== null,
    accessToken: null,
    login: () => {},
    logout: () => {},
    loading: false,
  }),
}))

// useCart — only `items` and `setCartOpen` are exercised by Header.
let mockCartItems: Array<{ productId: number; quantity: number }> = []
const setCartOpen = vi.fn()
vi.mock('../contexts/CartContext', () => ({
  useCart: () => ({
    items: mockCartItems,
    setCartOpen,
  }),
}))

// usePersona — Header now uses the persona pill instead of AccountButton.
let mockPersona: { id: string; display_name: string; avatar_initial: string; avatar_color: string; customer_id: string; role_tag: string; stats: any } | null = null
vi.mock('../contexts/PersonaContext', () => ({
  usePersona: () => ({
    persona: mockPersona,
    switchPersona: vi.fn(),
    signOut: vi.fn(),
    switching: false,
  }),
}))

// Import Header AFTER mocks so the mocked hooks are bound inside the module.
import Header from './Header'

// --- Helpers -----------------------------------------------------------

/**
 * Render the Header wrapped in a MemoryRouter. The Header renders a
 * `<Link to="/workshop">`, which requires a Router ancestor — without
 * one, Link's useContext(NavigationContext) returns null and destructuring
 * `basename` throws. Tests don't care about navigation behavior, just that
 * the link renders, so MemoryRouter is the minimal wrapper.
 */
function renderHeader(ui: ReactElement = <Header />) {
  return render(<MemoryRouter future={TEST_ROUTER_FUTURE_FLAGS}>{ui}</MemoryRouter>)
}

beforeEach(() => {
  mockUser = null
  mockCartItems = []
  setCartOpen.mockClear()
})

// --- Tests -------------------------------------------------------------

describe('Header — nav items + persona pill', () => {
  it('renders four text nav items plus the persona pill', () => {
    renderHeader()

    const navItems = screen.getAllByRole('button', { name: /^(Home|Shop|Storyboard|Discover)$/ })
    expect(navItems).toHaveLength(4)
    expect(navItems.map(el => el.textContent)).toEqual([
      'Home',
      'Shop',
      'Storyboard',
      'Discover',
    ])

    // The persona pill replaces the old Account button.
    const pill = screen.getByTestId('persona-pill')
    expect(pill).toBeInTheDocument()
  })

  it('renders the Blaize Bazaar wordmark centered', () => {
    renderHeader()
    const wordmark = screen.getByTestId('wordmark')
    expect(wordmark).toHaveTextContent('Blaize Bazaar')
  })

  it('has no legacy About/Journal nav items (Req 1.2.4)', () => {
    renderHeader()
    expect(screen.queryByRole('button', { name: /about/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /journal/i })).not.toBeInTheDocument()
  })

  it('applies the current-page ink highlight to Home by default', () => {
    renderHeader()
    const home = screen.getByRole('button', { name: 'Home' })
    expect(home).toHaveAttribute('data-current', 'true')
    expect(home).toHaveAttribute('aria-current', 'page')

    const shop = screen.getByRole('button', { name: 'Shop' })
    expect(shop).toHaveAttribute('data-current', 'false')
  })

  it('can mark a non-Home item as the current page via props', () => {
    renderHeader(<Header current="storyboard" />)
    expect(screen.getByRole('button', { name: 'Storyboard' })).toHaveAttribute(
      'data-current',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Home' })).toHaveAttribute(
      'data-current',
      'false',
    )
  })
})

describe('Header — concierge entry point consolidation', () => {
  it('does NOT render an "Ask Blaize" link in the header', () => {
    // The hero SearchPill and floating CommandPill are the two concierge
    // entry points. A third link in the header was redundant.
    renderHeader()
    expect(screen.queryByTestId('ask-blaize-link')).not.toBeInTheDocument()
  })

  it('keeps the centered wordmark visible regardless of breakpoint', () => {
    renderHeader()
    const wordmarkWrapper = screen.getByTestId('wordmark-wrapper')
    // The wrapper is not gated by any `hidden` class.
    expect(wordmarkWrapper.className).not.toMatch(/\bhidden\b/)
  })
})

describe('Header — Persona pill swaps on persona state', () => {
  it('shows "Sign in" when no persona is active', () => {
    mockPersona = null
    renderHeader()
    const pill = screen.getByTestId('persona-pill')
    expect(pill).toHaveTextContent('Sign in')
  })

  it('shows the espresso pill with persona name when signed in', () => {
    mockPersona = {
      id: 'marco',
      display_name: 'Marco',
      avatar_initial: 'M',
      avatar_color: '#5a3528',
      customer_id: 'CUST-MARCO',
      role_tag: 'Returning',
      stats: { visits: 11, orders: 7, last_seen_days: 21 },
    }
    renderHeader()
    const pill = screen.getByTestId('persona-pill')
    expect(pill).toHaveTextContent('Marco')
    expect(pill).toHaveTextContent('SIGNED IN AS')
  })
})

describe('Header — Bag badge', () => {
  it('does not render the count badge when the bag is empty', () => {
    mockCartItems = []
    renderHeader()
    expect(screen.queryByTestId('bag-count')).not.toBeInTheDocument()
  })

  it('renders the live count when items are present', () => {
    mockCartItems = [
      { productId: 1, quantity: 2 },
      { productId: 2, quantity: 1 },
    ]
    renderHeader()
    expect(screen.getByTestId('bag-count')).toHaveTextContent('3')
  })
})
