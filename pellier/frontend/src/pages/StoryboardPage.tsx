/**
 * Stories at `/storyboard`: catalog, profile, and evidence introductions
 * link to the matching field notes. Theo's returns note is optional depth.
 */
import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import CommandPill from '../components/CommandPill'
import FieldNotes from '../components/FieldNotes'
import Footer from '../components/Footer'
import Header, { type NavItem } from '../components/Header'
import StoryboardTeaser from '../components/StoryboardTeaser'
import { useUI } from '../contexts/UIContext'

const NAV_ROUTES: Record<NavItem, string> = {
  home: '/',
  shop: '/#shop',
  storyboard: '/storyboard',
  stories: '/storyboard',
  discover: '/discover',
  about: '/about',
  account: '/',
  'ask-pellier': '/',
}

export default function StoryboardPage() {
  const navigate = useNavigate()
  const { hash } = useLocation()
  const { openModal } = useUI()

  // A direct URL can arrive before this lazy-loaded page has mounted.
  // Resolve its story anchor after the essays exist in the document.
  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'instant' })
    }
  }, [hash])

  const handleNavigate = (item: NavItem) => {
    if (item === 'account') {
      openModal('auth')
      return
    }
    if (item === 'ask-pellier') {
      openModal('drawer')
      return
    }
    const target = NAV_ROUTES[item]
    if (target) navigate(target)
  }
  return (
    <div
      data-testid="storyboard-page"
      className="pellier-page-surface min-h-dvh"
    >
      <Header current="stories" onNavigate={handleNavigate} />
      <main>
        <StoryboardTeaser />
        <FieldNotes />
      </main>
      <Footer />
      <CommandPill />
    </div>
  )
}
