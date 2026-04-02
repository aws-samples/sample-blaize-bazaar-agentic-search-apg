/**
 * UI Context — Centralizes cross-component UI coordination.
 * Replaces the repeated document.querySelector('[data-tour="chat-bubble"]').click()
 * pattern with a single openChat() function.
 */
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { WorkshopMode } from './LayoutContext'

interface UIContextValue {
  openChat: () => void
  announcementDismissed: Record<WorkshopMode, boolean>
  dismissAnnouncement: (mode: WorkshopMode) => void
}

const UIContext = createContext<UIContextValue | undefined>(undefined)

export function useUI() {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI must be used within UIProvider')
  return ctx
}

export function UIProvider({ children }: { children: ReactNode }) {
  // Chat opener — centralizes the DOM click pattern.
  // AIAssistant owns its local isOpen state and syncs outward to LayoutContext.
  // There is no inbound signal to set AIAssistant's isOpen from outside,
  // so we click the bubble element. This centralizes the DOM query to one place.
  const openChat = useCallback(() => {
    const bubble = document.querySelector('[data-tour="chat-bubble"]') as HTMLElement
    if (bubble) bubble.click()
  }, [])

  // Announcement banner dismissal — per-mode, React state only (not localStorage).
  const [announcementDismissed, setAnnouncementDismissed] = useState<Record<WorkshopMode, boolean>>({
    legacy: false,
    semantic: false,
    tools: false,
    full: false,
    agentcore: false,
  })

  const dismissAnnouncement = useCallback((mode: WorkshopMode) => {
    setAnnouncementDismissed(prev => ({ ...prev, [mode]: true }))
  }, [])

  return (
    <UIContext.Provider value={{ openChat, announcementDismissed, dismissAnnouncement }}>
      {children}
    </UIContext.Provider>
  )
}
