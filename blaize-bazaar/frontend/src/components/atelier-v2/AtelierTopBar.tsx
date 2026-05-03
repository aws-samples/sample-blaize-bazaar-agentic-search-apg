import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePersona } from '../../contexts/PersonaContext'
import { useCatalog } from '../atelier-arch/shared-catalog'

/**
 * AtelierTopBar — horizontal bar that sits above the Atelier canvas.
 *
 * Two responsibilities:
 *   1. Left: BOUTIQUE | ATELIER toggle. ATELIER is the active surface, so it
 *      carries the burgundy indicator dot. Clicking BOUTIQUE navigates home.
 *   2. Right: three light metadata chips — a live MM:SS session timer, the
 *      current agent count (pulled from the shared catalog), and an avatar
 *      bubble derived from the active persona. All typography is Inter with
 *      the editorial 11px / 0.22em uppercase tracking used throughout the
 *      Atelier header chrome.
 *
 * Pure presentation; no side effects beyond the internal timer.
 */
export function AtelierTopBar() {
  const navigate = useNavigate()
  const { persona } = usePersona()
  const { catalog } = useCatalog()

  const [elapsed, setElapsed] = useState(767) // seed at 00:12:47 for a "mid-session" feel
  useEffect(() => {
    const id = window.setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => window.clearInterval(id)
  }, [])

  const agentCount = catalog?.agents.length ?? 6
  const initial =
    persona?.avatar_initial ||
    persona?.display_name?.charAt(0)?.toUpperCase() ||
    'A'

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')
  const timer = `${mm}:${ss}`

  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 500,
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
  }

  return (
    <div
      className="flex items-center justify-between px-8 font-sans"
      style={{
        height: '64px',
        background: '#faf3e8',
        borderBottom: '1px solid rgba(31, 20, 16, 0.08)',
      }}
    >
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/')}
          style={{ ...labelStyle, color: 'rgba(31, 20, 16, 0.55)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          Boutique
        </button>
        <span style={{ ...labelStyle, color: 'rgba(31, 20, 16, 0.15)' }}>|</span>
        <span className="flex items-center gap-2">
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '999px',
              background: '#c44536',
              display: 'inline-block',
            }}
          />
          <span style={{ ...labelStyle, color: '#1f1410' }}>Atelier</span>
        </span>
      </div>

      <div className="flex items-center" style={{ gap: '24px' }}>
        <span style={{ ...labelStyle, color: 'rgba(31, 20, 16, 0.55)' }}>
          Live session ·{' '}
          <span className="font-mono" style={{ letterSpacing: '0.04em', color: '#1f1410' }}>{timer}</span>
        </span>
        <span style={{ ...labelStyle, color: 'rgba(31, 20, 16, 0.55)' }}>
          Agents online ·{' '}
          <span style={{ color: '#1f1410' }}>{agentCount}</span>
        </span>
        <div
          className="flex items-center justify-center"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '999px',
            background: persona?.avatar_color || '#1f1410',
            color: '#faf3e8',
            fontSize: '13px',
            fontWeight: 600,
            letterSpacing: '0.02em',
          }}
        >
          {initial}
        </div>
      </div>
    </div>
  )
}

export default AtelierTopBar
