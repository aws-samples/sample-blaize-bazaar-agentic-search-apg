/**
 * WorkshopPage tests — pre-Week-3 layout redesign coverage.
 *
 * The layout redesign replaces the old modal pattern with an artifact-
 * style docked detail slot (react-resizable-panels on ≥ 1280px, overlay
 * on 1024-1280, stacked on < 1024). These tests lock down:
 *
 *   1. Back-to-storefront link is present and points to `/`.
 *   2. Architecture cards render as single-column widened cards.
 *   3. Clicking an architecture card action opens the matching detail
 *      panel inline (not as a modal overlay) on desktop.
 *   4. Closing the detail panel returns to the two-zone default.
 *   5. Responsive breakpoints select the correct layout variant via
 *      matchMedia — three-zone, tablet-overlay, vertical-stack.
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// --- Mocks -----------------------------------------------------------

// AuthContext needs to pass through cleanly. Cognito isn't configured
// in the test env so AuthGate short-circuits to children — but
// useAuth still needs to resolve.
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

// Stub the heavy child components so the test focuses on layout chrome,
// not their internal render paths. WorkshopChat kicks off a fetch to
// /api/workshop/status which we don't want here.
vi.mock('../components/WorkshopChat', () => ({
  default: () => <div data-testid="stub-workshop-chat">chat</div>,
}))
vi.mock('../components/WorkshopTelemetry', () => ({
  default: () => <div data-testid="stub-workshop-telemetry">telemetry</div>,
}))
vi.mock('../components/MemoryDashboard', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="stub-memory-dashboard">
      memory
      <button onClick={onClose} data-testid="stub-memory-close">
        close
      </button>
    </div>
  ),
}))
vi.mock('../components/GatewayToolsPanel', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="stub-gateway-panel">
      gateway
      <button onClick={onClose} data-testid="stub-gateway-close">
        close
      </button>
    </div>
  ),
}))
vi.mock('../components/ObservabilityPanel', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="stub-obs-panel">
      obs
      <button onClick={onClose} data-testid="stub-obs-close">
        close
      </button>
    </div>
  ),
}))
vi.mock('../components/RuntimeStatusPanel', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="stub-runtime-panel">
      runtime
      <button onClick={onClose} data-testid="stub-runtime-close">
        close
      </button>
    </div>
  ),
}))
vi.mock('../components/IndexPerformanceDashboard', () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="stub-bench-modal">bench</div> : null,
}))
vi.mock('../components/Footer', () => ({
  default: () => <div data-testid="stub-footer">footer</div>,
}))

// matchMedia is jsdom-missing by default. We control it per-test so we
// can drive the three responsive bands deterministically.
type MatchFactory = (query: string) => boolean

function installMatchMedia(matches: MatchFactory) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: matches(query),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  })
}

import WorkshopPage from './WorkshopPage'

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/workshop']}>
      <WorkshopPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  // Default to laptop viewport — three-zone layout.
  installMatchMedia((q) => q.includes('min-width: 1280px'))
})

afterEach(() => {
  vi.restoreAllMocks()
})

// --- Tests ------------------------------------------------------------

describe('WorkshopPage — chrome', () => {
  it('renders the back-to-storefront link pointing at "/"', () => {
    renderPage()
    const back = screen.getByTestId('back-to-storefront')
    expect(back).toBeInTheDocument()
    expect(back.getAttribute('href')).toBe('/')
    expect(back.getAttribute('aria-label')).toContain('storefront')
  })

  it('renders the DAT406 title + subtitle', () => {
    renderPage()
    expect(screen.getByText(/DAT406 · Builders Session/)).toBeInTheDocument()
    expect(screen.getByText(/Workshop · agentic telemetry/)).toBeInTheDocument()
  })
})

describe('WorkshopPage — architecture cards open detail panels inline', () => {
  it('opens MemoryDashboard when the memory card action is clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    // No detail slot before click.
    expect(screen.queryByTestId('detail-panel-slot')).not.toBeInTheDocument()

    await user.click(screen.getByTestId('arch-card-open-memory'))

    await waitFor(() =>
      expect(screen.getByTestId('stub-memory-dashboard')).toBeInTheDocument(),
    )
    // Inline, not modal: the detail-panel-slot wrapper is what marks it.
    expect(screen.getByTestId('detail-panel-slot')).toBeInTheDocument()
  })

  it('swaps to GatewayToolsPanel when the tool-registry card is clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByTestId('arch-card-open-memory'))
    await waitFor(() => screen.getByTestId('stub-memory-dashboard'))

    await user.click(screen.getByTestId('arch-card-open-tool-registry'))
    await waitFor(() => {
      expect(screen.getByTestId('stub-gateway-panel')).toBeInTheDocument()
      expect(screen.queryByTestId('stub-memory-dashboard')).not.toBeInTheDocument()
    })
  })

  it('closing the detail panel returns to the two-zone default', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByTestId('arch-card-open-memory'))
    await waitFor(() => screen.getByTestId('stub-memory-dashboard'))

    await user.click(screen.getByTestId('stub-memory-close'))
    await waitFor(() =>
      expect(screen.queryByTestId('stub-memory-dashboard')).not.toBeInTheDocument(),
    )
    expect(screen.queryByTestId('detail-panel-slot')).not.toBeInTheDocument()
  })

  it('opens IndexPerformanceDashboard as a modal (not inline) since the perf tab is deferred', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByTestId('arch-card-open-state'))
    await waitFor(() => expect(screen.getByTestId('stub-bench-modal')).toBeInTheDocument())
    // The bench is still a modal — NOT inline in the detail slot.
    expect(screen.queryByTestId('detail-panel-slot')).not.toBeInTheDocument()
  })
})

describe('WorkshopPage — responsive breakpoints', () => {
  it('selects "three-zone" layout on ≥ 1280px viewports', () => {
    installMatchMedia((q) => q.includes('min-width: 1280px'))
    renderPage()
    const main = screen.getByTestId('workshop-main')
    expect(main.getAttribute('data-layout')).toBe('three-zone')
  })

  it('selects "tablet-overlay" layout on 1024-1280 viewports', () => {
    installMatchMedia((q) => q.includes('1024px) and (max-width: 1279.98px'))
    renderPage()
    const main = screen.getByTestId('workshop-main')
    expect(main.getAttribute('data-layout')).toBe('tablet-overlay')
  })

  it('selects "vertical-stack" layout on < 1024px viewports', () => {
    installMatchMedia(() => false)
    renderPage()
    const main = screen.getByTestId('workshop-main')
    expect(main.getAttribute('data-layout')).toBe('vertical-stack')
  })

  it('on vertical-stack, the detail panel renders as a stacked block', async () => {
    installMatchMedia(() => false)
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByTestId('arch-card-open-memory'))
    await waitFor(() =>
      expect(screen.getByTestId('detail-panel-stacked')).toBeInTheDocument(),
    )
  })

  it('on tablet-overlay, the detail panel renders as a docked overlay', async () => {
    installMatchMedia((q) => q.includes('1024px) and (max-width: 1279.98px'))
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByTestId('arch-card-open-memory'))
    await waitFor(() =>
      expect(screen.getByTestId('detail-panel-tablet-overlay')).toBeInTheDocument(),
    )
  })
})
