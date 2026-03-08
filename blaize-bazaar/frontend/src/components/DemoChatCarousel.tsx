/**
 * DemoChatCarousel — Auto-cycling showcase of AI agent features.
 * Each slide demonstrates a different capability with a unique
 * query/response pair and a glowing feature badge.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain } from 'lucide-react'

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
  featureIcon: string
  userMessage: string
  aiAvatarEmoji: string
  aiAvatarLabel: string
  agentBadges: AgentBadge[]
  aiResponseText: string
  productCards?: DemoProductCard[]
  contextNote?: string
}

// ─── Slide Data ───

const DEMO_SLIDES: DemoSlide[] = [
  {
    id: 'semantic-search',
    featureName: 'Semantic Search',
    featureColor: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
    featureGlow: 'rgba(59, 130, 246, 0.4)',
    featureIcon: '🔍',
    userMessage: 'Find me a good camera under $500 for travel photography',
    aiAvatarEmoji: '🧠',
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
    featureIcon: '🎯',
    userMessage: 'How does the 4K Mirrorless compare to the Compact for hiking?',
    aiAvatarEmoji: '🎯',
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
    featureIcon: '💰',
    userMessage: 'Any deals on noise-cancelling headphones right now?',
    aiAvatarEmoji: '💰',
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
    featureIcon: '🧠',
    userMessage: 'What about the camera you recommended — does it do 4K video?',
    aiAvatarEmoji: '🧠',
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
    featureIcon: '📦',
    userMessage: 'Is the Compact Travel Camera in stock? I need it by Friday.',
    aiAvatarEmoji: '📦',
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
}

const DemoChatCarousel = ({ onOpenChat }: DemoChatCarouselProps) => {
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

  return (
    <section className="py-16 lg:py-28 relative overflow-hidden">
      <div className="max-w-[1100px] mx-auto px-6 lg:px-8">
        {/* Section heading */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        >
          <h2 className="text-3xl lg:text-4xl font-extralight text-white mb-4 tracking-tight">
            Meet the <span className="text-purple-400">agents</span>
          </h2>
          <p className="text-white/40 text-lg font-light">Five specialized AI agents collaborate to find exactly what you need</p>
        </motion.div>

        {/* Chat demo card */}
        <motion.div
          className="relative max-w-[700px] mx-auto rounded-3xl overflow-hidden"
          style={{
            background: 'rgba(13, 13, 26, 0.8)',
            border: '1px solid rgba(168, 85, 247, 0.2)',
            boxShadow: '0 40px 80px rgba(0, 0, 0, 0.5), 0 0 80px rgba(168, 85, 247, 0.08)',
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
          {/* Chat header (constant) */}
          <div className="px-6 py-4 border-b border-purple-500/20 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
              style={{ background: 'linear-gradient(135deg, #7c2bad, #a855f7)' }}>
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-white text-sm font-medium">Blaize AI Assistant</div>
              <div className="text-green-400 text-[10px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> 5 agents online
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
                    <span>{slide.featureIcon}</span>
                    {slide.featureName}
                  </motion.span>
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
                    <div className="bg-purple-600/30 border border-purple-500/30 rounded-2xl rounded-br-sm px-4 py-3 max-w-[80%]">
                      <p className="text-white text-sm">{slide.userMessage}</p>
                    </div>
                  </motion.div>

                  {/* AI response */}
                  <motion.div className="flex gap-3 items-start" variants={msgFromLeft}>
                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
                        style={{ background: slide.featureColor }}>
                        {slide.aiAvatarEmoji}
                      </div>
                      <span className="text-[9px] text-purple-400">{slide.aiAvatarLabel}</span>
                    </div>
                    <div className="bg-white/5 border border-purple-500/15 rounded-2xl rounded-bl-sm px-4 py-3 flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {slide.agentBadges.map((badge, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                            style={{ background: badge.bgColor, color: badge.textColor }}>
                            {badge.label}
                          </span>
                        ))}
                      </div>
                      <p className="text-white/80 text-sm">{slide.aiResponseText}</p>
                    </div>
                  </motion.div>

                  {/* Product cards */}
                  {slide.productCards && (
                    <motion.div className="ml-10 flex flex-col sm:flex-row gap-3" variants={msgFromBelow}>
                      {slide.productCards.map((card, i) => (
                        <div key={i} className="flex-1 rounded-xl p-3 flex items-center gap-3"
                          style={{ background: 'rgba(168, 85, 247, 0.06)', border: '1px solid rgba(168, 85, 247, 0.15)' }}>
                          <img src={card.image} alt={card.name} className="w-12 h-12 rounded-lg object-cover" />
                          <div>
                            <div className="text-white text-xs font-medium">{card.name}</div>
                            <div className="flex items-center gap-1">
                              {card.originalPrice && (
                                <span className="text-white/40 text-[10px] line-through">{card.originalPrice}</span>
                              )}
                              <span className="text-purple-400 text-xs font-semibold">{card.price}</span>
                            </div>
                          </div>
                          <div className="ml-auto text-yellow-400 text-xs">★ {card.rating}</div>
                        </div>
                      ))}
                    </motion.div>
                  )}

                  {/* Context note */}
                  {slide.contextNote && (
                    <motion.div
                      className="ml-10 flex items-center gap-1.5 text-[10px] text-purple-400/60 italic"
                      variants={msgFromBelow}
                    >
                      <span className="w-1 h-1 rounded-full bg-purple-400/40" />
                      {slide.contextNote}
                    </motion.div>
                  )}
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Input bar (constant) */}
          <div className="px-6 pb-5">
            <div className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(168, 85, 247, 0.15)' }}>
              <span className="text-white/30 text-sm flex-1">Ask about any product...</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #7c2bad, #a855f7)' }}>
                <span className="text-white text-xs">↑</span>
              </div>
            </div>
          </div>

          {/* Click overlay to open real chat */}
          <button
            className="absolute inset-0 w-full h-full cursor-pointer z-10 group"
            onClick={onOpenChat}
          >
            <div className="absolute inset-0 bg-purple-500/0 group-hover:bg-purple-500/5 transition-colors duration-300 rounded-3xl" />
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 px-4 py-2 rounded-full text-xs font-medium text-white"
              style={{ background: 'linear-gradient(135deg, #7c2bad, #a855f7)', boxShadow: '0 4px 20px rgba(168, 85, 247, 0.4)' }}>
              Try the Live Chat →
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
                    ? 'rgba(168, 85, 247, 0.8)'
                    : 'rgba(255, 255, 255, 0.15)',
                }}
              />
              {/* Tooltip */}
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-white/60 whitespace-nowrap pointer-events-none">
                {s.featureName}
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

export default DemoChatCarousel
