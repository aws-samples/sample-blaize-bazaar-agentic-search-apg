/**
 * Spotlight Walkthrough — Full-screen overlay with cutout highlighting + tooltip card.
 * Uses box-shadow cutout technique and rAF tracking for smooth spotlight positioning.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useLayout } from '../contexts/LayoutContext'
import { TOUR_STEPS, type TourAction } from '../data/tourSteps'
import { ChevronRight, X, Sparkles, PartyPopper, Github, Check } from 'lucide-react'

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
    const el = document.querySelector(currentStep.selector)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
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
    const tooltipWidth = 360

    switch (currentStep.position) {
      case 'bottom':
        return {
          top: targetRect.top + targetRect.height + gap,
          left: Math.max(16, Math.min(
            targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
            window.innerWidth - tooltipWidth - 16
          )),
        }
      case 'top':
        return {
          bottom: window.innerHeight - targetRect.top + gap,
          left: Math.max(16, Math.min(
            targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
            window.innerWidth - tooltipWidth - 16
          )),
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
      <div className="absolute inset-0" style={{ background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }} onClick={endTour} />
      <motion.div
        className="relative w-[460px] max-w-[90vw]"
        initial={{ opacity: 0, scale: 0.9, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 240, damping: 24, delay: 0.1 }}
      >
        <div
          className="rounded-2xl p-8 text-center"
          style={{
            background: 'rgba(28, 28, 30, 0.98)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 24px 80px -12px rgba(0, 0, 0, 0.7)',
          }}
        >
          {/* Animated checkmark */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            style={{
              width: 64, height: 64, borderRadius: 20, margin: '0 auto 20px',
              background: 'linear-gradient(135deg, #30D158, #34C759)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(48, 209, 88, 0.3)',
            }}
          >
            <Check className="h-8 w-8" style={{ color: '#fff', strokeWidth: 3 }} />
          </motion.div>

          <h2 className="text-2xl font-semibold mb-2 text-white" style={{ letterSpacing: '-0.02em' }}>
            {currentStep.title}
          </h2>

          <p className="text-[14px] leading-relaxed mb-8" style={{ color: 'rgba(255, 255, 255, 0.55)', maxWidth: 360, margin: '0 auto' }}>
            {currentStep.description}
          </p>

          {/* Tech stack — minimal pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {['Aurora PostgreSQL', 'pgvector', 'Amazon Bedrock', 'Strands SDK', 'AgentCore'].map(tech => (
              <span
                key={tech}
                className="px-3 py-1 rounded-full text-[11px] font-medium"
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  color: 'rgba(255, 255, 255, 0.5)',
                }}
              >
                {tech}
              </span>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-center gap-3">
            <a
              href="https://github.com/aws-samples/sample-blaize-bazaar-agentic-search-apg"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[13px] font-medium transition-all hover:bg-white/10"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'rgba(255, 255, 255, 0.7)',
              }}
            >
              <Github className="h-4 w-4" />
              Source Code
            </a>
            <button
              onClick={advanceTour}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[13px] font-medium transition-all"
              style={{
                background: '#0A84FF',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(10, 132, 255, 0.3)',
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
      transition={{ duration: 0.25 }}
    >
      {/* Dark overlay with cutout */}
      <div
        className="absolute inset-0"
        onClick={endTour}
        style={{ background: 'rgba(0, 0, 0, 0.7)' }}
      />

      {/* Spotlight cutout */}
      {targetRect && (
        <motion.div
          className="absolute"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
            borderRadius: 14,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)',
            pointerEvents: 'none',
          }}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        >
          {/* Subtle ring */}
          <motion.div
            className="absolute inset-0"
            style={{ borderRadius: 14 }}
            animate={{
              boxShadow: [
                '0 0 0 2px rgba(10, 132, 255, 0.4), 0 0 16px rgba(10, 132, 255, 0.15)',
                '0 0 0 2px rgba(10, 132, 255, 0.6), 0 0 24px rgba(10, 132, 255, 0.2)',
                '0 0 0 2px rgba(10, 132, 255, 0.4), 0 0 16px rgba(10, 132, 255, 0.15)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
      )}

      {/* Tooltip card */}
      <motion.div
        key={`tooltip-${tourStep}`}
        className="absolute"
        style={{
          ...getTooltipStyle(),
          width: 360,
          pointerEvents: 'auto',
        }}
        initial={{ opacity: 0, y: currentStep.position === 'top' ? 10 : -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.08 }}
      >
        <div
          className="rounded-2xl p-5"
          style={{
            background: 'rgba(28, 28, 30, 0.98)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 16px 48px -8px rgba(0, 0, 0, 0.6)',
          }}
        >
          {/* Header row: progress + close */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
                style={{ background: 'rgba(10, 132, 255, 0.15)', color: 'rgba(10, 132, 255, 0.9)' }}
              >
                {tourStep + 1}/{totalSteps}
              </span>
            </div>
            <button
              onClick={endTour}
              className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
              aria-label="Close tour"
            >
              <X className="h-3.5 w-3.5" style={{ color: 'rgba(255, 255, 255, 0.35)' }} />
            </button>
          </div>

          {/* Progress bar */}
          <div
            className="h-[3px] rounded-full mb-4 overflow-hidden"
            style={{ background: 'rgba(255, 255, 255, 0.08)' }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ background: '#0A84FF' }}
              initial={{ width: 0 }}
              animate={{ width: `${((tourStep + 1) / totalSteps) * 100}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>

          {/* Content */}
          <h3 className="text-[16px] font-semibold mb-2" style={{ color: '#ffffff', letterSpacing: '-0.01em' }}>
            {currentStep.title}
          </h3>
          <p className="text-[13px] leading-relaxed mb-5" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            {currentStep.description}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {currentStep.tryItAction && (
              <motion.button
                onClick={() => {
                  onAction(currentStep.tryItAction!.actionKey)
                  setTimeout(() => advanceTour(), 600)
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-medium"
                style={{
                  background: '#0A84FF',
                  color: '#ffffff',
                  boxShadow: '0 2px 8px rgba(10, 132, 255, 0.3)',
                }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {currentStep.tryItAction.label}
              </motion.button>
            )}
            <motion.button
              onClick={advanceTour}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-1 px-4 py-2 rounded-xl text-[13px] font-medium ml-auto"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'rgba(255, 255, 255, 0.8)',
              }}
            >
              {isLastStep ? 'Done' : 'Next'}
              {!isLastStep && <ChevronRight className="h-3.5 w-3.5" />}
            </motion.button>
          </div>

          {/* Skip link */}
          {!isLastStep && (
            <button
              onClick={endTour}
              className="mt-3 text-[11px] transition-colors hover:text-white/50 block mx-auto"
              style={{ color: 'rgba(255, 255, 255, 0.25)' }}
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
