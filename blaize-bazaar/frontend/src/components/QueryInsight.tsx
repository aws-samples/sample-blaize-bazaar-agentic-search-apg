import { Brain, DollarSign, Star, Tag, Zap } from 'lucide-react'

interface QueryInsightProps {
  query: string
  agent?: 'search' | 'pricing' | 'recommendation' | 'orchestrator'
}

const QueryInsight = ({ query, agent }: QueryInsightProps) => {
  const extractInsights = (q: string) => {
    const lower = q.toLowerCase()
    const insights: Array<{icon: any, label: string, value: string, color: string}> = []
    
    // Price detection
    const priceMatch = lower.match(/under\s+\$?(\d+)|less\s+than\s+\$?(\d+)|below\s+\$?(\d+)|cheap|budget|affordable/)
    if (priceMatch) {
      const amount = priceMatch[1] || priceMatch[2] || priceMatch[3]
      insights.push({
        icon: DollarSign,
        label: 'Budget',
        value: amount ? `Under $${amount}` : 'Budget-friendly',
        color: 'text-green-400'
      })
    }
    
    // Quality detection
    if (lower.match(/best|top|recommend|quality|premium|high.?rated/)) {
      insights.push({
        icon: Star,
        label: 'Quality',
        value: 'High-rated preferred',
        color: 'text-yellow-400'
      })
    }
    
    // Category detection
    const categories = ['headphone', 'laptop', 'phone', 'camera', 'gaming', 'cable', 'smart home']
    const foundCategory = categories.find(cat => lower.includes(cat))
    if (foundCategory) {
      insights.push({
        icon: Tag,
        label: 'Category',
        value: foundCategory.charAt(0).toUpperCase() + foundCategory.slice(1),
        color: 'text-purple-400'
      })
    }
    
    // Feature detection
    if (lower.match(/wireless|bluetooth|usb-c|noise.?cancel/)) {
      const feature = lower.match(/wireless|bluetooth|usb-c|noise.?cancel/)?.[0]
      insights.push({
        icon: Zap,
        label: 'Feature',
        value: feature?.replace(/[.-]/g, ' ') || 'Special feature',
        color: 'text-blue-400'
      })
    }
    
    return insights
  }
  
  const insights = extractInsights(query)
  
  if (insights.length === 0) return null
  
  const agentInfo = {
    search: { name: 'Search Agent', icon: '🔍', color: 'text-blue-400' },
    pricing: { name: 'Pricing Agent', icon: '💰', color: 'text-green-400' },
    recommendation: { name: 'Recommendation Agent', icon: '⭐', color: 'text-yellow-400' },
    orchestrator: { name: 'Multi-Agent', icon: '🎯', color: 'text-purple-400' }
  }
  
  const currentAgent = agent ? agentInfo[agent] : null
  
  return (
    <div className="mb-3 p-3 rounded-xl bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 backdrop-blur-sm animate-slideUp">
      <div className="flex items-center gap-2 mb-2">
        <Brain className="h-4 w-4 text-purple-400" />
        <span className="text-xs font-medium text-purple-300">AI Understanding</span>
        {currentAgent && (
          <span className={`text-xs ${currentAgent.color} ml-auto`}>
            {currentAgent.icon} {currentAgent.name}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {insights.map((insight, idx) => {
          const Icon = insight.icon
          return (
            <div key={idx} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/30 border border-white/10">
              <Icon className={`h-3 w-3 ${insight.color}`} />
              <span className="text-xs text-gray-300">{insight.label}:</span>
              <span className={`text-xs font-medium ${insight.color}`}>{insight.value}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default QueryInsight
