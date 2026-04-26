/**
 * SessionHeader tests — top-of-right-rail session identity strip.
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import SessionHeader from './SessionHeader'

describe('SessionHeader', () => {
  it('renders the session id + customer label together', () => {
    render(
      <SessionHeader
        sessionId="39b5f398"
        customerLabel="Marco"
        elapsedMs={14163}
      />,
    )
    const header = screen.getByTestId('session-header')
    expect(header.textContent).toContain('39b5f398')
    expect(header.textContent).toContain('Marco')
  })

  it('renders elapsed ms with the ms suffix when present', () => {
    render(
      <SessionHeader
        sessionId="abc123"
        customerLabel="Anonymous"
        elapsedMs={14163}
      />,
    )
    expect(screen.getByText(/14163ms/)).toBeInTheDocument()
  })

  it('shows em-dash for session id and elapsed ms in the pre-turn empty state', () => {
    render(
      <SessionHeader
        sessionId={null}
        customerLabel="Anonymous"
        elapsedMs={null}
      />,
    )
    const header = screen.getByTestId('session-header')
    // Two em-dashes render (session and elapsed both null).
    const dashes = header.textContent?.match(/—/g) ?? []
    expect(dashes.length).toBeGreaterThanOrEqual(2)
  })

  it('renders SESSION and ELAPSED labels in their small-caps slots', () => {
    render(
      <SessionHeader
        sessionId="39b5f398"
        customerLabel="Marco"
        elapsedMs={100}
      />,
    )
    expect(screen.getByText(/^Session$/i)).toBeInTheDocument()
    expect(screen.getByText(/^Elapsed$/i)).toBeInTheDocument()
  })
})
