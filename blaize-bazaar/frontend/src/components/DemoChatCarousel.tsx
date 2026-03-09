/**
 * DemoChatCarousel — Auto-cycling showcase of AI agent features.
 * Each slide demonstrates a different capability with a unique
 * query/response pair and a glowing feature badge.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Search, Target, DollarSign, Database, Send } from 'lucide-react'
import { useTheme } from '../App'

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
  featureIconKey: 'search' | 'target' | 'dollar' | 'brain' | 'database'
  userMessage: string
  aiAvatarIconKey: 'search' | 'target' | 'dollar' | 'brain' | 'database'
  aiAvatarLabel: string
  agentBadges: AgentBadge[]
  aiResponseText: string
  productCards?: DemoProductCard[]
  contextNote?: string
}

const ICON_MAP = {
  search: Search,
  target: Target,
  dollar: DollarSign,
  brain: Brain,
  database: Database,
}

// ─── Slide Data ───

const DEMO_SLIDES: DemoSlide[] = [
  {
    id: 'semantic-search',
    featureName: 'Semantic Search',
    featureColor: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
    featureGlow: 'rgba(59, 130, 246, 0.4)',
    featureIconKey: 'search',
    userMessage: 'Find me a good camera under $500 for travel photography',
    aiAvatarIconKey: 'brain',
    aiAvatarLabel: 'Orchestrator',
    agentBadges: [
      { label: 'Search Agent', bgColor: 'rgba(59, 130, 246, 0.2)', textColor: '#93c5fd' },
    ],
    aiResponseText: 'I found cameras matching your intent — not just keywords, but the concept of portable, travel-friendly photography under $500:',
    productCards: [
      { name: '4K Mirrorless Camera', price: '$449.99', rating: '4.7', image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=200&q=80' },
      { name: 'Compact Travel Camera', price: '$289.99', rating: '4.5', image: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=200&q=80' },
    ],
  },
  {
    id: 'multi-agent',
    featureName: 'Multi-Agent Orchestration',
    featureColor: 'linear-gradient(135deg, #a855f7, #ec4899)',
    featureGlow: 'rgba(168, 85, 247, 0.4)',
    featureIconKey: 'target',
    userMessage: 'How does the 4K Mirrorless compare to the Compact for hiking?',
    aiAvatarIconKey: 'target',
    aiAvatarLabel: 'Orchestrator',
    agentBadges: [
      { label: 'Search Agent', bgColor: 'rgba(59, 130, 246, 0.2)', textColor: '#93c5fd' },
      { label: 'Pricing Agent', bgColor: 'rgba(245, 158, 11, 0.2)', textColor: '#fcd34d' },
      { label: 'Recommendation', bgColor: 'rgba(234, 179, 8, 0.2)', textColor: '#fde047' },
    ],
    aiResponseText: 'I routed your request to 3 agents simultaneously — Search retrieved specs, Pricing found deals, and Recommendation ranked them for outdoor use.',
    contextNote: '3 agents collaborated in 1.2s',
  },
  {
    id: 'price-intelligence',
    featureName: 'Price Intelligence',
    featureColor: 'linear-gradient(135deg, #f59e0b, #ea580c)',
    featureGlow: 'rgba(245, 158, 11, 0.4)',
    featureIconKey: 'dollar',
    userMessage: 'Any deals on noise-cancelling headphones right now?',
    aiAvatarIconKey: 'dollar',
    aiAvatarLabel: 'Pricing Agent',
    agentBadges: [
      { label: 'Pricing Agent', bgColor: 'rgba(245, 158, 11, 0.2)', textColor: '#fcd34d' },
      { label: 'Search Agent', bgColor: 'rgba(59, 130, 246, 0.2)', textColor: '#93c5fd' },
    ],
    aiResponseText: 'I analyzed pricing trends and found 2 headphones with significant discounts:',
    productCards: [
      { name: 'Pro Noise-Cancelling', price: '$279.99', originalPrice: '$349.99', rating: '4.8', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&q=80' },
      { name: 'Wireless ANC Earbuds', price: '$149.99', originalPrice: '$199.99', rating: '4.6', image: 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=200&q=80' },
    ],
  },
  {
    id: 'conversation-memory',
    featureName: 'Conversation Memory',
    featureColor: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    featureGlow: 'rgba(139, 92, 246, 0.4)',
    featureIconKey: 'brain',
    userMessage: 'What about the camera you recommended — does it do 4K video?',
    aiAvatarIconKey: 'brain',
    aiAvatarLabel: 'Orchestrator',
    agentBadges: [
      { label: 'Search Agent', bgColor: 'rgba(59, 130, 246, 0.2)', textColor: '#93c5fd' },
    ],
    aiResponseText: 'Recalling from our earlier conversation — yes, the 4K Mirrorless Camera ($449.99) supports 4K at 30fps with image stabilization, ideal for travel video.',
    contextNote: 'Recalled context from 3 messages ago',
  },
  {
    id: 'inventory-awareness',
    featureName: 'Inventory Awareness',
    featureColor: 'linear-gradient(135deg, #10b981, #059669)',
    featureGlow: 'rgba(16, 185, 129, 0.4)',
    featureIconKey: 'database',
    userMessage: 'Is the Compact Travel Camera in stock? I need it by Friday.',
    aiAvatarIconKey: 'database',
    aiAvatarLabel: 'Inventory Agent',
    agentBadges: [
      { label: 'Inventory Agent', bgColor: 'rgba(16, 185, 129, 0.2)', textColor: '#6ee7b7' },
      { label: 'Pricing Agent', bgColor: 'rgba(245, 158, 11, 0.2)', textColor: '#fcd34d' },
    ],
    aiResponseText: 'Checking real-time inventory — 12 units in stock, eligible for express shipping. Estimated delivery: Thursday. $289.99 with free shipping over $200.',
    contextNote: 'Live stock: 12 units available',
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
}

const DemoChatCarousel = ({ onOpenChat, compact = false }: DemoChatCarouselProps) => {
  const { theme } = useTheme()
  const [activeIndex, setActiveIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const [isPaused, setIsPaused] = useState(false)
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-cycle
  useEffect(() => {
    if (isPaused) return
    const timer = setInterval(() => {
      setDirection(1)
      setActiveIndex(prev => (prev + 1) % DEMO_SLIDES.length)
    }, CYCLE_MS)
    return () => clearInterval(timer)
  }, [isPaused])

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

  const slide = DEMO_SLIDES[activeIndex]

  const cardContent = (
    <>
        <motion.div
          className={`relative ${compact ? 'max-w-[520px]' : 'max-w-[700px]'} mx-auto rounded-3xl overflow-hidden`}
          style={{
            background: theme === 'dark' ? 'rgba(0, 0, 0, 0.9)' : '#ffffff',
            border: theme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.1)',
            boxShadow: theme === 'dark'
              ? '0 40px 80px rgba(0, 0, 0, 0.5)'
              : '0 40px 80px rgba(0, 0, 0, 0.1), 0 8px 24px rgba(0, 0, 0, 0.06)',
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
          {/* Chat header */}
          <div className="px-6 py-4 flex items-center gap-3"
            style={{ borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}>
            <motion.div
              className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0"
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
              <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Blaize AI</div>
              <div className="text-[10px] flex items-center gap-1" style={{ color: '#22c55e' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#22c55e' }} /> 5 agents online
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

                {/* Messages */}
                <motion.div
                  className="p-6 pt-3 space-y-4"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                >
                  {/* User message */}
                  <motion.div className="flex justify-end" variants={msgFromRight}>
                    <div className="rounded-2xl rounded-br-sm px-4 py-3 max-w-[80%]"
                      style={{
                        background: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                        border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'}`,
                      }}>
                      <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{slide.userMessage}</p>
                    </div>
                  </motion.div>

                  {/* AI response */}
                  <motion.div className="flex gap-3 items-start" variants={msgFromLeft}>
                    <div className="rounded-2xl rounded-bl-sm px-4 py-3 flex-1"
                      style={{
                        background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                        border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                      }}>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {slide.agentBadges.map((badge, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                            style={{ background: badge.bgColor, color: badge.textColor }}>
                            {badge.label}
                          </span>
                        ))}
                      </div>
                      <p className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>{slide.aiResponseText}</p>
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

          {/* Input bar */}
          <div className="px-6 pb-5">
            <div className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{
                background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
              }}>
              <span className="text-sm flex-1" style={{ color: 'var(--text-secondary)' }}>Ask about any product...</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--link-color)' }}>
                <Send className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
          </div>

          {/* Click overlay to open real chat */}
          <button
            className="absolute inset-0 w-full h-full cursor-pointer z-10 group"
            onClick={onOpenChat}
          >
            <div className="absolute inset-0 transition-colors duration-300 rounded-3xl"
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
          {DEMO_SLIDES.map((s, index) => (
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
            Meet the <span style={{ color: 'var(--link-color)' }}>agents</span>
          </h2>
          <p className="text-lg font-light" style={{ color: 'var(--text-secondary)' }}>Five specialized AI agents collaborate to find exactly what you need</p>
        </motion.div>
        {cardContent}
      </div>
    </section>
  )
}

export default DemoChatCarousel
