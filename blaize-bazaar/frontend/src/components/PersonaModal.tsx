/**
 * PersonaModal — the shared persona switcher.
 *
 * One component, two entry points: the storefront header pill and the
 * Atelier breadcrumb indicator both open this same modal. Matches
 * docs/persona-switcher.html.
 *
 * Three persona cards as buttons. Active persona gets a burgundy ring.
 * Closes via: X button, backdrop click, Escape key.
 */
import { useCallback, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { usePersona, type PersonaListItem } from '../contexts/PersonaContext'

interface PersonaModalProps {
  open: boolean
  onClose: () => void
}

export default function PersonaModal({ open, onClose }: PersonaModalProps) {
  const { persona, switchPersona, signOut, switching } = usePersona()
  const [personas, setPersonas] = useState<PersonaListItem[]>([])

  // Fetch persona list on first open
  useEffect(() => {
    if (!open || personas.length > 0) return
    fetch('/api/atelier/personas')
      .then((r) => r.json())
      .then((data) => setPersonas(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [open, personas.length])

  // Escape key
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const handleSelect = useCallback(
    async (id: string) => {
      await switchPersona(id)
      onClose()
    },
    [switchPersona, onClose],
  )

  const handleSignOut = useCallback(() => {
    signOut()
    onClose()
  }, [signOut, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      data-testid="persona-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      style={{ background: 'rgba(31, 20, 16, 0.18)' }}
    >
      <div
        className="w-full max-w-[540px] mx-4 overflow-hidden"
        data-testid="persona-modal"
        style={{
          background: 'var(--cream-1)',
          borderRadius: 16,
          boxShadow:
            '0 30px 80px -20px rgba(31, 20, 16, 0.40), 0 0 0 1px var(--rule-1)',
        }}
      >
        {/* Header */}
        <div
          className="relative flex items-start justify-between gap-4"
          style={{
            padding: '26px 28px 18px',
            borderBottom: '1px solid var(--rule-1)',
          }}
        >
          {/* Burgundy tick */}
          <span
            className="absolute bottom-[-1px] left-[28px] h-[1px] w-[28px]"
            style={{ background: 'var(--accent, #c44536)' }}
            aria-hidden
          />
          <div>
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 9.5,
                letterSpacing: '0.22em',
                textTransform: 'uppercase' as const,
                color: 'var(--accent, #c44536)',
                fontWeight: 500,
                marginBottom: 8,
              }}
            >
              Sign in
            </div>
            <h2
              style={{
                fontFamily: 'var(--serif)',
                fontWeight: 400,
                fontSize: 30,
                lineHeight: 1.05,
                letterSpacing: '-0.02em',
                marginBottom: 6,
              }}
            >
              Choose a <em>persona to inhabit.</em>
            </h2>
            <p
              style={{
                fontFamily: 'var(--serif)',
                fontStyle: 'italic',
                fontWeight: 300,
                fontSize: 14.5,
                lineHeight: 1.5,
                color: 'var(--ink-3)',
              }}
            >
              Three histories. The boutique shifts depending on who you are.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            data-testid="persona-modal-close"
            className="flex items-center justify-center rounded-full transition-colors"
            style={{
              width: 28,
              height: 28,
              background: 'transparent',
              color: 'var(--ink-3)',
              flexShrink: 0,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Persona list */}
        <div
          className="flex flex-col gap-2.5"
          style={{ padding: '18px 22px 22px' }}
        >
          {personas.map((p) => {
            const isActive = persona?.id === p.id
            const isFresh = p.id === 'fresh'
            return (
              <button
                key={p.id}
                type="button"
                disabled={switching}
                data-testid={`persona-card-${p.id}`}
                onClick={() => handleSelect(p.id)}
                className="w-full text-left transition-all"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '44px 1fr auto',
                  gap: 14,
                  alignItems: 'center',
                  padding: '14px 16px',
                  borderRadius: 12,
                  border: isActive
                    ? '1px solid var(--accent, #c44536)'
                    : '1px solid var(--rule-2)',
                  background: isActive ? 'var(--cream-elev)' : 'transparent',
                  boxShadow: isActive
                    ? '0 0 0 1px var(--accent, #c44536)'
                    : 'none',
                  cursor: switching ? 'wait' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {/* Avatar */}
                <span
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: 44,
                    height: 44,
                    background: isFresh ? 'transparent' : p.avatar_color,
                    color: isFresh ? 'var(--ink-3)' : 'var(--cream-1, #faf3e8)',
                    border: isFresh
                      ? '1px dashed var(--rule-3, rgba(31,20,16,0.28))'
                      : 'none',
                    fontFamily: 'var(--serif)',
                    fontStyle: 'italic',
                    fontWeight: 400,
                    fontSize: 20,
                    flexShrink: 0,
                  }}
                >
                  {p.avatar_initial}
                </span>

                {/* Content */}
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span
                      style={{
                        fontFamily: 'var(--serif)',
                        fontWeight: 400,
                        fontSize: 18,
                        letterSpacing: '-0.005em',
                        color: 'var(--ink-1)',
                      }}
                    >
                      <em>{p.display_name}</em>
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--sans)',
                        fontSize: 9.5,
                        fontWeight: 500,
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase' as const,
                        color: isFresh
                          ? 'var(--ink-4)'
                          : 'var(--accent, #c44536)',
                        padding: '2px 7px',
                        border: isFresh
                          ? '1px solid var(--rule-2)'
                          : '1px solid rgba(196, 69, 54, 0.4)',
                        borderRadius: 3,
                      }}
                    >
                      {p.role_tag}
                    </span>
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--serif)',
                      fontStyle: 'italic',
                      fontSize: 13,
                      lineHeight: 1.45,
                      color: 'var(--ink-3)',
                      marginTop: 3,
                    }}
                  >
                    {p.blurb}
                  </span>
                  <div
                    className="flex items-baseline gap-3.5"
                    style={{ marginTop: 8 }}
                  >
                    <MetaItem label="visits" value={p.stats.visits} />
                    <MetaItem label="orders" value={p.stats.orders} />
                    <MetaItem
                      label="last seen"
                      value={
                        p.stats.last_seen_days === null
                          ? 'never'
                          : `${p.stats.last_seen_days}d ago`
                      }
                    />
                  </div>
                </div>

                {/* Arrow */}
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 14,
                    color: isActive
                      ? 'var(--accent, #c44536)'
                      : 'var(--ink-4)',
                    flexShrink: 0,
                  }}
                >
                  →
                </span>
              </button>
            )
          })}

          {/* Sign out row — only when a persona is active */}
          {persona && (
            <button
              type="button"
              onClick={handleSignOut}
              data-testid="persona-sign-out"
              className="self-start text-[12px] transition-opacity hover:opacity-70"
              style={{
                fontFamily: 'var(--sans)',
                color: 'var(--ink-4)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                marginTop: 4,
                padding: '4px 0',
              }}
            >
              Sign out
            </button>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between gap-3.5"
          style={{
            padding: '14px 28px 18px',
            borderTop: '1px solid var(--rule-1)',
            background: 'var(--cream-2)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--serif)',
              fontStyle: 'italic',
              fontSize: 13,
              color: 'var(--ink-3)',
              lineHeight: 1.4,
            }}
          >
            <em style={{ color: 'var(--ink-1)', fontWeight: 500 }}>
              Three curated identities
            </em>{' '}
            — switch any time from the header.
          </span>
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 9.5,
              letterSpacing: '0.18em',
              textTransform: 'uppercase' as const,
              color: 'var(--ink-4)',
            }}
          >
            v1.0
          </span>
        </div>
      </div>
    </div>
  )
}

function MetaItem({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <span
      style={{
        fontFamily: 'var(--mono)',
        fontSize: 10,
        letterSpacing: '0.05em',
        color: 'var(--ink-4)',
      }}
    >
      {label} ·{' '}
      <span style={{ color: 'var(--ink-1)', fontWeight: 500 }}>{value}</span>
    </span>
  )
}
