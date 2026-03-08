/**
 * Layout Context — Coordinates chat mode, workshop mode, and main content margin.
 */
import { createContext, useContext, useState, type ReactNode } from 'react'

type ChatMode = 'floating' | 'docked'
export type WorkshopMode = 'legacy' | 'semantic' | 'tools' | 'full'

interface LayoutContextType {
  chatMode: ChatMode
  setChatMode: (mode: ChatMode) => void
  chatOpen: boolean
  setChatOpen: (open: boolean) => void
  mainContentMarginRight: number
  workshopMode: WorkshopMode
  setWorkshopMode: (mode: WorkshopMode) => void
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
  const [workshopMode, setWorkshopMode] = useState<WorkshopMode>('full')

  const mainContentMarginRight = chatMode === 'docked' && chatOpen ? 420 : 0

  return (
    <LayoutContext.Provider value={{ chatMode, setChatMode, chatOpen, setChatOpen, mainContentMarginRight, workshopMode, setWorkshopMode }}>
      {children}
    </LayoutContext.Provider>
  )
}
