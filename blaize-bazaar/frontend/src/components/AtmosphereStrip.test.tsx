/**
 * AtmosphereStrip tests — LIVE ticker below the hero.
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import AtmosphereStrip from './AtmosphereStrip'

describe('AtmosphereStrip', () => {
  it('renders the LIVE state + panels + median ms', () => {
    render(<AtmosphereStrip panelCount={13} medianMs={412} />)
    expect(screen.getByText('LIVE')).toBeInTheDocument()
    expect(screen.getByText(/13 PANELS/)).toBeInTheDocument()
    expect(screen.getByText(/412MS MEDIAN/)).toBeInTheDocument()
  })

  it("pluralizes PANELS correctly (singular at 1)", () => {
    render(<AtmosphereStrip panelCount={1} medianMs={120} />)
    expect(screen.getByText(/1 PANEL$/)).toBeInTheDocument()
  })

  it('shows em-dash when medianMs is null (pre-turn empty state)', () => {
    render(<AtmosphereStrip panelCount={0} medianMs={null} />)
    expect(screen.getByText(/^—$/)).toBeInTheDocument()
  })

  it('singular ACTIVE SESSION at default count of 1', () => {
    render(<AtmosphereStrip panelCount={0} medianMs={null} />)
    expect(screen.getByText(/1 ACTIVE SESSION$/)).toBeInTheDocument()
  })
})
