/**
 * Layout Context — Coordinates chat mode (floating vs docked) and main content margin.
 */
import { createContext, useContext, useState, type ReactNode } from 'react'

type ChatMode = 'floating' | 'docked'

interface LayoutContextType {
  chatMode: ChatMode
  setChatMode: (mode: ChatMode) => void
  chatOpen: boolean
  setChatOpen: (open: boolean) => void
  mainContentMarginRight: number
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined)

export function useLayout() {
  const ctx = useContext(LayoutContext)
  if (!ctx) throw new Error('useLayout must be used within LayoutProvider')
  return ctx
}

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [chatMode, setChatMode] = useState<ChatMode>('docked')
  const [chatOpen, setChatOpen] = useState(false)

  const mainContentMarginRight = chatMode === 'docked' && chatOpen ? 420 : 0

  return (
    <LayoutContext.Provider value={{ chatMode, setChatMode, chatOpen, setChatOpen, mainContentMarginRight }}>
      {children}
    </LayoutContext.Provider>
  )
}
