/**
 * AtelierFooterStats
 *
 * Full-width footer strip shown below the three Atelier detail cards.
 * Contains a left-aligned tagline, a center "AT A GLANCE" block with four
 * key metrics, and a right-aligned "Download session report" button.
 *
 * Part of the Atelier v2 redesign. Self-contained; no cross-imports.
 */

import { Sparkles, Download } from 'lucide-react'

interface AtelierFooterStatsProps {
  activeAgents?: number
  dataSources?: number
  decisionsToday?: string
  successRate?: string
  onDownload?: () => void
}

const INK = '#1f1410'
const BURGUNDY = '#c44536'
const CREAM_WARM = '#f5e8d3'
const MUTED = 'rgba(31,20,16,0.6)'
const BORDER = 'rgba(31,20,16,0.08)'

export function AtelierFooterStats({
  activeAgents = 12,
  dataSources = 4,
  decisionsToday = '3.2K',
  successRate = '96.7%',
  onDownload,
}: AtelierFooterStatsProps) {
  const handleDownload = () => {
    if (onDownload) {
      onDownload()
    } else if (typeof window !== 'undefined') {
      window.print()
    }
  }

  const metrics: Array<{ value: string; label: string }> = [
    { value: String(activeAgents), label: 'Active agents' },
    { value: String(dataSources), label: 'Data sources' },
    { value: decisionsToday, label: 'Decisions today' },
    { value: successRate, label: 'Success rate' },
  ]

  return (
    <div
      className="flex items-center font-sans"
      style={{
        width: '100%',
        background: CREAM_WARM,
        padding: '24px 48px',
        borderTop: `1px solid ${BORDER}`,
        gap: '32px',
        flexWrap: 'wrap',
        color: INK,
      }}
    >
      {/* Left: sparkle + tagline */}
      <div className="flex items-start" style={{ gap: '10px', flex: 1, minWidth: '240px' }}>
        <Sparkles size={20} color={BURGUNDY} style={{ flexShrink: 0, marginTop: '2px' }} />
        <p
          className="font-display italic"
          style={{
            fontSize: '15px',
            color: MUTED,
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          The Atelier doesn&rsquo;t just automate.
          <br />
          It reasons, remembers and refines.
        </p>
      </div>

      {/* Center: AT A GLANCE + metrics */}
      <div className="flex flex-col" style={{ gap: '8px' }}>
        <span
          style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: MUTED,
          }}
        >
          AT A GLANCE
        </span>
        <div className="flex" style={{ gap: '32px' }}>
          {metrics.map((m) => (
            <div key={m.label} className="flex flex-col" style={{ gap: '2px' }}>
              <span className="font-display" style={{ fontSize: '28px', color: INK, lineHeight: 1 }}>
                {m.value}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: MUTED,
                }}
              >
                {m.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Right: download button */}
      <button
        type="button"
        onClick={handleDownload}
        className="inline-flex items-center"
        style={{
          gap: '8px',
          background: '#ffffff',
          border: '1px solid rgba(31,20,16,0.12)',
          borderRadius: '9999px',
          padding: '10px 16px',
          fontSize: '13px',
          color: INK,
          cursor: 'pointer',
        }}
      >
        <Download size={16} />
        Download session report
      </button>
    </div>
  )
}

export default AtelierFooterStats
