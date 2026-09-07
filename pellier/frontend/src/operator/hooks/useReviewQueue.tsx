import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { fetchReviewQueue, OperatorApiError, type OperatorReviewQueue } from '../../services/operator'

export function useQueueResource(enabled = true) {
  const [queue, setQueue] = useState<OperatorReviewQueue | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const active = useRef(false)
  const inFlight = useRef(false)
  const refresh = useCallback(async () => {
    if (!enabled || !active.current || inFlight.current) return
    inFlight.current = true
    setRefreshing(true)
    try {
      const next = await fetchReviewQueue()
      if (!active.current) return
      setQueue(next)
      setError(null)
      setUpdatedAt(new Date())
    } catch (err) {
      if (!active.current) return
      setError(err instanceof OperatorApiError ? err.code : 'operator_unavailable')
      if (err instanceof OperatorApiError && err.needsOperatorSignIn) setQueue(null)
    } finally {
      inFlight.current = false
      if (active.current) setRefreshing(false)
    }
  }, [enabled])
  useEffect(() => {
    active.current = true
    if (!enabled) return () => { active.current = false }
    void refresh()
    const refreshVisible = () => { if (document.visibilityState === 'visible') void refresh() }
    window.addEventListener('focus', refreshVisible)
    const timer = window.setInterval(refreshVisible, 60_000)
    return () => {
      active.current = false
      window.removeEventListener('focus', refreshVisible)
      window.clearInterval(timer)
    }
  }, [enabled, refresh])
  return { queue, error, refreshing, updatedAt, refresh }
}

export const ReviewQueueContext = createContext<ReturnType<typeof useQueueResource> | null>(null)

export function useReviewQueue() {
  const shared = useContext(ReviewQueueContext)
  const local = useQueueResource(shared === null)
  return shared ?? local
}
