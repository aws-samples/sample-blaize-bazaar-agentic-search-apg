import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  fetchClientRecord,
  fetchReview,
  OperatorApiError,
  OPERATOR_REQUEST_TIMEOUT_MS,
  OPERATOR_REVIEW_TIMEOUT_MS,
} from './operator'

describe('Operator API client', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it.each([
    { name: 'client', load: () => fetchClientRecord('CUST-JESSICA'), deadline: OPERATOR_REQUEST_TIMEOUT_MS },
    { name: 'review', load: () => fetchReview(7), deadline: OPERATOR_REVIEW_TIMEOUT_MS },
  ])('surfaces an unavailable state when a $name read stalls', async ({ load, deadline }) => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn((_path: RequestInfo | URL, init?: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal
          signal?.addEventListener('abort', () => {
            reject(new DOMException('The operator request timed out.', 'AbortError'))
          })
        })
      }),
    )

    const record = load()
    const rejected = expect(record).rejects.toEqual(
      expect.objectContaining<Partial<OperatorApiError>>({
        code: 'operator_unavailable',
        status: 503,
      }),
    )
    await vi.advanceTimersByTimeAsync(deadline)

    await rejected
  })

  it('allows a full review body to arrive after the lightweight read deadline', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn(async (_path: RequestInfo | URL, init?: RequestInit) => ({
      ok: true,
      json: () => new Promise((resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('Timeout', 'AbortError')))
        setTimeout(() => resolve({ review: { reviewId: 7 } }), 12_000)
      }),
    })))
    const result = expect(fetchReview(7)).resolves.toMatchObject({ review: { reviewId: 7 } })
    await vi.advanceTimersByTimeAsync(12_000)
    await result
  })
})

describe('Operator API refusals', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads a governed refusal object instead of stringifying it', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 409,
        json: async () => ({
          detail: { error: 'governed_rail_unavailable', missing: ['AGENTCORE_GATEWAY_URL', 7] },
        }),
      })),
    )

    await expect(fetchClientRecord('CUST-JESSICA')).rejects.toMatchObject({
      code: 'governed_rail_unavailable',
      status: 409,
      missing: ['AGENTCORE_GATEWAY_URL'],
    })
  })
})
