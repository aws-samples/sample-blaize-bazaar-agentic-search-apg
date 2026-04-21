/**
 * AnnouncementBar — Storefront announcement strip above the sticky header.
 *
 * Renders the exact copy from `copy.ts` (ANNOUNCEMENT) in 11px with
 * tracking-[0.12em] on a dusk background. Validates Requirement 1.1.2.
 *
 * Kept intentionally tiny so the home page can compose it above <Header/>
 * without pulling in the full workshop chrome.
 */
import { ANNOUNCEMENT } from '../copy'

const DUSK = '#3d2518'
const CREAM = '#fbf4e8'

export default function AnnouncementBar() {
  return (
    <div
      role="region"
      aria-label="Site announcements"
      data-testid="announcement-bar"
      className="w-full text-center"
      style={{
        background: DUSK,
        color: CREAM,
        fontSize: '11px',
        letterSpacing: '0.12em',
        lineHeight: 1.8,
        wordSpacing: '0.08em',
        textTransform: 'uppercase',
        padding: '10px 16px',
      }}
    >
      <span className="tracking-[0.12em]">{ANNOUNCEMENT}</span>
    </div>
  )
}
