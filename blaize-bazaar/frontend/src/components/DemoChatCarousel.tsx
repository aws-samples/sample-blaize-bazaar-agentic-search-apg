/**
 * DemoChatCarousel — Auto-cycling showcase of AI agent features.
 * Each slide demonstrates a different capability with a unique
 * query/response pair and a glowing feature badge.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Search, Target, DollarSign, Database, Send, Shield, HelpCircle, Sparkles } from 'lucide-react'
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

// Rewrite the `w=` parameter on an Unsplash URL so the request
// matches the rendered size on the wire. The demo cards used to
// fetch `w=200` and render at ~460px × 2x DPR = 920px, which is why
// the images looked upscaled and blurred. Called by the <img>
// srcSet ladder below to return per-breakpoint widths.
//
// Returns the URL unchanged for non-Unsplash hosts so the helper is
// safe to wrap any card.image value.
function withUnsplashSize(url: string, width: number): string {
  if (!url.includes('images.unsplash.com')) return url
  try {
    const u = new URL(url)
    u.searchParams.set('w', String(width))
    u.searchParams.set('q', '85')
    return u.toString()
  } catch {
    return url
  }
}

// ─── Slide Data ───

// Editorial palette tokens — every slide uses the same burgundy eyebrow
// and cream body; only the feature name + copy changes. No per-slide
// gradients, no neon glow. The storefront has one register, not eight.
const EDITORIAL_BADGE = {
  bg: 'rgba(196, 69, 54, 0.08)',
  fg: '#a8423a',
  border: 'rgba(196, 69, 54, 0.22)',
}

// ─── Real catalog images (from data/showcaseProducts.ts) ───
// Reused here so the demo slides show the same pieces the live chat
// would return. Every product, price, and image below exists in the
// boutique catalog — no phantom headphones or Stanley Quenchers.
const IMG = {
  linenCamp:     'https://images.unsplash.com/photo-1740711152088-88a009e877bb?w=1600&q=85',
  wideLeg:       'https://images.unsplash.com/photo-1621767527621-ecdea6e1c522?w=1600&q=85',
  strawTote:     'https://images.unsplash.com/photo-1657118493503-9cabb641a033?w=1600&q=85',
  oxford:        'https://images.unsplash.com/photo-1732605559386-bc59426d1b16?w=1600&q=85',
  sundress:      'https://images.unsplash.com/photo-1667905632551-361dd00e5e35?w=1600&q=85',
  sandal:        'https://images.unsplash.com/photo-1625318880107-49baad6765fd?w=1600&q=85',
  cardigan:      'https://images.unsplash.com/photo-1687275168013-dcc11d9c74ab?w=1600&q=85',
  tumbler:       'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=1600&q=85',
  utilityJacket: 'https://images.unsplash.com/photo-1691053318576-4bf08315e877?w=1600&q=85',
}

const DEMO_SLIDES: DemoSlide[] = [
  {
    id: 'semantic-search',
    featureName: 'Meaning, not spelling',
    featureColor: 'var(--red-1)',
    featureGlow: 'rgba(196, 69, 54, 0.0)',
    featureIconKey: 'search',
    userMessage: 'Something for slow Sunday mornings at home.',
    aiAvatarIconKey: 'brain',
    aiAvatarLabel: 'Orchestrator',
    agentBadges: [
      { label: 'Search', bgColor: EDITORIAL_BADGE.bg, textColor: EDITORIAL_BADGE.fg },
    ],
    aiResponseText: 'Two pieces that earn a place in quiet mornings — the Ceramic Tumbler Set for the coffee, the Cashmere-Blend Cardigan for the chill.',
    productCards: [
      { name: 'Ceramic Tumbler Set', price: '$52', rating: '4.9', image: IMG.tumbler },
      { name: 'Cashmere-Blend Cardigan', price: '$158', rating: '4.8', image: IMG.cardigan },
    ],
    minMode: 'agentic',
  },
  {
    id: 'price-intelligence',
    featureName: 'Price, read closely',
    featureColor: 'var(--red-1)',
    featureGlow: 'rgba(196, 69, 54, 0.0)',
    featureIconKey: 'dollar',
    userMessage: 'Linen pieces under a hundred dollars.',
    aiAvatarIconKey: 'dollar',
    aiAvatarLabel: 'Pricing',
    agentBadges: [
      { label: 'Pricing', bgColor: EDITORIAL_BADGE.bg, textColor: EDITORIAL_BADGE.fg },
      { label: 'Search', bgColor: EDITORIAL_BADGE.bg, textColor: EDITORIAL_BADGE.fg },
    ],
    aiResponseText: 'Three linen pieces sit under your ceiling — the Wide-Leg Trousers at $98, the Drawstring Shorts at $78, and the Straw Tote at $68.',
    productCards: [
      { name: 'Wide-Leg Linen Trousers', price: '$98', rating: '4.7', image: IMG.wideLeg },
      { name: 'Signature Straw Tote', price: '$68', rating: '4.9', image: IMG.strawTote },
    ],
    minMode: 'agentic',
  },
  {
    id: 'inventory-awareness',
    featureName: 'Stock, live',
    featureColor: 'var(--red-1)',
    featureGlow: 'rgba(196, 69, 54, 0.0)',
    featureIconKey: 'database',
    userMessage: 'Is the Sundress in Washed Linen still on the floor?',
    aiAvatarIconKey: 'database',
    aiAvatarLabel: 'Inventory',
    agentBadges: [
      { label: 'Inventory', bgColor: EDITORIAL_BADGE.bg, textColor: EDITORIAL_BADGE.fg },
    ],
    aiResponseText: 'Three left in Russet at $148. It\'s been our most-pulled dress this week — I\'d move if it\'s the one.',
    contextNote: 'Live stock · 3 units remaining',
    minMode: 'agentic',
  },
  {
    id: 'customer-support',
    featureName: 'Care, answered',
    featureColor: 'var(--red-1)',
    featureGlow: 'rgba(196, 69, 54, 0.0)',
    featureIconKey: 'help',
    userMessage: 'What\'s the return window on linen pieces?',
    aiAvatarIconKey: 'help',
    aiAvatarLabel: 'Support',
    agentBadges: [
      { label: 'Support', bgColor: EDITORIAL_BADGE.bg, textColor: EDITORIAL_BADGE.fg },
    ],
    aiResponseText: 'Thirty days, original packaging, unworn. Linen pieces can be exchanged for a different size within the same window.',
    contextNote: 'Policy · 30-day window',
    minMode: 'agentic',
  },
  {
    id: 'multi-agent',
    featureName: 'Five specialists, one voice',
    featureColor: 'var(--red-1)',
    featureGlow: 'rgba(196, 69, 54, 0.0)',
    featureIconKey: 'target',
    userMessage: 'Which outerwear is running low — and what\'s the best value?',
    aiAvatarIconKey: 'target',
    aiAvatarLabel: 'Orchestrator',
    agentBadges: [
      { label: 'Inventory', bgColor: EDITORIAL_BADGE.bg, textColor: EDITORIAL_BADGE.fg },
      { label: 'Pricing', bgColor: EDITORIAL_BADGE.bg, textColor: EDITORIAL_BADGE.fg },
      { label: 'Recommend', bgColor: EDITORIAL_BADGE.bg, textColor: EDITORIAL_BADGE.fg },
    ],
    aiResponseText: 'Inventory shows the Quilted Vest at 4 units and the Linen Utility Jacket at 6. Pricing puts them at $128 and $178 — the Vest is the gentler entry.',
    contextNote: 'Routed to two specialists · 1.2s',
    minMode: 'agentic',
  },
  {
    id: 'conversation-memory',
    featureName: 'It remembers',
    featureColor: 'var(--red-1)',
    featureGlow: 'rgba(196, 69, 54, 0.0)',
    featureIconKey: 'brain',
    userMessage: 'What about the Camp Shirt — does it wrinkle when you travel?',
    aiAvatarIconKey: 'brain',
    aiAvatarLabel: 'Orchestrator',
    agentBadges: [
      { label: 'Search', bgColor: EDITORIAL_BADGE.bg, textColor: EDITORIAL_BADGE.fg },
    ],
    aiResponseText: 'From earlier — the Italian Linen Camp Shirt at $128. It\'s garment-washed, so the wrinkles are the point. Rolls into a packing cube and comes out looking intentional.',
    contextNote: 'Recalled · two turns back',
    minMode: 'agentic',
  },
  {
    id: 'cedar-policy',
    featureName: 'Policies that hold',
    featureColor: 'var(--red-1)',
    featureGlow: 'rgba(196, 69, 54, 0.0)',
    featureIconKey: 'shield',
    userMessage: 'Restock the Sundress in Washed Linen — a thousand units.',
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
  theo: [
    'semantic-search',
    'inventory-awareness',
    'customer-support',
    'conversation-memory',
    'price-intelligence',
    'multi-agent',
    'cedar-policy',
  ],
}

// One persona-tailored override per persona: the userMessage on the
// lead slide. Keeps the demo feeling chosen-for-you on first glance
// without rewriting every slide.
const PERSONA_LEAD_MESSAGE: Record<string, string> = {
  marco: 'A linen piece that travels well.',
  anna: 'A thoughtful milestone gift, under two hundred.',
  theo: 'Stoneware that wears in, not out.',
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

                  {/* Product cards — full artifact-card shape matching
                      the live Storefront chat (ProductArtifactCard):
                      red-dot "PULLED FOR YOU" eyebrow, 160px image,
                      category eyebrow in mono, italic serif name,
                      price + rating row, compact "Add to bag" pill.
                      The demo now previews what a real turn produces
                      instead of a cheaper pill shorthand. */}
                  {slide.productCards && (
                    <motion.div
                      className="flex flex-col gap-3"
                      variants={msgFromBelow}
                    >
                      {slide.productCards.map((card, i) => (
                        <div
                          key={i}
                          style={{
                            background: 'var(--cream-1)',
                            border: '1px solid var(--rule-1)',
                            borderRadius: 12,
                            overflow: 'hidden',
                            boxShadow:
                              '0 8px 20px -8px rgba(31, 20, 16, 0.08)',
                          }}
                        >
                          {/* Eyebrow row */}
                          <div
                            style={{
                              padding: '11px 16px 0',
                              fontFamily: 'var(--mono)',
                              fontSize: 9.5,
                              letterSpacing: '0.22em',
                              textTransform: 'uppercase',
                              color: 'var(--red-1)',
                              fontWeight: 500,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <span
                              aria-hidden
                              style={{
                                width: 5,
                                height: 5,
                                borderRadius: '50%',
                                background: 'var(--red-1)',
                              }}
                            />
                            Pulled for you
                          </div>

                          {/* Image — srcSet lets the browser pick a
                              resolution that matches the device pixel
                              ratio. The card renders ~460px wide so
                              the 600px / 900px / 1600px ladder covers
                              1x / 2x / 3x displays without upscaling. */}
                          <div
                            style={{
                              margin: '10px 16px 0',
                              height: 140,
                              borderRadius: 8,
                              overflow: 'hidden',
                              background: 'var(--cream-2)',
                            }}
                          >
                            <img
                              src={withUnsplashSize(card.image, 900)}
                              srcSet={[
                                `${withUnsplashSize(card.image, 600)} 600w`,
                                `${withUnsplashSize(card.image, 900)} 900w`,
                                `${withUnsplashSize(card.image, 1600)} 1600w`,
                              ].join(', ')}
                              sizes="(min-width: 1024px) 460px, (min-width: 640px) 60vw, 90vw"
                              loading="lazy"
                              decoding="async"
                              alt={card.name}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                display: 'block',
                              }}
                            />
                          </div>

                          {/* Body */}
                          <div
                            style={{
                              padding: '10px 16px 14px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 4,
                            }}
                          >
                            <div
                              style={{
                                fontFamily: 'var(--mono)',
                                fontSize: 9.5,
                                letterSpacing: '0.2em',
                                textTransform: 'uppercase',
                                color: 'var(--ink-4)',
                                fontWeight: 500,
                              }}
                            >
                              Blaize Editions
                            </div>
                            <div
                              style={{
                                fontFamily: 'var(--serif)',
                                fontStyle: 'italic',
                                fontSize: 16,
                                lineHeight: 1.2,
                                color: 'var(--ink-1)',
                                letterSpacing: '-0.003em',
                              }}
                            >
                              {card.name}
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                marginTop: 4,
                              }}
                            >
                              <span
                                style={{
                                  fontFamily: 'var(--sans)',
                                  fontSize: 13,
                                  fontWeight: 500,
                                  color: 'var(--ink-1)',
                                }}
                              >
                                {card.price}
                              </span>
                              {card.rating && (
                                <span
                                  style={{
                                    fontFamily: 'var(--sans)',
                                    fontSize: 12,
                                    color: 'var(--ink-3)',
                                  }}
                                >
                                  ★ {card.rating}
                                </span>
                              )}
                              <span
                                aria-hidden
                                style={{
                                  marginLeft: 'auto',
                                  fontFamily: 'var(--sans)',
                                  fontSize: 12,
                                  fontWeight: 500,
                                  padding: '6px 14px',
                                  borderRadius: 999,
                                  background: 'var(--ink-1)',
                                  color: 'var(--cream-1)',
                                  letterSpacing: '-0.003em',
                                }}
                              >
                                Add to bag
                              </span>
                            </div>
                          </div>
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
              className="flex items-center gap-3"
              style={{
                background: 'var(--cream-1)',
                border: '1px solid var(--rule-2)',
                borderRadius: 100,
                padding: '8px 8px 8px 16px',
              }}
            >
              <Sparkles
                className="h-[18px] w-[18px] flex-shrink-0"
                style={{ color: 'var(--red-1, #c44536)' }}
                strokeWidth={1.5}
              />
              <div
                className="flex-1"
                style={{
                  fontFamily: 'var(--serif)',
                  fontStyle: 'italic',
                  fontSize: 14,
                  color: 'var(--ink-4)',
                }}
              >
                Ask Blaize anything…
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
