/**
 * AtelierInputBar
 *
 * Pill-shaped chat input displayed below the Atelier timeline. Features a
 * cmd-K pill hint on the right and a circular send button. Supports
 * Enter-to-submit and Cmd+K (or Ctrl+K) anywhere on the page to focus.
 *
 * Part of the Atelier v2 redesign. Self-contained; no cross-imports.
 */

import React, { useEffect, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'

interface AtelierInputBarProps {
  onSubmit: (value: string) => void
  placeholder?: string
  isLoading?: boolean
}

const INK = '#1f1410'
const ESPRESSO = '#1f1410'
const CREAM = '#faf3e8'
const CREAM_WARM = '#f5e8d3'

export function AtelierInputBar({
  onSubmit,
  placeholder = 'Ask Blaize or jump to any step…',
  isLoading = false,
}: AtelierInputBarProps) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Cmd+K / Ctrl+K to focus the input.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || isLoading) return
    onSubmit(trimmed)
    setValue('')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center"
      style={{
        gap: '12px',
        background: '#ffffff',
        border: '1px solid rgba(31,20,16,0.1)',
        borderRadius: '9999px',
        paddingLeft: '24px',
        paddingRight: '8px',
        height: '56px',
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        disabled={isLoading}
        className="flex-1"
        style={{
          border: 'none',
          background: 'transparent',
          outline: 'none',
          fontFamily: 'var(--sans)',
          fontSize: '15px',
          color: INK,
        }}
      />
      <span
        style={{
          background: CREAM_WARM,
          color: INK,
          fontFamily: 'var(--mono)',
          fontSize: '11px',
          padding: '4px 8px',
          borderRadius: '8px',
          whiteSpace: 'nowrap',
        }}
      >
        ⌘ K
      </span>
      <button
        type="submit"
        aria-label="Send"
        disabled={isLoading || !value.trim()}
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '9999px',
          background: ESPRESSO,
          border: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isLoading || !value.trim() ? 'not-allowed' : 'pointer',
          opacity: isLoading || !value.trim() ? 0.6 : 1,
          flexShrink: 0,
        }}
      >
        <ArrowRight size={18} strokeWidth={2} color={CREAM} />
      </button>
    </form>
  )
}

export default AtelierInputBar
