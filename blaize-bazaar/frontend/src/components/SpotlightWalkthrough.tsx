/**
 * Spotlight Walkthrough — Full-screen overlay with cutout highlighting + tooltip card.
 * Uses box-shadow cutout technique and rAF tracking for smooth spotlight positioning.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useLayout } from '../contexts/LayoutContext'
import { TOUR_STEPS, type TourAction } from '../data/tourSteps'
import { ChevronRight, X, Sparkles, PartyPopper, Github } from 'lucide-react'

interface SpotlightWalkthroughProps {
  onAction: (actionKey: TourAction['actionKey']) => void
}

interface TargetRect {
  top: number
  left: number
  width: number
  height: number
}

const SpotlightWalkthrough = ({ onAction }: SpotlightWalkthroughProps) => {
  const { activeTour, tourStep, advanceTour, endTour } = useLayout()
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null)
  const rafRef = useRef<number>(0)
  const prevRectRef = useRef<TargetRect | null>(null)

  const steps = activeTour ? TOUR_STEPS[activeTour] : []
  const currentStep = steps[tourStep]
  const totalSteps = steps.length
  const isLastStep = tourStep === totalSteps - 1
  const padding = currentStep?.spotlightPadding ?? 8

  // Track target element position with rAF
  const trackTarget = useCallback(() => {
    if (!currentStep) return
    const el = document.querySelector(currentStep.selector)
    if (el) {
      const rect = el.getBoundingClientRect()
      const newRect = {
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      }
      // Only update state if rect actually changed (avoid re-renders)
      const prev = prevRectRef.current
      if (!prev || prev.top !== newRect.top || prev.left !== newRect.left ||
          prev.width !== newRect.width || prev.height !== newRect.height) {
        prevRectRef.current = newRect
        setTargetRect(newRect)
      }
    } else {
      if (prevRectRef.current !== null) {
        prevRectRef.current = null
        setTargetRect(null)
      }
    }
    rafRef.current = requestAnimationFrame(trackTarget)
  }, [currentStep, padding])

  useEffect(() => {
    if (!activeTour || !currentStep) return
    // Scroll target into view
    const el = document.querySelector(currentStep.selector)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    // Start tracking
    rafRef.current = requestAnimationFrame(trackTarget)
    return () => cancelAnimationFrame(rafRef.current)
  }, [activeTour, currentStep, trackTarget])

  // Keyboard navigation
  useEffect(() => {
    if (!activeTour) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') endTour()
      if (e.key === 'ArrowRight' || e.key === 'Enter') advanceTour()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [activeTour, advanceTour, endTour])

  if (!activeTour || !currentStep) return null

  // Compute tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect) return { opacity: 0 }
    const gap = 16
    const tooltipWidth = 340
    const pos = currentStep.position

    switch (pos) {
      case 'bottom':
        return {
          top: targetRect.top + targetRect.height + gap,
          left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
        }
      case 'top':
        return {
          bottom: window.innerHeight - targetRect.top + gap,
          left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
        }
      case 'right':
        return {
          top: targetRect.top + targetRect.height / 2 - 80,
          left: targetRect.left + targetRect.width + gap,
        }
      case 'left':
        return {
          top: targetRect.top + targetRect.height / 2 - 80,
          right: window.innerWidth - targetRect.left + gap,
        }
      default:
        return {
          top: targetRect.top + targetRect.height + gap,
          left: targetRect.left,
        }
    }
  }

  // Celebration card — full-screen centered modal
  const celebrationCard = (
    <motion.div
      className="fixed inset-0 z-[2500] flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="absolute inset-0" style={{ background: 'rgba(0, 0, 0, 0.85)' }} onClick={endTour} />
      <motion.div
        className="relative w-[440px] max-w-[90vw]"
        initial={{ opacity: 0, scale: 0.85, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
      >
        <div
          className="rounded-3xl p-8 shadow-2xl text-center"
          style={{
            background: 'rgba(0, 0, 0, 0.95)',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <motion.div
            className="text-6xl mb-5"
            animate={{ rotate: [0, -10, 10, -5, 5, 0], scale: [1, 1.2, 1] }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            🎉
          </motion.div>

          <h2 className="text-2xl font-semibold mb-3 text-white" style={{ letterSpacing: '-0.02em' }}>
            {currentStep.title}
          </h2>

          <p className="text-[14px] leading-relaxed mb-6" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            {currentStep.description}
          </p>

          {/* Tech stack badges */}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {['Aurora PostgreSQL', 'pgvector', 'Amazon Bedrock', 'Strands SDK'].map(tech => (
              <span
                key={tech}
                className="px-3 py-1 rounded-full text-[11px] font-medium"
                style={{
                  background: 'rgba(52, 211, 153, 0.1)',
                  border: '1px solid rgba(52, 211, 153, 0.25)',
                  color: 'rgba(52, 211, 153, 0.9)',
                }}
              >
                {tech}
              </span>
            ))}
          </div>

          {/* Next steps */}
          <div
            className="rounded-xl p-4 mb-6 text-left"
            style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
          >
            <p className="text-[12px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
              Next Steps
            </p>
            <div className="space-y-2">
              {[
                'Explore all Developer Tools — every panel is now unlocked',
                'Try multi-turn agent conversations with complex queries',
                'Test Guardrails with PII and off-topic inputs',
                'Toggle Chaos Mode and watch retry patterns in Agent Traces',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2 text-[13px]" style={{ color: 'rgba(255, 255, 255, 0.55)' }}>
                  <span className="text-[10px] mt-0.5" style={{ color: 'rgba(52, 211, 153, 0.7)' }}>▸</span>
                  {step}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-center gap-3">
            <a
              href="https://github.com/aws-samples/sample-dat406-build-agentic-ai-powered-search-apg"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all hover:bg-white/10"
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'rgba(255, 255, 255, 0.7)',
              }}
            >
              <Github className="h-4 w-4" />
              View Source
            </a>
            <button
              onClick={advanceTour}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[13px] font-medium transition-all hover:brightness-110"
              style={{
                background: '#0071e3',
                color: '#ffffff',
              }}
            >
              <PartyPopper className="h-4 w-4" />
              Start Exploring
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )

  // Regular tooltip overlay
  const regularOverlay = (
    <motion.div
      key="spotlight-overlay"
      className="fixed inset-0 z-[2500]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Dark overlay with cutout */}
      <div
        className="absolute inset-0"
        onClick={endTour}
        style={{ background: 'rgba(0, 0, 0, 0.75)' }}
      />

      {/* Spotlight cutout */}
      {targetRect && (
        <motion.div
          className="absolute rounded-xl"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75)',
            pointerEvents: 'none',
          }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          {/* Glowing border ring */}
          <div
            className="absolute inset-0 rounded-xl"
            style={{
              border: '2px solid rgba(59, 130, 246, 0.5)',
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.2), inset 0 0 20px rgba(59, 130, 246, 0.05)',
            }}
          />
        </motion.div>
      )}

      {/* Tooltip card */}
      <motion.div
        key={`tooltip-${tourStep}`}
        className="absolute w-[340px]"
        style={{
          ...getTooltipStyle(),
          pointerEvents: 'auto',
        }}
        initial={{ opacity: 0, y: currentStep.position === 'top' ? 12 : -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.1 }}
      >
        <div
          className="rounded-2xl p-5 shadow-2xl"
          style={{
            background: 'rgba(0, 0, 0, 0.95)',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          {/* Step counter */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-medium" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
              {tourStep + 1} of {totalSteps}
            </span>
            <button
              onClick={endTour}
              className="p-1 rounded-lg transition-colors hover:bg-white/10"
            >
              <X className="h-3.5 w-3.5" style={{ color: 'rgba(255, 255, 255, 0.4)' }} />
            </button>
          </div>

          {/* Step dots */}
          <div className="flex items-center gap-1.5 mb-4">
            {steps.map((_, i) => (
              <div
                key={i}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === tourStep ? 20 : 6,
                  background: i === tourStep
                    ? 'rgba(59, 130, 246, 0.8)'
                    : i < tourStep
                      ? 'rgba(52, 211, 153, 0.6)'
                      : 'rgba(255, 255, 255, 0.15)',
                }}
              />
            ))}
          </div>

          {/* Content */}
          <h3 className="text-[16px] font-semibold mb-2" style={{ color: '#ffffff', letterSpacing: '-0.01em' }}>
            {currentStep.title}
          </h3>
          <p className="text-[14px] leading-relaxed mb-4" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
            {currentStep.description}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {currentStep.tryItAction && (
              <button
                onClick={() => {
                  onAction(currentStep.tryItAction!.actionKey)
                  // Auto-advance after a short delay so user sees the action
                  setTimeout(() => advanceTour(), 600)
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-medium transition-all hover:brightness-110"
                style={{
                  background: 'rgba(59, 130, 246, 0.25)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  color: 'rgba(147, 197, 253, 0.95)',
                }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {currentStep.tryItAction.label}
              </button>
            )}
            <button
              onClick={advanceTour}
              className="flex items-center gap-1 px-3.5 py-2 rounded-xl text-[13px] font-medium transition-all hover:bg-white/15 ml-auto"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: 'rgba(255, 255, 255, 0.8)',
              }}
            >
              {isLastStep ? 'Done' : 'Next'}
              {!isLastStep && <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          </div>

          {/* Skip link */}
          {!isLastStep && (
            <button
              onClick={endTour}
              className="mt-3 text-[11px] transition-colors hover:underline block mx-auto"
              style={{ color: 'rgba(255, 255, 255, 0.3)' }}
            >
              Skip tour
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )

  const overlay = (
    <AnimatePresence>
      {currentStep.celebration ? celebrationCard : regularOverlay}
    </AnimatePresence>
  )

  return createPortal(overlay, document.body)
}

export default SpotlightWalkthrough
