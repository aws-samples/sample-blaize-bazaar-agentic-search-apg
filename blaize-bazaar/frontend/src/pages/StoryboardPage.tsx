/**
 * StoryboardPage - minimal `/storyboard` index route.
 *
 * Validates Requirements 1.13.1, 1.13.3, 1.13.4.
 *
 * Composition:
 *   - Header (sticky) with `current="storyboard"` so the Storyboard nav
 *     item takes the ink-highlighted current-page state (Req 1.13.4).
 *   - The 3-card StoryboardTeaser grid from the home page (Req 1.9 /
 *     4.8), reused as-is.
 *   - A single ComingSoonLine (`Coming soon - the full editorial hub
 *     arrives with the next Edit.`) in italic Fraunces (Req 1.13.1).
 *   - Footer and floating CommandPill, so the chrome matches the home
 *     page (Req 1.13.1).
 *
 * The route is intentionally small - the full editorial hub lands in
 * a later Edit. Copy from copy.ts; Req 1.12 rules enforced there.
 */
import CommandPill from '../components/CommandPill'
import Footer from '../components/Footer'
import Header from '../components/Header'
import StoryboardTeaser from '../components/StoryboardTeaser'
import { STORYBOARD_PAGE_COMING_SOON } from '../copy'
import ComingSoonLine from './ComingSoonLine'

const CREAM = '#fbf4e8'

export default function StoryboardPage() {
  return (
    <div
      data-testid="storyboard-page"
      style={{
        minHeight: '100vh',
        background: CREAM,
      }}
    >
      <Header current="storyboard" />
      <main>
        <StoryboardTeaser />
        <ComingSoonLine
          copy={STORYBOARD_PAGE_COMING_SOON}
          testId="storyboard-coming-soon"
        />
      </main>
      <Footer />
      <CommandPill />
    </div>
  )
}
