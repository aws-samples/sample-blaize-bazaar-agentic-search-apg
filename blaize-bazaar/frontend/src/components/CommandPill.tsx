/**
 * CommandPill - floating concierge shortcut pill.
 *
 * Validates Requirements 1.11.1 and 1.11.5.
 *
 * Contract:
 *   - Fixed in the bottom-right corner on every page (Req 1.11.1).
 *   - Compact dusk pill with a small B mark, the `Ask Blaize` label,
 *     and a styled `Cmd K` keycap.
 *   - Clicking the pill toggles the concierge modal via
 *     `useUI().toggleConcierge()` (Req 1.11.5) - the same behavior as
 *     the global Cmd+K / Ctrl+K shortcut (Req 1.11.2).
 *
 * Copy comes from the COMMAND_PILL block in copy.ts so the scanner
 * in `src/__tests__/copy.test.ts` keeps it honest. Platform detection
 * swaps the macOS command glyph for `Ctrl K` on non-Mac platforms.
 */
import { useEffect, useState } from 'react'

import { COMMAND_PILL } from '../copy'
import { useUI } from '../contexts/UIContext'

// --- Design tokens (storefront.md) ---------------------------------------
const CREAM = '#fbf4e8'
const CREAM_WARM = '#f5e8d3'
const INK_QUIET = '#a68668'

const INTER_STACK = 'Inter, system-ui, sans-serif'
const FRAUNCES_STACK = 'Fraunces, Georgia, serif'

function detectMac(): boolean {
  if (typeof navigator === 'undefined') return false
  // userAgentData is the forward-compatible API; fall back to platform.
  const uaData = (navigator as unknown as {
    userAgentData?: { platform?: string }
  }).userAgentData
  const platform = uaData?.platform ?? navigator.platform ?? ''
  return /mac|iphone|ipad|ipod/i.test(platform)
}

export default function CommandPill() {
  const { toggleConcierge, activeModal } = useUI()
  const [isMac, setIsMac] = useState(false)

  useEffect(() => {
    setIsMac(detectMac())
  }, [])

  const pressed = activeModal === 'concierge'
  const keycap = isMac ? COMMAND_PILL.KEY_CAP_MAC : COMMAND_PILL.KEY_CAP_WIN

  return (
    <button
      type="button"
      data-testid="command-pill"
      aria-label={`${COMMAND_PILL.LABEL} (${keycap})`}
      aria-pressed={pressed}
      onClick={toggleConcierge}
      className="concierge-glow"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 40,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px 10px 10px',
        borderRadius: 9999,
        background: 'rgba(45, 24, 16, 0.95)',
        WebkitBackdropFilter: 'blur(12px)',
        backdropFilter: 'blur(12px)',
        color: CREAM,
        border: 'none',
        fontFamily: INTER_STACK,
        fontSize: 13,
        fontWeight: 500,
        letterSpacing: '0.01em',
        cursor: 'pointer',
        transition:
          'transform 180ms ease-out, background 180ms ease-out',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <span
        aria-hidden="true"
        data-testid="command-pill-bmark"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: CREAM,
          color: '#2d1810',
          fontFamily: FRAUNCES_STACK,
          fontWeight: 600,
          fontSize: 12,
          lineHeight: 1,
        }}
      >
        B
      </span>
      <span
        data-testid="command-pill-label"
        style={{
          fontFamily: INTER_STACK,
          whiteSpace: 'nowrap',
        }}
      >
        {COMMAND_PILL.LABEL}
      </span>
      <span
        aria-hidden="true"
        data-testid="command-pill-keycap"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2px 8px',
          borderRadius: 6,
          border: `1px solid ${INK_QUIET}`,
          background: CREAM_WARM,
          color: '#2d1810',
          fontFamily: INTER_STACK,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.02em',
          minWidth: 28,
        }}
      >
        {keycap}
      </span>
    </button>
  )
}
