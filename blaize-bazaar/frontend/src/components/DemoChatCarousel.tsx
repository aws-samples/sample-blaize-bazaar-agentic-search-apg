/**
 * DemoChatCarousel — Auto-cycling showcase of AI agent features.
 * Each slide demonstrates a different capability with a unique
 * query/response pair and a glowing feature badge.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Search, Target, DollarSign, Database, Send, Shield, HelpCircle } from 'lucide-react'
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

// Editorial palette tokens — every slide uses the same burgundy eyebrow
// and cream body; only the feature name + copy changes. No per-slide
// gradients, no neon glow. The storefront has one register, not eight.
const EDITORIAL_BADGE = {
  bg: 'rgba(196, 69, 54, 0.08)',
  fg: '#a8423a',
  border: 'rgba(196, 69, 54, 0.22)',
}

const DEMO_SLIDES: DemoSlide[] = [
  {
    id: 'semantic-search',
    featureName: 'Meaning, not spelling',
    featureColor: 'var(--red-1)',
    featureGlow: 'rgba(196, 69, 54, 0.0)',
    featureIconKey: 'search',
    userMessage: 'A gift for someone who loves to cook.',
    aiAvatarIconKey: 'brain',
    aiAvatarLabel: 'Orchestrator',
    agentBadges: [
      { label: 'Search', bgColor: EDITORIAL_BADGE.bg, textColor: EDITORIAL_BADGE.fg },
    ],
    aiResponseText: 'Two pieces that earn their place on a working kitchen counter — the cast-iron starter for the heat, the bamboo board for the quiet.',
    productCards: [
      { name: 'Lodge Cast Iron Starter Gift Set', price: '$79.99', rating: '4.8', image: 'https://images.unsplash.com/photo-1602031939964-2854d8c32447?w=200&q=80' },
      { name: 'Cuisinart Bamboo Cutting Board Set', price: '$28.99', rating: '4.2', image: 'https://images.unsplash.com/photo-1633536705119-bcc37bf6c84e?w=200&q=80' },
    ],
    minMode: 'agentic',
  },
  {
    id: 'price-intelligence',
    featureName: 'Price, read closely',
    featureColor: 'var(--red-1)',
    featureGlow: 'rgba(196, 69, 54, 0.0)',
    featureIconKey: 'dollar',
    userMessage: 'A luxury watch, under five hundred.',
    aiAvatarIconKey: 'dollar',
    aiAvatarLabel: 'Pricing',
    agentBadges: [
      { label: 'Pricing', bgColor: EDITORIAL_BADGE.bg, textColor: EDITORIAL_BADGE.fg },
      { label: 'Search', bgColor: EDITORIAL_BADGE.bg, textColor: EDITORIAL_BADGE.fg },
    ],
    aiResponseText: 'Two Citizens sit well inside your ceiling — the Skyhawk for weight on the wrist, the Eco-Drive for days that want quieter things.',
    productCards: [
      { name: 'Citizen Promaster Skyhawk AT', price: '$425.00', rating: '4.9', image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=200&q=80' },
      { name: 'Citizen Eco-Drive Silhouette Crystal', price: '$245.00', rating: '4.9', image: 'https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?w=200&q=80' },
    ],
    minMode: 'agentic',
  },
  {
    id: 'inventory-awareness',
    featureName: 'Stock, live',
    featureColor: 'var(--red-1)',
    featureGlow: 'rgba(196, 69, 54, 0.0)',
    featureIconKey: 'database',
    userMessage: 'Is the Stanley Quencher still on the floor?',
    aiAvatarIconKey: 'database',
    aiAvatarLabel: 'Inventory',
    agentBadges: [
      { label: 'Inventory', bgColor: EDITORIAL_BADGE.bg, textColor: EDITORIAL_BADGE.fg },
      { label: 'Pricing', bgColor: EDITORIAL_BADGE.bg, textColor: EDITORIAL_BADGE.fg },
    ],
    aiResponseText: 'Four left — the Quencher H2.0 40oz at $35. Our most-reviewed piece this week; I\'d move soon if it\'s the one.',
    contextNote: 'Live stock · 4 units remaining',
    minMode: 'agentic',
  },
  {
    id: 'customer-support',
    featureName: 'Care, answered',
    featureColor: 'var(--red-1)',
    featureGlow: 'rgba(196, 69, 54, 0.0)',
    featureIconKey: 'help',
    userMessage: 'What\'s the return window for electronics?',
    aiAvatarIconKey: 'help',
    aiAvatarLabel: 'Support',
    agentBadges: [
      { label: 'Support', bgColor: EDITORIAL_BADGE.bg, textColor: EDITORIAL_BADGE.fg },
    ],
    aiResponseText: 'Thirty days, original packaging, every accessory. Refund lands on the original payment within a week.',
    contextNote: 'Policy · 30-day window',
    minMode: 'agentic',
  },
  {
    id: 'multi-agent',
    featureName: 'Five specialists, one voice',
    featureColor: 'var(--red-1)',
    featureGlow: 'rgba(196, 69, 54, 0.0)',
    featureIconKey: 'target',
    userMessage: 'Which headphones are running low — and how do the prices stack up?',
    aiAvatarIconKey: 'target',
    aiAvatarLabel: 'Orchestrator',
    agentBadges: [
      { label: 'Inventory', bgColor: EDITORIAL_BADGE.bg, textColor: EDITORIAL_BADGE.fg },
      { label: 'Pricing', bgColor: EDITORIAL_BADGE.bg, textColor: EDITORIAL_BADGE.fg },
      { label: 'Recommend', bgColor: EDITORIAL_BADGE.bg, textColor: EDITORIAL_BADGE.fg },
    ],
    aiResponseText: 'Inventory found eight AirPods Pro and six Samsung Buds3 Pro left. Pricing puts them at $249 and $229.99 — the Samsung is the softer landing.',
    contextNote: 'Routed to two specialists · 1.2s',
    minMode: 'agentic',
  },
  {
    id: 'conversation-memory',
    featureName: 'It remembers',
    featureColor: 'var(--red-1)',
    featureGlow: 'rgba(196, 69, 54, 0.0)',
    featureIconKey: 'brain',
    userMessage: 'What about the Citizen Skyhawk — is it right for every day?',
    aiAvatarIconKey: 'brain',
    aiAvatarLabel: 'Orchestrator',
    agentBadges: [
      { label: 'Search', bgColor: EDITORIAL_BADGE.bg, textColor: EDITORIAL_BADGE.fg },
    ],
    aiResponseText: 'From earlier in the conversation — yes. Atomic timekeeping, stainless case, built to be worn down to nothing and still keep time.',
    contextNote: 'Recalled · two turns back',
    minMode: 'agentic',
  },
  {
    id: 'cedar-policy',
    featureName: 'Policies that hold',
    featureColor: 'var(--red-1)',
    featureGlow: 'rgba(196, 69, 54, 0.0)',
    featureIconKey: 'shield',
    userMessage: 'Restock the Stanley Quencher — a thousand units.',
    aiAvatarIconKey: 'shield',
    aiAvatarLabel: 'Policy',
    agentBadges: [
      { label: 'Cedar', bgColor: EDITORIAL_BADGE.bg, textColor: EDITORIAL_BADGE.fg },
      { label: 'Inventory', bgColor: EDITORIAL_BADGE.bg, textColor: EDITORIAL_BADGE.fg },
    ],
    aiResponseText: 'Policy holds — anything over 500 needs a manager. I can split it into two orders that clear on their own.',
    contextNote: 'Cedar · max_restock_qty = 500',
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
  /** Active persona id. Reorders the slide deck so the first slide
   * matches the persona's clearest signal (Marco → semantic search;
   * Anna → multi-agent gift flow) and swaps the lead slide's
   * userMessage so the demo reads tailored-to-you. Omit for the
   * default rotation. */
  personaId?: string | null
}

// Slide ordering hints per persona. Each entry is a list of slide ids
// in the order they should appear for that persona. Ids missing from
// the list (or not in the deck for the current workshop mode) fall
// through to their natural order at the tail.
const PERSONA_SLIDE_ORDER: Record<string, readonly string[]> = {
  marco: [
    'semantic-search',
    'conversation-memory',
    'inventory-awareness',
    'price-intelligence',
    'customer-support',
    'multi-agent',
    'cedar-policy',
  ],
  anna: [
    'multi-agent',
    'price-intelligence',
    'semantic-search',
    'inventory-awareness',
    'customer-support',
    'conversation-memory',
    'cedar-policy',
  ],
}

// One persona-tailored override per persona: the userMessage on the
// lead slide. Keeps the demo feeling chosen-for-you on first glance
// without rewriting every slide.
const PERSONA_LEAD_MESSAGE: Record<string, string> = {
  marco: 'A linen piece that travels well.',
  anna: 'A thoughtful milestone gift, under two hundred.',
}

export function reorderForPersona(
  slides: DemoSlide[],
  personaId: string | null | undefined,
): DemoSlide[] {
  if (!personaId) return slides
  const order = PERSONA_SLIDE_ORDER[personaId]
  if (!order) return slides

  const byId = new Map(slides.map((s) => [s.id, s]))
  const ordered: DemoSlide[] = []
  for (const id of order) {
    const s = byId.get(id)
    if (s) {
      ordered.push(s)
      byId.delete(id)
    }
  }
  // Any remaining slides (ids not in the persona order, or ids added
  // after this map last) append in their original order.
  for (const s of slides) {
    if (byId.has(s.id)) ordered.push(s)
  }

  // Swap the lead slide's userMessage if we have a tailored one.
  const leadMessage = PERSONA_LEAD_MESSAGE[personaId]
  if (leadMessage && ordered.length > 0) {
    ordered[0] = { ...ordered[0], userMessage: leadMessage }
  }
  return ordered
}

const DemoChatCarousel = ({
  onOpenChat,
  compact = false,
  workshopMode = 'agentic',
  personaId = null,
}: DemoChatCarouselProps) => {
  const [activeIndex, setActiveIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const [isPaused, setIsPaused] = useState(false)
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Filter slides by workshop mode, then reorder per persona signal.
  const modeIdx = MODE_ORDER.indexOf(workshopMode)
  const modeSlides = DEMO_SLIDES.filter(s => MODE_ORDER.indexOf(s.minMode) <= modeIdx)
  const visibleSlides = reorderForPersona(modeSlides, personaId)

  // Status strip copy shifts by mode; everything else uses the single
  // editorial palette. The old mode accent colours (blue/purple/green)
  // were removed — they fought the Fraunces+cream register.
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

  // Reset activeIndex when mode or persona changes so the first slide
  // the viewer sees is the lead slide curated for them, not whatever
  // was mid-cycle before the switch.
  useEffect(() => {
    setActiveIndex(0)
  }, [workshopMode, personaId])

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
          className={`relative ${compact ? 'max-w-[520px]' : 'max-w-[700px]'} mx-auto overflow-hidden`}
          style={{
            background: 'var(--cream-1)',
            border: '1px solid var(--rule-1)',
            borderRadius: 14,
            boxShadow: '0 18px 48px -12px rgba(31, 20, 16, 0.18), 0 4px 12px -4px rgba(31, 20, 16, 0.08)',
          }}
          initial={{ opacity: 0, y: 32, scale: 0.96 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ type: 'spring', stiffness: 160, damping: 24 }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => {
            if (!resumeTimer.current) setIsPaused(false)
          }}
        >
          {/* Chat header — editorial register (eyebrow + italic title),
              matches the ChatDrawer header used in the live storefront. */}
          <div
            className="px-5 py-4 flex items-center gap-3 relative"
            style={{
              borderBottom: '1px solid var(--rule-1)',
              background: 'var(--cream-elev)',
            }}
          >
            {/* Small burgundy under-rule, storefront signature. */}
            <span
              aria-hidden
              style={{
                position: 'absolute',
                bottom: -1,
                left: 20,
                width: 28,
                height: 1,
                background: 'var(--red-1)',
              }}
            />
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: 'var(--ink-1)',
                color: 'var(--cream-1)',
                fontFamily: 'var(--serif)',
                fontWeight: 500,
                fontSize: 14,
              }}
            >
              B
            </div>
            <div className="flex flex-col gap-0.5">
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 9.5,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: 'var(--red-1)',
                  fontWeight: 500,
                }}
              >
                Concierge
              </div>
              <div
                style={{
                  fontFamily: 'var(--serif)',
                  fontStyle: 'italic',
                  fontWeight: 400,
                  fontSize: 17,
                  lineHeight: 1.1,
                  color: 'var(--ink-1)',
                }}
              >
                Blaize
              </div>
              <div
                className="flex items-center gap-1.5 mt-0.5"
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 9.5,
                  letterSpacing: '0.05em',
                  color: 'var(--ink-4)',
                }}
              >
                <span
                  className="animate-pulse"
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: 'var(--red-1)',
                  }}
                />
                {modeStatusText}
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
                {/* Feature eyebrow — burgundy dot + small-caps label, no neon. */}
                <div className="px-6 pt-4 pb-1">
                  {(() => { const FeatureIcon = ICON_MAP[slide.featureIconKey]; return (
                  <span
                    className="inline-flex items-center gap-2"
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: 10.5,
                      letterSpacing: '0.22em',
                      textTransform: 'uppercase',
                      color: 'var(--red-1)',
                      fontWeight: 500,
                    }}
                  >
                    <FeatureIcon className="w-3 h-3" />
                    {slide.featureName}
                  </span>
                  ); })()}
                </div>

                {/* Messages — matches AIAssistant bubble styling */}
                <motion.div
                  className="px-5 py-5 pt-3 space-y-4"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                >
                  {/* User message — italic Fraunces on cream-2, matches
                      storefront user bubble register. */}
                  <motion.div className="flex justify-end" variants={msgFromRight}>
                    <div
                      className="px-4 py-2.5 max-w-[85%]"
                      style={{
                        background: 'var(--cream-2)',
                        border: '1px solid var(--rule-1)',
                        color: 'var(--ink-1)',
                        borderRadius: '14px 14px 4px 14px',
                        fontFamily: 'var(--serif)',
                        fontStyle: 'italic',
                        fontSize: 15,
                        lineHeight: 1.5,
                        letterSpacing: '-0.003em',
                      }}
                    >
                      {slide.userMessage}
                    </div>
                  </motion.div>

                  {/* AI response — direct ink on cream, no bubble chrome. */}
                  <motion.div className="flex gap-3 items-start" variants={msgFromLeft}>
                    <div className="max-w-[92%]">
                      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                        {slide.agentBadges.map((badge, i) => (
                          <span
                            key={i}
                            style={{
                              fontFamily: 'var(--sans)',
                              fontSize: 10,
                              fontWeight: 500,
                              letterSpacing: '0.1em',
                              textTransform: 'uppercase',
                              padding: '3px 9px',
                              borderRadius: 999,
                              background: badge.bgColor,
                              color: badge.textColor,
                              border: `1px solid ${EDITORIAL_BADGE.border}`,
                            }}
                          >
                            {badge.label}
                          </span>
                        ))}
                      </div>
                      <p
                        style={{
                          fontFamily: 'var(--sans)',
                          fontSize: 15,
                          lineHeight: 1.7,
                          letterSpacing: '-0.003em',
                          color: 'var(--ink-1)',
                        }}
                      >
                        {slide.aiResponseText}
                      </p>
                    </div>
                  </motion.div>

                  {/* Product pills — echoes ProductPhotoPill from the
                      live chat so the demo reads as a preview of the
                      real thing. */}
                  {slide.productCards && (
                    <motion.div className="flex flex-wrap gap-2" variants={msgFromBelow}>
                      {slide.productCards.map((card, i) => (
                        <div
                          key={i}
                          className="inline-flex items-center gap-2.5"
                          style={{
                            padding: '5px 13px 5px 5px',
                            background: 'var(--cream-1)',
                            border: '1px solid var(--rule-1)',
                            borderRadius: 999,
                          }}
                        >
                          <img
                            src={card.image}
                            alt=""
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: '50%',
                              objectFit: 'cover',
                              flexShrink: 0,
                              background: 'var(--cream-2)',
                            }}
                          />
                          <span
                            style={{
                              fontFamily: 'var(--serif)',
                              fontStyle: 'italic',
                              fontSize: 13,
                              lineHeight: 1.2,
                              color: 'var(--ink-1)',
                              letterSpacing: '-0.003em',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: 200,
                            }}
                          >
                            {card.name}
                          </span>
                          <span
                            style={{
                              fontFamily: 'var(--sans)',
                              fontSize: 12,
                              fontWeight: 500,
                              color: 'var(--ink-3)',
                              letterSpacing: '-0.003em',
                              flexShrink: 0,
                            }}
                          >
                            {card.price}
                          </span>
                        </div>
                      ))}
                    </motion.div>
                  )}

                  {/* Context footnote — mono small-caps, no italic. */}
                  {slide.contextNote && (
                    <motion.div
                      className="flex items-center gap-1.5"
                      style={{
                        fontFamily: 'var(--mono)',
                        fontSize: 10,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: 'var(--ink-4)',
                      }}
                      variants={msgFromBelow}
                    >
                      <span
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: '50%',
                          background: 'var(--red-1)',
                        }}
                      />
                      {slide.contextNote}
                    </motion.div>
                  )}
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Input bar — pill shell matching the ChatDrawer footer. */}
          <div
            className="px-5 py-4"
            style={{
              borderTop: '1px solid var(--rule-1)',
              background: 'var(--cream-elev)',
            }}
          >
            <div
              className="flex items-center gap-2"
              style={{
                background: 'var(--cream-1)',
                border: '1px solid var(--rule-2)',
                borderRadius: 100,
                padding: '6px 6px 6px 16px',
              }}
            >
              <div
                className="flex-1"
                style={{
                  fontFamily: 'var(--serif)',
                  fontStyle: 'italic',
                  fontSize: 14,
                  color: 'var(--ink-4)',
                }}
              >
                Tell Blaize what you're looking for…
              </div>
              <div
                className="flex items-center justify-center flex-shrink-0"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'var(--ink-1)',
                }}
              >
                <Send className="h-3.5 w-3.5" style={{ color: 'var(--cream-1)' }} />
              </div>
            </div>
          </div>

          {/* Click overlay to open real chat. The hint pill uses
              burgundy so it lands in register with the rest of the
              surface, no iOS blue drop-shadow. */}
          <button
            className="absolute inset-0 w-full h-full cursor-pointer z-10 group"
            onClick={onOpenChat}
          >
            <div
              className="absolute inset-0 transition-colors duration-300"
              style={{ background: 'transparent', borderRadius: 14 }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(31, 20, 16, 0.02)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            />
            <div
              className="absolute bottom-20 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: 'var(--red-1)',
                color: 'var(--cream-1)',
                boxShadow: '0 4px 14px rgba(196, 69, 54, 0.32)',
                fontFamily: 'var(--sans)',
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: '-0.003em',
                padding: '8px 16px',
                borderRadius: 999,
              }}
            >
              Open the live chat
            </div>
          </button>
        </motion.div>

        {/* Navigation dots — red-1 active state, cream rule inactive. */}
        <div className="flex justify-center gap-2 mt-6">
          {visibleSlides.map((s, index) => (
            <button
              key={s.id}
              onClick={() => goToSlide(index)}
              className="group relative p-1 z-20"
              aria-label={`View ${s.featureName} demo`}
            >
              <div
                className="transition-all duration-300"
                style={{
                  height: 2,
                  borderRadius: 999,
                  width: index === activeIndex ? 28 : 10,
                  background:
                    index === activeIndex
                      ? 'var(--red-1)'
                      : 'var(--rule-2)',
                }}
              />
              <div
                className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none"
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-4)',
                }}
              >
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

  // Full mode: section with heading in editorial register.
  return (
    <section className="py-16 lg:py-24 relative overflow-hidden">
      <div className="max-w-[1100px] mx-auto px-6 lg:px-8">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        >
          <div
            className="mb-4"
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 11,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: 'var(--red-1)',
              fontWeight: 500,
            }}
          >
            <span aria-hidden>●</span>&nbsp;&nbsp;
            {workshopMode === 'agentic' ? 'The specialists at work' : 'Live in production'}
            &nbsp;&nbsp;<span aria-hidden>●</span>
          </div>
          <h2
            className="mb-4"
            style={{
              fontFamily: 'var(--serif)',
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 42,
              lineHeight: 1.05,
              letterSpacing: '-0.01em',
              color: 'var(--ink-1)',
            }}
          >
            {workshopMode === 'agentic'
              ? <>Watch them think aloud.</>
              : <>Ready, in the real world.</>
            }
          </h2>
          <p
            className="mx-auto"
            style={{
              fontFamily: 'var(--serif)',
              fontStyle: 'italic',
              fontWeight: 600,
              fontSize: 16,
              lineHeight: 1.6,
              color: 'var(--ink-3)',
              maxWidth: 620,
            }}
          >
            {workshopMode === 'agentic'
              ? 'Five specialists, one orchestrator, every decision on display.'
              : 'Managed memory, Cedar policies, MCP Gateway — every hop traced.'
            }
          </p>
        </motion.div>
        {cardContent}
      </div>
    </section>
  )
}

export default DemoChatCarousel
