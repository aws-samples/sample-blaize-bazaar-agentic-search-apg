/**
 * DetailPageShell — the outer frame every Atelier architecture page shares.
 *
 * Renders breadcrumb → title → subtitle → meta strip, then the page
 * body as children. The Skills page is the visual contract: same
 * crumb tracking, same Fraunces 44px italic-capable title, same
 * small-caps meta labels in burgundy.
 *
 * Usage:
 *
 *   <DetailPageShell
 *     crumb={['Atelier', 'Architecture', 'Memory']}
 *     title={<>Memory, <em>two-tiered.</em></>}
 *     subtitle="Short-term holds the conversation. Long-term holds everything else worth remembering."
 *     meta={[
 *       { label: 'STM size', value: '12 turns' },
 *       { label: 'LTM facts', value: '1,247' },
 *     ]}
 *   >
 *     ...page body...
 *   </DetailPageShell>
 */
import type { ReactNode } from 'react'
import '../../styles/atelier-shared.css'

export interface MetaEntry {
  label: string
  value: ReactNode
}

export interface DetailPageShellProps {
  /** Breadcrumb segments. The last one is styled burgundy (the current page). */
  crumb: string[]
  /** Page title — may include ``<em>`` markup via ReactNode. */
  title: ReactNode
  /** Italic serif subtitle below the title. */
  subtitle?: ReactNode
  /** 3–5 key/value pairs for the meta strip; labels render in burgundy small-caps. */
  meta?: MetaEntry[]
  /** The page body — sections, frames, live strip at the end. */
  children: ReactNode
}

export default function DetailPageShell({
  crumb,
  title,
  subtitle,
  meta,
  children,
}: DetailPageShellProps) {
  return (
    <div className="at-page">
      <div className="at-crumb">
        {crumb.map((segment, i) => {
          const isLast = i === crumb.length - 1
          return (
            <span key={`${segment}-${i}`}>
              {i > 0 && <span className="at-sep" aria-hidden>·</span>}{' '}
              <span className={isLast ? 'at-here' : ''}>{segment}</span>
            </span>
          )
        })}
      </div>

      <div>
        <h1 className="at-title">{title}</h1>
        {subtitle && <p className="at-sub">{subtitle}</p>}
        {meta && meta.length > 0 && (
          <div className="at-meta">
            {meta.map((entry, i) => (
              <div key={`${entry.label}-${i}`}>
                <span className="at-meta-label">{entry.label}</span>
                {entry.value}
              </div>
            ))}
          </div>
        )}
      </div>

      {children}
    </div>
  )
}
