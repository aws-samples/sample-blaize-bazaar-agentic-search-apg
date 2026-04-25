/**
 * Header — Storefront sticky header.
 *
 * Renders exactly five nav items (Home, Shop, Storyboard, Discover, Account),
 * a centered "Blaize Bazaar" wordmark with a circular B logo, and the right
 * actions: Workshop link (hidden below 768px), Account state button, and a
 * Bag icon with a live count badge. The concierge is not duplicated here —
 * the hero SearchPill and the floating CommandPill are the two entry points
 * so the header stays uncluttered.
 *
 * Validates Requirements 1.1.3, 1.2.1 through 1.2.4.
 *
 * Copy comes from `copy.ts`. No legacy About/Journal items; About content
 * lives in the Footer per `storefront.md`.
 */
import { Link } from 'react-router-dom'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { NAV, ACCOUNT_LABEL_SIGNED_OUT, accountLabelSignedIn } from '../copy'
import { ShoppingBag, User as UserIcon } from 'lucide-react'

// Warm palette from `storefront.md`. Kept inline as hex until a design-token
// stylesheet lands workspace-wide.
const CREAM = '#fbf4e8'
const INK = '#2d1810'
const INK_SOFT = '#6b4a35'

export type NavItem = 'home' | 'shop' | 'storyboard' | 'discover' | 'account'

interface HeaderProps {
  /** Which nav item is the current page — gets the ink highlight. Defaults to 'home'. */
  current?: NavItem
  /** Optional click handler fired when any nav link is activated. */
  onNavigate?: (item: NavItem) => void
  /** Optional click handler for the Account button. Default opens the auth modal. */
  onAccountClick?: () => void
}

/**
 * AccountButton — toggles label based on `useAuth().user`.
 *
 * Signed out: icon + "Account" (copy.ACCOUNT_LABEL_SIGNED_OUT).
 * Signed in:  icon + "Hi, {givenName}" via copy.accountLabelSignedIn().
 *
 * The user's `givenName` comes from the Cognito `given_name` claim. If the
 * auth payload only carries an email (pre-C9 state), we fall back to the
 * email's local-part so the "signed in" branch remains truthful rather than
 * silently showing the signed-out label.
 */
function AccountButton({ onClick }: { onClick?: () => void }) {
  const auth = useAuth()
  const user = auth.user as
    | (typeof auth.user & { givenName?: string; given_name?: string; email?: string })
    | null

  const signedIn = Boolean(user)
  const givenName =
    (user && (user.givenName || user.given_name)) ||
    (user?.email ? user.email.split('@')[0] : undefined)

  const label = signedIn && givenName
    ? accountLabelSignedIn(givenName)
    : ACCOUNT_LABEL_SIGNED_OUT

  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="account-button"
      aria-label={label}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-opacity hover:opacity-80"
      style={{ color: INK, background: 'transparent' }}
    >
      <UserIcon className="w-4 h-4" aria-hidden="true" />
      <span>{label}</span>
    </button>
  )
}

/**
 * Wordmark — centered "Blaize Bazaar" with a small circular B logo.
 */
function Wordmark() {
  return (
    <a
      href="/"
      data-testid="wordmark"
      aria-label={NAV.WORDMARK}
      className="flex items-center gap-2 select-none"
      style={{ color: INK }}
    >
      <span
        aria-hidden="true"
        className="inline-flex items-center justify-center rounded-full font-semibold"
        style={{
          width: 28,
          height: 28,
          background: INK,
          color: CREAM,
          fontSize: 14,
          fontFamily: 'Fraunces, serif',
        }}
      >
        B
      </span>
      <span
        style={{
          fontFamily: 'Fraunces, serif',
          fontWeight: 500,
          fontSize: 20,
          letterSpacing: '-0.01em',
        }}
      >
        {NAV.WORDMARK}
      </span>
    </a>
  )
}

interface NavLinkProps {
  item: NavItem
  label: string
  current: NavItem
  onClick?: (item: NavItem) => void
}

function NavLink({ item, label, current, onClick }: NavLinkProps) {
  const isCurrent = current === item
  return (
    <button
      type="button"
      data-nav-item={item}
      data-current={isCurrent ? 'true' : 'false'}
      aria-current={isCurrent ? 'page' : undefined}
      onClick={() => onClick?.(item)}
      className="text-[14px] transition-opacity hover:opacity-70"
      style={{
        color: isCurrent ? INK : INK_SOFT,
        fontWeight: isCurrent ? 600 : 400,
        background: 'transparent',
        padding: '6px 0',
      }}
    >
      {label}
    </button>
  )
}

export default function Header({
  current = 'home',
  onNavigate,
  onAccountClick,
}: HeaderProps = {}) {
  const { items: cartItems, setCartOpen } = useCart()
  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <header
      role="banner"
      data-testid="sticky-header"
      className="sticky top-0 z-40 w-full border-b backdrop-blur-md"
      style={{
        background: 'rgba(251, 244, 232, 0.9)',
        borderColor: 'rgba(45, 24, 16, 0.08)',
        WebkitBackdropFilter: 'blur(12px)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <nav
        aria-label="Primary"
        className="relative h-[64px] px-4 md:px-6 lg:px-8"
      >
        <div className="h-full max-w-[1440px] mx-auto flex items-center justify-between gap-4">
          {/* Left: four text nav items (Home | Shop | Storyboard | Discover).
              Account is grouped with the right-side actions per the storefront.md spec. */}
          <div className="flex items-center gap-6 flex-shrink-0">
            <NavLink item="home" label={NAV.HOME} current={current} onClick={onNavigate} />
            <NavLink item="shop" label={NAV.SHOP} current={current} onClick={onNavigate} />
            <NavLink
              item="storyboard"
              label={NAV.STORYBOARD}
              current={current}
              onClick={onNavigate}
            />
            <NavLink
              item="discover"
              label={NAV.DISCOVER}
              current={current}
              onClick={onNavigate}
            />
          </div>

          {/* Center: wordmark, absolutely positioned so right/left alignment is
              unaffected by responsive width changes. */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
            data-testid="wordmark-wrapper"
          >
            <Wordmark />
          </div>

          {/* Right: Workshop link (hidden <768px), Account, Bag. The
              concierge entry points are the hero SearchPill and the
              floating CommandPill; duplicating them here would give three
              identical surfaces on one page. */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <Link
              to="/workshop"
              data-testid="workshop-link"
              className="hidden md:inline text-[14px] transition-opacity hover:opacity-70"
              style={{ color: INK_SOFT, background: 'transparent' }}
            >
              Workshop
            </Link>

            {/* Account button — nav item #5. Its label swaps on auth state. */}
            <AccountButton onClick={onAccountClick} />

            <button
              type="button"
              onClick={() => setCartOpen(true)}
              aria-label="Bag"
              data-testid="bag-button"
              className="relative p-2 rounded-full transition-opacity hover:opacity-80"
              style={{ color: INK, background: 'transparent' }}
            >
              <ShoppingBag className="w-5 h-5" aria-hidden="true" />
              {cartItemCount > 0 && (
                <span
                  data-testid="bag-count"
                  className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-semibold"
                  style={{ background: INK, color: CREAM }}
                >
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>
    </header>
  )
}
