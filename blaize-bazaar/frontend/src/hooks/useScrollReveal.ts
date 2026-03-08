import { useCallback, useEffect, useState } from 'react'

/**
 * Apple-style scroll-linked scale animation.
 * Elements scale from 0.92 → 1.0 as they enter the viewport center,
 * then gently scale back to 0.97 as they leave.
 */
export function useScrollReveal(threshold = 0.15) {
  const [el, setEl] = useState<HTMLElement | null>(null)
  const [scale, setScale] = useState(0.92)
  const [opacity, setOpacity] = useState(0)
  const [y, setY] = useState(40)

  // Callback ref — works with any HTML element type
  const ref = useCallback((node: HTMLElement | null) => {
    setEl(node)
  }, [])

  useEffect(() => {
    if (!el) return

    const onScroll = () => {
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight
      const centerY = rect.top + rect.height / 2
      const progress = 1 - centerY / vh

      if (progress < threshold) {
        setScale(0.92)
        setOpacity(0)
        setY(40)
      } else if (progress < 0.5) {
        const t = (progress - threshold) / (0.5 - threshold)
        const eased = t * t * (3 - 2 * t)
        setScale(0.92 + eased * 0.08)
        setOpacity(Math.min(eased * 1.2, 1))
        setY(40 * (1 - eased))
      } else if (progress < 0.85) {
        setScale(1)
        setOpacity(1)
        setY(0)
      } else {
        const t = (progress - 0.85) / 0.15
        const eased = t * t
        setScale(1 - eased * 0.03)
        setOpacity(1 - eased * 0.15)
        setY(-8 * eased)
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [el, threshold])

  return { ref, scale, opacity, y }
}
