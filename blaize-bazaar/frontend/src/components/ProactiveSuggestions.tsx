/**
 * Proactive Agent Suggestions — Context-aware floating bar that suggests actions
 * based on browsing behavior and conversation history.
 */
import { useState, useEffect } from 'react'
import { X, Sparkles } from 'lucide-react'
import { aggregateSessionPreferences } from '../utils/preferenceExtractor'
import { getRecentlyViewed } from '../utils/recentlyViewed'

interface ProactiveSuggestionsProps {
  onSuggestionClick: (query: string) => void
  onDismiss: () => void
}

const ProactiveSuggestions = ({ onSuggestionClick, onDismiss }: ProactiveSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<Array<{ text: string; query: string }>>([])
  const [isDismissing, setIsDismissing] = useState(false)

  useEffect(() => {
    const recentlyViewed = getRecentlyViewed()
    const savedHistory = localStorage.getItem('blaize-conversation-history')
    const history = savedHistory ? JSON.parse(savedHistory) : []
    const prefs = aggregateSessionPreferences(history)

    const generated: Array<{ text: string; query: string }> = []

    // Based on recently viewed categories
    if (recentlyViewed.length >= 2) {
      generated.push({
        text: `Compare your ${recentlyViewed.length} recently viewed items`,
        query: 'Compare my recently viewed products'
      })
    }

    // Based on conversation preferences
    if (prefs.categories.length > 0) {
      generated.push({
        text: `Trending in ${prefs.categories[0]}`,
        query: `Show me trending ${prefs.categories[0].toLowerCase()} products`
      })
    }

    if (prefs.priceRange) {
      generated.push({
        text: `Best deals under $${prefs.priceRange.max}`,
        query: `Best deals under $${prefs.priceRange.max}`
      })
    }

    if (prefs.features.length > 0) {
      generated.push({
        text: `More ${prefs.features[0]} options`,
        query: `Show me more ${prefs.features[0]} products`
      })
    }

    setSuggestions(generated.slice(0, 3))
  }, [])

  if (suggestions.length === 0) return null

  const handleDismiss = () => {
    setIsDismissing(true)
    setTimeout(onDismiss, 300)
  }

  return (
    <div
      className="fixed top-[80px] left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2.5 rounded-full"
      style={{
        background: 'rgba(13, 13, 26, 0.9)',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        transform: isDismissing ? 'translate(-50%, -20px)' : 'translate(-50%, 0)',
        opacity: isDismissing ? 0 : 1,
        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      <Sparkles className="h-4 w-4 text-purple-400 flex-shrink-0" />
      <div className="flex items-center gap-2">
        {suggestions.map((s, idx) => (
          <button
            key={idx}
            onClick={() => onSuggestionClick(s.query)}
            className="px-3 py-1 rounded-full text-xs font-medium transition-all hover:scale-105 whitespace-nowrap"
            style={{
              background: 'rgba(139, 92, 246, 0.15)',
              border: '1px solid rgba(139, 92, 246, 0.25)',
              color: '#c084fc',
            }}
          >
            {s.text}
          </button>
        ))}
      </div>
      <button onClick={handleDismiss} className="p-1 rounded-full hover:bg-white/10 transition-colors flex-shrink-0">
        <X className="h-3 w-3 text-gray-400" />
      </button>
    </div>
  )
}

export default ProactiveSuggestions
