/**
 * DemoChatCarousel.reorderForPersona tests — persona-specific slide
 * ordering for the auto-cycling showcase.
 */
import { describe, expect, it } from 'vitest'
import { reorderForPersona } from './DemoChatCarousel'

// Synthetic slide deck — real DemoSlide has many fields, but
// reorderForPersona only reads `id` and `userMessage`. Cast through
// unknown to sidestep the full-shape requirement.
function makeSlides(): any[] {
  return [
    { id: 'semantic-search', userMessage: 'A gift for someone who loves to cook.' },
    { id: 'price-intelligence', userMessage: 'A luxury watch, under five hundred.' },
    { id: 'inventory-awareness', userMessage: 'Is the Stanley Quencher still on the floor?' },
    { id: 'customer-support', userMessage: "What's the return window for electronics?" },
    { id: 'multi-agent', userMessage: 'Which headphones are running low?' },
    { id: 'conversation-memory', userMessage: 'What about the Citizen Skyhawk?' },
    { id: 'cedar-policy', userMessage: 'Restock the Stanley Quencher.' },
  ]
}

describe('reorderForPersona', () => {
  it('returns the slides unchanged when personaId is null or undefined', () => {
    const slides = makeSlides()
    const original = [...slides]
    expect(reorderForPersona(slides, null).map((s) => s.id)).toEqual(
      original.map((s) => s.id),
    )
    expect(reorderForPersona(slides, undefined).map((s) => s.id)).toEqual(
      original.map((s) => s.id),
    )
  })

  it('returns the slides unchanged for unknown personas', () => {
    const slides = makeSlides()
    const result = reorderForPersona(slides, 'sam')
    expect(result.map((s) => s.id)).toEqual(slides.map((s) => s.id))
  })

  it('leads with semantic-search for Marco', () => {
    const result = reorderForPersona(makeSlides(), 'marco')
    expect(result[0].id).toBe('semantic-search')
    // And Marco's tailored userMessage replaces the default.
    expect(result[0].userMessage).toBe('A linen piece that travels well.')
  })

  it('leads with multi-agent for Anna', () => {
    const result = reorderForPersona(makeSlides(), 'anna')
    expect(result[0].id).toBe('multi-agent')
    expect(result[0].userMessage).toBe(
      'A thoughtful milestone gift, under two hundred.',
    )
  })

  it('leads with semantic-search for Theo and uses the stoneware tailored message', () => {
    const result = reorderForPersona(makeSlides(), 'theo')
    expect(result[0].id).toBe('semantic-search')
    expect(result[0].userMessage).toBe('Stoneware that wears in, not out.')
  })

  it('preserves every slide in the deck (no drops, no dupes)', () => {
    const slides = makeSlides()
    for (const personaId of ['marco', 'anna', 'theo']) {
      const result = reorderForPersona(slides, personaId)
      expect(result).toHaveLength(slides.length)
      const ids = result.map((s) => s.id).sort()
      expect(ids).toEqual(slides.map((s) => s.id).sort())
    }
  })

  it('only mutates the lead slide\'s userMessage, not the rest', () => {
    const slides = makeSlides()
    const originalMessages = new Map(slides.map((s) => [s.id, s.userMessage]))
    const result = reorderForPersona(slides, 'marco')
    for (const slide of result.slice(1)) {
      expect(slide.userMessage).toBe(originalMessages.get(slide.id))
    }
  })

  it("appends slides that aren't in the persona order at the tail", () => {
    // Hand-craft a deck with a slide id the persona ordering doesn't
    // know about.
    const slides: any[] = [
      { id: 'semantic-search', userMessage: 'q1' },
      { id: 'mystery-slide', userMessage: 'q2' },
      { id: 'multi-agent', userMessage: 'q3' },
    ]
    const result = reorderForPersona(slides, 'marco')
    // Marco's order lists semantic-search first, then skips straight
    // to conversation-memory / inventory / etc. (none present here),
    // then multi-agent. mystery-slide wasn't in the persona order at
    // all so it should land at the tail.
    expect(result.map((s) => s.id)).toEqual([
      'semantic-search',
      'multi-agent',
      'mystery-slide',
    ])
  })
})
