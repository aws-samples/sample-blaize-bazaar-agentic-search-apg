/**
 * Header tests — storefront sticky header.
 *
 * Validates Requirements 1.1.3, 1.2.1, 1.2.2, 1.2.3, 1.2.4, 1.2.5.
 *
 * Design goals:
 *  - renders exactly 5 nav items (Home, Shop, Storyboard, Discover, Account)
 *  - hides the "Ask Blaize" text link below 768px (1.2.5)
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
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

beforeEach(() => {
  mockUser = null
  mockCartItems = []
  setCartOpen.mockClear()
})

// --- Tests -------------------------------------------------------------

describe('Header — 5 nav items', () => {
  it('renders exactly five nav items in the documented order', () => {
    renderHeader()

    const navItems = screen.getAllByRole('button', { name: /^(Home|Shop|Storyboard|Discover)$/ })
    // 4 text nav links …
    expect(navItems).toHaveLength(4)
    expect(navItems.map(el => el.textContent)).toEqual([
      'Home',
      'Shop',
      'Storyboard',
      'Discover',
    ])

    // … plus the Account button as the 5th nav item.
    const account = screen.getByTestId('account-button')
    expect(account).toBeInTheDocument()
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

describe('Header — "Ask Blaize" text link responsive visibility (Req 1.2.5)', () => {
  it('renders the Ask Blaize text link marked hidden below 768px via `hidden md:inline`', () => {
    renderHeader()
    const askBlaize = screen.getByTestId('ask-blaize-link')
    expect(askBlaize).toHaveTextContent('Ask Blaize')

    // Tailwind's `hidden md:inline` is the contract: `hidden` by default,
    // visible at the `md` (768px) breakpoint. Asserting on these classes is
    // the stable way to validate responsive behavior in jsdom where layout
    // isn't computed from CSS media queries.
    expect(askBlaize).toHaveClass('hidden')
    expect(askBlaize).toHaveClass('md:inline')
  })

  it('keeps the centered wordmark visible regardless of breakpoint', () => {
    renderHeader()
    const wordmarkWrapper = screen.getByTestId('wordmark-wrapper')
    // The wrapper is not gated by any `hidden` class.
    expect(wordmarkWrapper.className).not.toMatch(/\bhidden\b/)
  })
})

describe('Header — Account label swaps on auth state (Req 1.2.2, 1.2.3)', () => {
  it('shows "Account" when signed out', () => {
    mockUser = null
    renderHeader()
    const account = screen.getByTestId('account-button')
    expect(account).toHaveTextContent('Account')
    expect(account).not.toHaveTextContent(/^Hi,/)
  })

  it('shows "Hi, {givenName}" when signed in with a given_name claim', () => {
    mockUser = { sub: 'abc-123', email: 'ada@example.com', givenName: 'Ada' }
    renderHeader()
    expect(screen.getByTestId('account-button')).toHaveTextContent('Hi, Ada')
  })

  it('falls back to email local-part when given_name is not yet available', () => {
    // Pre-C9 AuthContext carries only sub + email; the button should still
    // reflect a signed-in state rather than displaying the signed-out label.
    mockUser = { sub: 'abc-123', email: 'grace@example.com' }
    renderHeader()
    expect(screen.getByTestId('account-button')).toHaveTextContent('Hi, grace')
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
