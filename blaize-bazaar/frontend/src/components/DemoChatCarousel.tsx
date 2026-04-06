/**
 * DemoChatCarousel — Auto-cycling showcase of AI agent features.
 * Each slide demonstrates a different capability with a unique
 * query/response pair and a glowing feature badge.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Search, Target, DollarSign, Database, Send, Shield, HelpCircle } from 'lucide-react'
import { useTheme } from '../App'
import type { WorkshopMode } from '../contexts/LayoutContext'

// ─── Data Types ───

interface DemoProductCard {
  name: string
  price: string
  originalPrice?: string
  rating: string
  image: string
}

interface AgentBadge {
  label: string
  bgColor: string
  textColor: string
}

interface DemoSlide {
  id: string
  featureName: string
  featureColor: string
  featureGlow: string
  featureIconKey: 'search' | 'target' | 'dollar' | 'brain' | 'database' | 'shield' | 'help'
  userMessage: string
  aiAvatarIconKey: 'search' | 'target' | 'dollar' | 'brain' | 'database' | 'shield' | 'help'
  aiAvatarLabel: string
  agentBadges: AgentBadge[]
  aiResponseText: string
  productCards?: DemoProductCard[]
  contextNote?: string
  /** Minimum workshopMode required to show this slide */
  minMode: WorkshopMode
}

const ICON_MAP = {
  search: Search,
  target: Target,
  dollar: DollarSign,
  brain: Brain,
  database: Database,
  shield: Shield,
  help: HelpCircle,
}

const MODE_ORDER: WorkshopMode[] = ['legacy', 'search', 'agentic', 'production']

// ─── Slide Data ───

const DEMO_SLIDES: DemoSlide[] = [
  {
    id: 'semantic-search',
    featureName: 'Semantic Search',
    featureColor: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
    featureGlow: 'rgba(59, 130, 246, 0.4)',
    featureIconKey: 'search',
    userMessage: 'Gift for someone who loves cooking',
    aiAvatarIconKey: 'brain',
    aiAvatarLabel: 'Orchestrator',
    agentBadges: [
      { label: 'Search Agent', bgColor: 'rgba(59, 130, 246, 0.2)', textColor: '#93c5fd' },
    ],
    aiResponseText: 'I found kitchen accessories matching your intent — not just keywords, but the concept of cooking gifts:',
    productCards: [
      { name: 'Lodge Cast Iron Starter Gift Set', price: '$79.99', rating: '4.8', image: 'https://images.unsplash.com/photo-1602031939964-2854d8c32447?w=200&q=80' },
      { name: 'Cuisinart Bamboo Cutting Board Set', price: '$28.99', rating: '4.2', image: 'https://images.unsplash.com/photo-1633536705119-bcc37bf6c84e?w=200&q=80' },
    ],
    minMode: 'agentic',
  },
  {
    id: 'price-intelligence',
    featureName: 'Price Intelligence',
    featureColor: 'linear-gradient(135deg, #f59e0b, #ea580c)',
    featureGlow: 'rgba(245, 158, 11, 0.4)',
    featureIconKey: 'dollar',
    userMessage: 'Best luxury watches under $500?',
    aiAvatarIconKey: 'dollar',
    aiAvatarLabel: 'Pricing Agent',
    agentBadges: [
      { label: 'Pricing Agent', bgColor: 'rgba(245, 158, 11, 0.2)', textColor: '#fcd34d' },
      { label: 'Search Agent', bgColor: 'rgba(59, 130, 246, 0.2)', textColor: '#93c5fd' },
    ],
    aiResponseText: 'I analyzed pricing across the watch catalog and found the best value options:',
    productCards: [
      { name: 'Citizen Promaster Skyhawk AT', price: '$425.00', rating: '4.9', image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=200&q=80' },
      { name: 'Citizen Eco-Drive Silhouette Crystal', price: '$245.00', rating: '4.9', image: 'https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?w=200&q=80' },
    ],
    minMode: 'agentic',
  },
  {
    id: 'inventory-awareness',
    featureName: 'Inventory Awareness',
    featureColor: 'linear-gradient(135deg, #10b981, #059669)',
    featureGlow: 'rgba(16, 185, 129, 0.4)',
    featureIconKey: 'database',
    userMessage: 'Is the Stanley Quencher tumbler in stock?',
    aiAvatarIconKey: 'database',
    aiAvatarLabel: 'Inventory Agent',
    agentBadges: [
      { label: 'Inventory Agent', bgColor: 'rgba(16, 185, 129, 0.2)', textColor: '#6ee7b7' },
      { label: 'Pricing Agent', bgColor: 'rgba(245, 158, 11, 0.2)', textColor: '#fcd34d' },
    ],
    aiResponseText: 'Low stock alert — only 4 units remaining! The Stanley Quencher H2.0 40oz is $35.00 and our #1 trending product with 12,453 reviews. I\'d recommend ordering soon.',
    contextNote: 'Live stock: 4 units remaining',
    minMode: 'agentic',
  },
  {
    id: 'customer-support',
    featureName: 'Customer Support',
    featureColor: 'linear-gradient(135deg, #14b8a6, #0d9488)',
    featureGlow: 'rgba(20, 184, 166, 0.4)',
    featureIconKey: 'help',
    userMessage: 'What\'s the return policy for electronics?',
    aiAvatarIconKey: 'help',
    aiAvatarLabel: 'Support Agent',
    agentBadges: [
      { label: 'Support Agent', bgColor: 'rgba(20, 184, 166, 0.2)', textColor: '#5eead4' },
    ],
    aiResponseText: 'Electronics have a 30-day return window. Items must be in original packaging, unused, with all accessories. Refunds go to your original payment method within 5-7 business days.',
    contextNote: 'Return policy: 30-day window',
    minMode: 'agentic',
  },
  {
    id: 'multi-agent',
    featureName: 'Multi-Agent Orchestration',
    featureColor: 'linear-gradient(135deg, #a855f7, #ec4899)',
    featureGlow: 'rgba(168, 85, 247, 0.4)',
    featureIconKey: 'target',
    userMessage: 'Which headphones are running low? Compare prices too.',
    aiAvatarIconKey: 'target',
    aiAvatarLabel: 'Orchestrator',
    agentBadges: [
      { label: 'Inventory Agent', bgColor: 'rgba(59, 130, 246, 0.2)', textColor: '#93c5fd' },
      { label: 'Pricing Agent', bgColor: 'rgba(245, 158, 11, 0.2)', textColor: '#fcd34d' },
      { label: 'Recommendation', bgColor: 'rgba(234, 179, 8, 0.2)', textColor: '#fde047' },
    ],
    aiResponseText: 'I routed your request to two specialists — Inventory found AirPods Pro (8 left) and Samsung Buds3 Pro (6 left), then Pricing compared them: AirPods at $249 vs Samsung at $229.99.',
    contextNote: 'Orchestrator routed to 2 specialists in 1.2s',
    minMode: 'agentic',
  },
  {
    id: 'conversation-memory',
    featureName: 'Conversation Memory',
    featureColor: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    featureGlow: 'rgba(139, 92, 246, 0.4)',
    featureIconKey: 'brain',
    userMessage: 'What about the Citizen Skyhawk — is it good for everyday wear?',
    aiAvatarIconKey: 'brain',
    aiAvatarLabel: 'Orchestrator',
    agentBadges: [
      { label: 'Search Agent', bgColor: 'rgba(59, 130, 246, 0.2)', textColor: '#93c5fd' },
    ],
    aiResponseText: 'Recalling from our earlier conversation — yes, the Citizen Promaster Skyhawk AT features atomic timekeeping and a stainless steel case, making it durable for daily wear.',
    contextNote: 'Recalled context from 2 messages ago',
    minMode: 'agentic',
  },
  {
    id: 'cedar-policy',
    featureName: 'Cedar Policy Enforcement',
    featureColor: 'linear-gradient(135deg, #10b981, #0d9488)',
    featureGlow: 'rgba(16, 185, 129, 0.4)',
    featureIconKey: 'shield',
    userMessage: 'Restock the Stanley Quencher — order 1000 units.',
    aiAvatarIconKey: 'shield',
    aiAvatarLabel: 'Policy Engine',
    agentBadges: [
      { label: 'Cedar Policy', bgColor: 'rgba(16, 185, 129, 0.2)', textColor: '#6ee7b7' },
      { label: 'Inventory Agent', bgColor: 'rgba(16, 185, 129, 0.2)', textColor: '#6ee7b7' },
    ],
    aiResponseText: 'Policy check failed — Cedar rules block bulk restock over 500 units without manager approval. Would you like me to split this into two approved orders?',
    contextNote: 'Cedar policy: max_restock_qty = 500',
    minMode: 'production',
  },
]

const CYCLE_MS = 5000
const RESUME_AFTER_CLICK_MS = 10000

// ─── Animation Variants ───

const slideVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 40 : -40,
  }),
  center: {
    opacity: 1,
    x: 0,
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -40 : 40,
  }),
}

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15, delayChildren: 0.1 } },
}

const msgFromRight = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.35 } },
}

const msgFromLeft = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.35 } },
}

const msgFromBelow = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
}

// ─── Component ───

interface DemoChatCarouselProps {
  onOpenChat: () => void
  compact?: boolean
  workshopMode?: WorkshopMode
}

const DemoChatCarousel = ({ onOpenChat, compact = false, workshopMode = 'agentic' }: DemoChatCarouselProps) => {
  const { theme } = useTheme()
  const [activeIndex, setActiveIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const [isPaused, setIsPaused] = useState(false)
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Filter slides based on current workshop mode
  const modeIdx = MODE_ORDER.indexOf(workshopMode)
  const visibleSlides = DEMO_SLIDES.filter(s => MODE_ORDER.indexOf(s.minMode) <= modeIdx)

  // Mode accent colors — matches AIAssistant.tsx
  const modeAccent = workshopMode === 'production' ? '#10b981' : workshopMode === 'agentic' ? '#7c3aed' : '#0071e3'
  const modeStatusColor = workshopMode === 'production' ? '#34d399' : workshopMode === 'agentic' ? '#a78bfa' : '#22c55e'
  const modeBorderColor = workshopMode === 'production' ? 'rgba(16, 185, 129, 0.2)' : workshopMode === 'agentic' ? 'rgba(124, 58, 237, 0.2)' : 'rgba(255,255,255,0.08)'
  const modeGlowColor = workshopMode === 'production' ? 'rgba(16, 185, 129, 0.08)' : workshopMode === 'agentic' ? 'rgba(124, 58, 237, 0.08)' : ''
  const modeHeaderBg = workshopMode === 'production'
    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.04) 0%, transparent 100%)'
    : workshopMode === 'agentic'
    ? 'linear-gradient(135deg, rgba(124, 58, 237, 0.04) 0%, transparent 100%)'
    : 'transparent'
  const modeStatusText = workshopMode === 'production'
    ? 'AgentCore Runtime · 5 services'
    : workshopMode === 'agentic'
    ? 'Orchestrator → 5 specialists'
    : '1 agent online'

  // Auto-cycle
  useEffect(() => {
    if (isPaused) return
    const timer = setInterval(() => {
      setDirection(1)
      setActiveIndex(prev => (prev + 1) % visibleSlides.length)
    }, CYCLE_MS)
    return () => clearInterval(timer)
  }, [isPaused, visibleSlides.length])

  // Reset activeIndex when mode changes and slides shrink
  useEffect(() => {
    setActiveIndex(0)
  }, [workshopMode])

  const goToSlide = useCallback((index: number) => {
    setDirection(index > activeIndex ? 1 : -1)
    setActiveIndex(index)
    setIsPaused(true)
    if (resumeTimer.current) clearTimeout(resumeTimer.current)
    resumeTimer.current = setTimeout(() => setIsPaused(false), RESUME_AFTER_CLICK_MS)
  }, [activeIndex])

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (resumeTimer.current) clearTimeout(resumeTimer.current) }
  }, [])

  const slide = visibleSlides[activeIndex % visibleSlides.length]

  const cardContent = (
    <>
        <motion.div
          className={`relative ${compact ? 'max-w-[520px]' : 'max-w-[700px]'} mx-auto rounded-[20px] overflow-hidden`}
          style={{
            background: theme === 'dark' ? 'rgba(0, 0, 0, 0.95)' : '#ffffff',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            border: theme === 'dark' ? `1px solid ${modeBorderColor}` : '1px solid rgba(0,0,0,0.1)',
            boxShadow: theme === 'dark'
              ? `0 25px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.04)${modeGlowColor ? `, 0 0 40px ${modeGlowColor}` : ''}`
              : '0 25px 60px rgba(0, 0, 0, 0.12), 0 8px 24px rgba(0, 0, 0, 0.08)',
          }}
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ type: 'spring', stiffness: 150, damping: 25 }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => {
            if (!resumeTimer.current) setIsPaused(false)
          }}
        >
          {/* Chat header — matches AIAssistant */}
          <div className="px-5 py-4 rounded-t-[20px] flex items-center gap-3"
            style={{
              borderBottom: theme === 'dark'
                ? `1px solid ${workshopMode === 'production' ? 'rgba(16, 185, 129, 0.15)' : workshopMode === 'agentic' ? 'rgba(124, 58, 237, 0.15)' : 'rgba(255,255,255,0.06)'}`
                : '1px solid rgba(0,0,0,0.08)',
              background: theme === 'dark' ? modeHeaderBg : 'transparent',
            }}>
            <motion.div
              className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0"
              style={{
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                border: '1.5px solid var(--border-color)',
              }}
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              whileHover={{ scale: 1.15 }}
            >
              <img src={`${import.meta.env.BASE_URL}chat-icon.jpeg`} alt="AI" className="w-full h-full object-cover" />
            </motion.div>
            <div>
              <div className="font-medium text-sm text-text-primary">Blaize AI</div>
              <div className="text-[11px] flex items-center gap-1" style={{ color: modeStatusColor }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: modeStatusColor }} /> {modeStatusText}
              </div>
            </div>
          </div>

          {/* Feature badge + messages (cycling) */}
          <div className="min-h-[300px]">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={slide.id}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              >
                {/* Feature badge */}
                <div className="px-6 pt-4 pb-1">
                  {(() => { const FeatureIcon = ICON_MAP[slide.featureIconKey]; return (
                  <motion.span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase text-white"
                    style={{
                      background: slide.featureColor,
                      boxShadow: `0 0 16px ${slide.featureGlow}`,
                    }}
                    animate={{
                      boxShadow: [
                        `0 0 12px ${slide.featureGlow}`,
                        `0 0 24px ${slide.featureGlow}`,
                        `0 0 12px ${slide.featureGlow}`,
                      ],
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <FeatureIcon className="w-3 h-3" />
                    {slide.featureName}
                  </motion.span>
                  ); })()}
                </div>

                {/* Messages — matches AIAssistant bubble styling */}
                <motion.div
                  className="px-5 py-5 pt-3 space-y-4"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                >
                  {/* User message */}
                  <motion.div className="flex justify-end" variants={msgFromRight}>
                    <div className="rounded-2xl rounded-br-sm px-4 py-3 max-w-[85%]"
                      style={{
                        background: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#0071e3',
                        color: theme === 'light' ? '#ffffff' : 'var(--text-primary)',
                      }}>
                      <p className="text-[14px] leading-relaxed">{slide.userMessage}</p>
                    </div>
                  </motion.div>

                  {/* AI response */}
                  <motion.div className="flex gap-3 items-start" variants={msgFromLeft}>
                    <div className="rounded-2xl rounded-bl-sm px-4 py-3 max-w-[90%]"
                      style={{
                        background: theme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : '#f2f2f7',
                        border: theme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
                      }}>
                      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                        {slide.agentBadges.map((badge, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                            style={{ background: badge.bgColor, color: badge.textColor }}>
                            {badge.label}
                          </span>
                        ))}
                      </div>
                      <p className="text-[14px] leading-relaxed" style={{ color: 'var(--text-primary)' }}>{slide.aiResponseText}</p>
                    </div>
                  </motion.div>

                  {/* Product cards */}
                  {slide.productCards && (
                    <motion.div className="ml-10 flex flex-col sm:flex-row gap-3" variants={msgFromBelow}>
                      {slide.productCards.map((card, i) => (
                        <div key={i} className="flex-1 rounded-xl p-3 flex items-center gap-3"
                          style={{
                            background: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                            border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                          }}>
                          <img src={card.image} alt={card.name} className="w-14 h-14 rounded-lg object-cover" />
                          <div>
                            <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{card.name}</div>
                            <div className="flex items-center gap-1">
                              {card.originalPrice && (
                                <span className="text-[10px] line-through" style={{ color: 'var(--text-secondary)' }}>{card.originalPrice}</span>
                              )}
                              <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>{card.price}</span>
                            </div>
                            <div className="text-yellow-500 text-[11px] mt-0.5">{'★'.repeat(Math.floor(parseFloat(card.rating)))} {card.rating}</div>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}

                  {/* Context note */}
                  {slide.contextNote && (
                    <motion.div
                      className="ml-10 flex items-center gap-1.5 text-[10px] italic"
                      style={{ color: 'var(--text-secondary)' }}
                      variants={msgFromBelow}
                    >
                      <span className="w-1 h-1 rounded-full" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)' }} />
                      {slide.contextNote}
                    </motion.div>
                  )}
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Input bar — matches AIAssistant */}
          <div className="px-5 py-4"
            style={{ borderTop: theme === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.08)' }}>
            <div className="flex gap-2.5">
              <div className="flex-1 px-4 py-3 rounded-xl text-sm"
                style={{
                  background: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  color: 'var(--text-secondary)',
                  opacity: 0.4,
                }}>
                Ask about any product...
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: modeAccent }}>
                <Send className="h-4 w-4 text-white" />
              </div>
            </div>
          </div>

          {/* Click overlay to open real chat */}
          <button
            className="absolute inset-0 w-full h-full cursor-pointer z-10 group"
            onClick={onOpenChat}
          >
            <div className="absolute inset-0 transition-colors duration-300 rounded-[20px]"
              style={{ background: 'transparent' }}
              onMouseEnter={(e) => e.currentTarget.style.background = theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            />
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 px-4 py-2 rounded-full text-xs font-medium"
              style={{ background: 'var(--link-color)', color: '#fff', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)' }}>
              Try the Live Chat
            </div>
          </button>
        </motion.div>

        {/* Navigation dots */}
        <div className="flex justify-center gap-2 mt-6">
          {visibleSlides.map((s, index) => (
            <button
              key={s.id}
              onClick={() => goToSlide(index)}
              className="group relative p-1 z-20"
              aria-label={`View ${s.featureName} demo`}
            >
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{
                  width: index === activeIndex ? 24 : 8,
                  background: index === activeIndex
                    ? (theme === 'dark' ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)')
                    : (theme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'),
                }}
              />
              {/* Tooltip */}
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-text-secondary whitespace-nowrap pointer-events-none">
                {s.featureName}
              </div>
            </button>
          ))}
        </div>
    </>
  )

  // Compact mode: return just the card + dots (for hero embedding)
  if (compact) {
    return <div className="w-full">{cardContent}</div>
  }

  // Full mode: section with heading
  return (
    <section className="py-16 lg:py-28 relative overflow-hidden">
      <div className="max-w-[1100px] mx-auto px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        >
          <h2 className="text-3xl lg:text-4xl font-extralight mb-4 tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {workshopMode === 'agentic'
              ? <>Watch them <span style={{ color: '#7c3aed' }}>collaborate</span></>
              : <>Ready for <span style={{ color: '#10b981' }}>production</span></>
            }
          </h2>
          <p className="text-lg font-light" style={{ color: 'var(--text-secondary)' }}>
            {workshopMode === 'agentic'
              ? 'Five specialist agents work together, routed by an orchestrator in real-time'
              : 'Enterprise memory, Cedar policies, and MCP Gateway — all live'
            }
          </p>
        </motion.div>
        {cardContent}
      </div>
    </section>
  )
}

export default DemoChatCarousel
