import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ConciergeComposer from './ConciergeComposer'

describe('Concierge draft', () => {
  it('keeps composing Enter inside an IME', () => {
    const submit = vi.fn().mockResolvedValue(true)
    render(<ConciergeComposer enabled submitting={false} note="" error={null} onSubmit={submit} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '返品について' } })
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
    expect(submit).not.toHaveBeenCalled()
    expect(input).toHaveValue('返品について')
  })
  it('retains a failed request and a new draft typed during a request', async () => {
    let resolve!: (value: boolean) => void
    const submit = vi.fn(() => new Promise<boolean>((done) => { resolve = done }))
    render(<ConciergeComposer enabled submitting={false} note="" error={null} onSubmit={submit} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'Investigate this return' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    await act(async () => { resolve(false) })
    expect(input).toHaveValue('Investigate this return')
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.change(input, { target: { value: 'My next question' } })
    await act(async () => { resolve(true) })
    expect(input).toHaveValue('My next question')
  })
})
