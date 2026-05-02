/**
 * BoutiqueHero — editorial photograph with center-aligned typography.
 *
 * Full-bleed photograph background (Olive Branch Vessel). Typography
 * overlays the right portion of the photograph where the cream wall
 * provides a clean reading surface. Within the typography column,
 * every element center-aligns for symmetric editorial breathing room.
 *
 * Search bar: substantial pill (~58px tall), Sparkles icon left,
 * espresso-filled circular mic button right — signals AI-powered search.
 *
 * Mobile (<768px): typography column fills full width, gradient overlay
 * ensures readability against the photograph's underlying composition.
 */
import { useCallback, useState } from 'react'
import { Sparkles, Mic } from 'lucide-react'
import { useUI } from '../contexts/UIContext'
import heroImage from '../assets/hero/boutique-hero.png'

const SUGGESTIONS = [
  'something for long summer walks',
  'a thoughtful gift for someone who runs',
  'something to wear for warm evenings out',
  'pieces that travel well',
  'something for slow Sunday mornings',
  'a linen piece that earns its golden hour',
]

const TRUST_ITEMS = [
  'Curated by hand',
  'Live inventory',
  'Free shipping over $150',
  'Ships in 1\u20132 days',
  'Easy returns',
]

export default function BoutiqueHero() {
  const { openDrawerWithQuery } = useUI()
  const [searchValue, setSearchValue] = useState('')

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const trimmed = searchValue.trim()
      if (!trimmed) return
      openDrawerWithQuery(trimmed)
      setSearchValue('')
    },
    [searchValue, openDrawerWithQuery],
  )

  const handleMicClick = useCallback(() => {
    const trimmed = searchValue.trim()
    if (!trimmed) return
    openDrawerWithQuery(trimmed)
    setSearchValue('')
  }, [searchValue, openDrawerWithQuery])

  const handlePillClick = useCallback(
    (query: string) => {
      openDrawerWithQuery(query)
    },
    [openDrawerWithQuery],
  )

  return (
    <section
      data-testid="boutique-hero"
      aria-label="Search and discover"
      className="relative w-full overflow-hidden"
      style={{ minHeight: 'min(85vh, calc(100dvh - 100px))' }}
    >
      {/* ── Full-bleed photograph ── */}
      <img
        src={heroImage}
        alt="Sculptural ceramic vase with olive branch in warm editorial light"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: 'center 80%' }}
      />

      {/* ── Mobile-only gradient overlay for readability ── */}
      <div
        className="absolute inset-0 md:hidden pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            'linear-gradient(180deg, rgba(250,243,232,0) 0%, rgba(250,243,232,0.7) 55%, rgba(250,243,232,0.95) 100%)',
        }}
      />

      {/* ── Typography overlay — asymmetric placement, centered contents ── */}
      <div
        className="relative z-10 h-full w-full"
        style={{ minHeight: 'min(85vh, calc(100dvh - 100px))' }}
      >
        <div
          className="h-full max-w-[1440px] mx-auto px-6 md:px-8 lg:px-12
                     grid grid-cols-1 md:grid-cols-12 items-center"
          style={{ minHeight: 'min(85vh, calc(100dvh - 100px))' }}
        >
          {/* Typography column: cols 5–11 on desktop (right-of-center within
              the photograph). Narrower than full cols 6-12 so contents
              center within the cream-wall area rather than drifting right. */}
          <div
            className="md:col-start-5 md:col-span-7 py-12 md:py-0
                       flex flex-col items-center text-center"
            style={{ maxWidth: '680px', justifySelf: 'center' }}
          >
            {/* Headline — one line, italic Fraunces */}
            <h1
              data-testid="boutique-hero-headline"
              className="whitespace-nowrap"
              style={{
                fontFamily: "'Fraunces', Georgia, serif",
                fontStyle: 'italic',
                fontSize: 'clamp(40px, 5vw, 72px)',
                lineHeight: 1.0,
                letterSpacing: '-0.02em',
                fontWeight: 500,
                color: '#1f1410',
              }}
            >
              Search, re:Engineered.
            </h1>

            {/* Subheadline */}
            <p
              data-testid="boutique-hero-subheadline"
              className="mt-4 md:mt-5"
              style={{
                fontFamily: "'Fraunces', Georgia, serif",
                fontStyle: 'italic',
                fontSize: 'clamp(16px, 1.4vw, 22px)',
                lineHeight: 1.5,
                fontWeight: 400,
                color: 'rgba(31, 20, 16, 0.66)',
                maxWidth: '440px',
              }}
            >
              Tell Blaize what you&rsquo;re looking for.
              <br />
              Watch the pieces find you.
            </p>

            {/* Search input — substantial pill, sparkles left, espresso mic right */}
            <form
              onSubmit={handleSubmit}
              className="mt-8 md:mt-10 w-full"
              role="search"
              style={{ maxWidth: '620px' }}
            >
              <div className="relative">
                {/* Sparkles icon — left */}
                <span
                  className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: '#a8423a' }}
                  aria-hidden="true"
                >
                  <Sparkles size={20} strokeWidth={1.5} />
                </span>

                <input
                  type="text"
                  data-testid="boutique-hero-search"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const trimmed = searchValue.trim()
                      if (!trimmed) return
                      openDrawerWithQuery(trimmed)
                      setSearchValue('')
                    }
                  }}
                  placeholder="Ask Blaize anything..."
                  aria-label="Ask Blaize anything"
                  className="
                    w-full rounded-full
                    bg-[rgba(255,250,240,0.92)] backdrop-blur-md
                    border border-[rgba(31,20,16,0.10)]
                    pl-14 pr-16
                    font-sans
                    placeholder:text-[rgba(31,20,16,0.42)]
                    focus:bg-[rgba(255,250,240,0.98)] focus:border-[rgba(31,20,16,0.18)]
                    focus:ring-2 focus:ring-[rgba(31,20,16,0.06)]
                    focus:outline-none
                    transition-all duration-fade ease-out
                  "
                  style={{
                    height: '58px',
                    fontSize: '16px',
                    color: '#1f1410',
                    fontFamily: "'Inter', system-ui, sans-serif",
                    boxShadow:
                      '0 2px 12px rgba(31, 20, 16, 0.06), 0 1px 3px rgba(31, 20, 16, 0.04)',
                  }}
                />

                {/* Espresso-filled circular mic button — right */}
                <button
                  type="button"
                  onClick={handleMicClick}
                  aria-label="Submit search"
                  className="
                    absolute right-[7px] top-1/2 -translate-y-1/2
                    flex items-center justify-center rounded-full
                    transition-transform duration-fade ease-out
                    hover:scale-105
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(31,20,16,0.3)]
                  "
                  style={{
                    width: '44px',
                    height: '44px',
                    background: '#1f1410',
                    color: '#faf3e8',
                    cursor: 'pointer',
                  }}
                >
                  <Mic size={18} strokeWidth={1.75} />
                </button>
              </div>
            </form>

            {/* "Try asking" label */}
            <div
              data-testid="boutique-hero-try-asking"
              className="mt-6 md:mt-8"
              style={{
                fontFamily: "'Fraunces', Georgia, serif",
                fontStyle: 'italic',
                fontSize: '15px',
                color: 'rgba(31, 20, 16, 0.55)',
              }}
            >
              Try asking
            </div>

            {/* Suggestion chips — five in a row, no quotes, solid cream */}
            <div
              data-testid="boutique-hero-pills"
              className="mt-4 flex flex-wrap justify-center gap-2.5"
              role="listbox"
              aria-label="Suggested queries"
              style={{ maxWidth: '780px' }}
            >
              {SUGGESTIONS.slice(0, 5).map((query) => (
                <button
                  key={query}
                  type="button"
                  onClick={() => handlePillClick(query)}
                  className="
                    rounded-[10px]
                    border border-[rgba(31,20,16,0.18)]
                    hover:border-[rgba(31,20,16,0.32)] hover:bg-[#f5eddf]
                    transition-all duration-fade ease-out
                    cursor-pointer
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(31,20,16,0.15)]
                  "
                  style={{
                    fontFamily: "'Fraunces', Georgia, serif",
                    fontStyle: 'italic',
                    fontSize: '13px',
                    lineHeight: 1.4,
                    color: 'rgba(31, 20, 16, 0.68)',
                    padding: '12px 22px',
                    background: '#faf3e8',
                  }}
                >
                  {query}
                </button>
              ))}
            </div>

            {/* Trust strip — centered, single line or centered wrap */}
            <div
              data-testid="boutique-hero-trust"
              className="mt-8 md:mt-10 flex flex-wrap justify-center items-center gap-x-2 gap-y-1"
              style={{ maxWidth: '640px' }}
            >
              {TRUST_ITEMS.map((item, i) => (
                <span
                  key={item}
                  className="inline-flex items-center"
                  style={{
                    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                    fontSize: '10px',
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: 'rgba(31, 20, 16, 0.42)',
                  }}
                >
                  {i > 0 && (
                    <span
                      aria-hidden="true"
                      style={{
                        marginRight: '8px',
                        color: 'rgba(31, 20, 16, 0.25)',
                      }}
                    >
                      &middot;
                    </span>
                  )}
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
