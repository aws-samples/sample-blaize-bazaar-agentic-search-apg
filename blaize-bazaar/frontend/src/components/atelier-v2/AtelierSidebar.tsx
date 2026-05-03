/**
 * AtelierSidebar — left navigation for the Atelier v2 workspace.
 *
 * Fixed 260px wide, dark espresso background with cream typography. Houses
 * the Blaize Bazaar wordmark at the top, the eight primary navigation items
 * in the middle (Observatory, Sessions, Memory, Inventory, Agents, Tools,
 * Evaluations, Settings), and a persona footer with avatar + role at the
 * bottom. The Observatory item carries a small burgundy "live" dot to
 * signal the realtime telemetry stream is active.
 *
 * The parent owns the active section and transitions; this component is a
 * presentational shell that emits `onNavigate` when an item is clicked.
 */
import type { CSSProperties } from 'react'
import {
  CheckCircle,
  ChevronDown,
  Clock,
  Database,
  Eye,
  Package,
  Settings,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

import { usePersona } from '../../contexts/PersonaContext'

export type AtelierSection =
  | 'observatory'
  | 'sessions'
  | 'memory'
  | 'inventory'
  | 'agents'
  | 'tools'
  | 'evaluations'
  | 'settings'

interface AtelierSidebarProps {
  activeSection: AtelierSection
  onNavigate: (section: AtelierSection) => void
}

interface NavItem {
  id: AtelierSection
  label: string
  icon: LucideIcon
  status?: 'live'
}

const NAV_ITEMS: NavItem[] = [
  { id: 'observatory', label: 'Observatory', icon: Eye, status: 'live' },
  { id: 'sessions', label: 'Sessions', icon: Clock },
  { id: 'memory', label: 'Memory', icon: Database },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'agents', label: 'Agents', icon: Users },
  { id: 'tools', label: 'Tools', icon: Wrench },
  { id: 'evaluations', label: 'Evaluations', icon: CheckCircle },
  { id: 'settings', label: 'Settings', icon: Settings },
]

const COLORS = {
  sidebarBg: '#1a1410',
  wordmarkText: '#faf3e8',
  itemInactive: 'rgba(250, 243, 232, 0.72)',
  itemActive: '#1f1410',
  itemBgActive: '#faf3e8',
  itemBgHover: 'rgba(255, 255, 255, 0.06)',
  divider: 'rgba(250, 243, 232, 0.08)',
  liveDot: '#c44536',
} as const

const containerStyle: CSSProperties = {
  width: 260,
  flexShrink: 0,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: COLORS.sidebarBg,
  color: COLORS.wordmarkText,
}

const wordmarkRowStyle: CSSProperties = {
  height: 72,
  padding: 20,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  flexShrink: 0,
}

const logoCircleStyle: CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: '50%',
  backgroundColor: COLORS.wordmarkText,
  color: COLORS.sidebarBg,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 18,
  fontWeight: 500,
  lineHeight: 1,
  flexShrink: 0,
}

const wordmarkTextStyle: CSSProperties = {
  fontSize: 15,
  color: COLORS.wordmarkText,
  letterSpacing: 0.1,
}

const navListStyle: CSSProperties = {
  flex: 1,
  padding: 8,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  overflowY: 'auto',
}

const footerStyle: CSSProperties = {
  padding: 16,
  borderTop: `1px solid ${COLORS.divider}`,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  flexShrink: 0,
}

const avatarStyle: CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: '50%',
  backgroundColor: COLORS.wordmarkText,
  color: COLORS.sidebarBg,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 15,
  fontWeight: 500,
  flexShrink: 0,
}

const personaTextColStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
}

const personaNameStyle: CSSProperties = {
  color: COLORS.wordmarkText,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const personaRoleStyle: CSSProperties = {
  color: COLORS.itemInactive,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const chevronStyle: CSSProperties = {
  color: COLORS.itemInactive,
  flexShrink: 0,
}

interface NavButtonProps {
  item: NavItem
  active: boolean
  onClick: () => void
}

function NavButton({ item, active, onClick }: NavButtonProps) {
  const Icon = item.icon

  const buttonStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: 12,
    borderRadius: 10,
    border: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    fontWeight: active ? 500 : 400,
    backgroundColor: active ? COLORS.itemBgActive : 'transparent',
    color: active ? COLORS.itemActive : COLORS.itemInactive,
    transition: 'background-color 120ms ease, color 120ms ease',
  }

  const liveDotStyle: CSSProperties = {
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: COLORS.liveDot,
    marginLeft: 'auto',
    flexShrink: 0,
  }

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!active) {
      e.currentTarget.style.backgroundColor = COLORS.itemBgHover
    }
  }

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!active) {
      e.currentTarget.style.backgroundColor = 'transparent'
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="text-body-sm"
      style={buttonStyle}
      aria-current={active ? 'page' : undefined}
    >
      <Icon size={16} strokeWidth={1.75} />
      <span>{item.label}</span>
      {item.status === 'live' && <span style={liveDotStyle} aria-label="Live" />}
    </button>
  )
}

export default function AtelierSidebar({
  activeSection,
  onNavigate,
}: AtelierSidebarProps) {
  const persona = usePersona().persona

  const displayName = persona?.display_name ?? 'Alexandra'
  const avatarInitial = displayName.charAt(0).toUpperCase()

  return (
    <aside className="font-sans" style={containerStyle} aria-label="Atelier navigation">
      <div style={wordmarkRowStyle}>
        <div className="font-display italic" style={logoCircleStyle} aria-hidden="true">
          B
        </div>
        <span className="font-display" style={wordmarkTextStyle}>Blaize Bazaar</span>
      </div>

      <nav style={navListStyle}>
        {NAV_ITEMS.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            active={activeSection === item.id}
            onClick={() => onNavigate(item.id)}
          />
        ))}
      </nav>

      <div style={footerStyle}>
        <div className="font-display" style={avatarStyle} aria-hidden="true">
          {avatarInitial}
        </div>
        <div style={personaTextColStyle}>
          <span className="text-body-sm" style={personaNameStyle}>{displayName}</span>
          <span className="text-microcopy" style={personaRoleStyle}>Administrator</span>
        </div>
        <ChevronDown size={16} strokeWidth={1.75} style={chevronStyle} />
      </div>
    </aside>
  )
}
