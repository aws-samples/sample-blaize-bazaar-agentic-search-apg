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
  'a thoughtful gift for someone who runs',
  'pieces for slow Sunday mornings',
  'something to wear for warm evenings out',
  'linen pieces that travel well',
  'a cozy layer for cooler nights',
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
    <>
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
          {/* Typography column: centered within full width. The vase
              on the left and linen on the right frame it naturally. */}
          <div
            className="md:col-start-2 md:col-span-10 py-12 md:py-0
                       flex flex-col items-center text-center"
            style={{ maxWidth: '960px', justifySelf: 'center' }}
          >
            {/* Eyebrow — "• SUMMER EDIT • NO. 06 •" with burgundy dots */}
            <div
              data-testid="boutique-hero-eyebrow"
              className="flex items-center gap-2 mb-4"
              style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: '11px',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'rgba(31, 20, 16, 0.55)',
                fontWeight: 500,
              }}
            >
              <span aria-hidden="true" style={{ color: '#a8423a', fontSize: '7px' }}>&#9679;</span>
              <span>Summer Edit</span>
              <span aria-hidden="true" style={{ color: '#a8423a', fontSize: '7px' }}>&#9679;</span>
              <span>No. 06</span>
              <span aria-hidden="true" style={{ color: '#a8423a', fontSize: '7px' }}>&#9679;</span>
            </div>

            {/* Headline — one line, italic Fraunces */}
            <h1
              data-testid="boutique-hero-headline"
              className="whitespace-nowrap"
              style={{
                fontFamily: "'Fraunces', Georgia, serif",
                fontStyle: 'italic',
                fontSize: 'clamp(44px, 5.2vw, 72px)',
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
              style={{ maxWidth: '640px' }}
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
                    height: '66px',
                    fontSize: '17px',
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
                    width: '50px',
                    height: '50px',
                    background: '#1f1410',
                    color: '#faf3e8',
                    cursor: 'pointer',
                  }}
                >
                  <Mic size={20} strokeWidth={1.75} />
                </button>
              </div>
            </form>

            {/* "Try asking" label */}
            <div
              data-testid="boutique-hero-try-asking"
              className="mt-6 md:mt-8"
              style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: '14px',
                fontWeight: 500,
                color: '#1f1410',
              }}
            >
              Try asking
            </div>

            {/* Suggestion chips — 5 in a row, text wraps to 2 lines
                inside each chip. Matches the reference's compact grid. */}
            <div
              data-testid="boutique-hero-pills"
              className="mt-4 flex justify-center gap-2.5 flex-nowrap"
              role="listbox"
              aria-label="Suggested queries"
              style={{ maxWidth: '900px' }}
            >
              {SUGGESTIONS.map((query) => (
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
                    fontFamily: "'Inter', system-ui, sans-serif",
                    fontSize: '12.5px',
                    fontWeight: 400,
                    lineHeight: 1.35,
                    color: '#1f1410',
                    padding: '10px 16px',
                    background: '#faf3e8',
                    width: '168px',
                    minHeight: '54px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    flex: '0 0 auto',
                  }}
                >
                  {query}
                </button>
              ))}
            </div>

          </div>
        </div>
      </div>
    </section>

    {/* Trust strip — sits on the cream page background directly below
        the photograph. Single line with burgundy dot separators and
        small icons matching the reference. */}
    <div
      data-testid="boutique-hero-trust"
      className="w-full border-b border-sand/40"
      style={{ background: '#faf3e8' }}
    >
      <div
        className="max-w-[1200px] mx-auto px-6 py-5 flex flex-wrap justify-center items-center gap-x-3 gap-y-2"
      >
        {TRUST_ITEMS.map((item, i) => (
          <span
            key={item}
            className="inline-flex items-center whitespace-nowrap"
            style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: '12px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'rgba(31, 20, 16, 0.62)',
              fontWeight: 500,
            }}
          >
            {i > 0 && (
              <span
                aria-hidden="true"
                style={{
                  marginRight: '12px',
                  color: '#a8423a',
                  fontSize: '6px',
                  lineHeight: 1,
                }}
              >
                &#9679;
              </span>
            )}
            {item}
          </span>
        ))}
      </div>
    </div>
    </>
  )
}
