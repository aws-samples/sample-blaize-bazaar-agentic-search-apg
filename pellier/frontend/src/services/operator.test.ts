import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  fetchClientRecord,
  OperatorApiError,
  OPERATOR_REQUEST_TIMEOUT_MS,
} from './operator'

describe('Operator API client', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('surfaces an unavailable state when an Operator read stalls', async () => {
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

    const record = fetchClientRecord('CUST-JESSICA')
    const rejected = expect(record).rejects.toEqual(
      expect.objectContaining<Partial<OperatorApiError>>({
        code: 'operator_unavailable',
        status: 503,
      }),
    )
    await vi.advanceTimersByTimeAsync(OPERATOR_REQUEST_TIMEOUT_MS)

    await rejected
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
