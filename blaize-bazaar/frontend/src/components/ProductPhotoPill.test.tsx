/**
 * ProductPhotoPill tests — compact photo chip rendering.
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import ProductPhotoPill from './ProductPhotoPill'

const BASE_PRODUCT = {
  id: 42,
  name: 'Italian Linen Camp Shirt — Sage',
  price: 128,
  image: 'https://cdn.example/sage.jpg',
  category: 'Shirts',
}

describe('ProductPhotoPill', () => {
  it('renders the head-only name (strips the " — variant" suffix)', () => {
    render(<ProductPhotoPill product={BASE_PRODUCT} />)
    expect(screen.getByText('Italian Linen Camp Shirt')).toBeInTheDocument()
    expect(screen.queryByText(/Sage/)).not.toBeInTheDocument()
  })

  it('renders the price without decimals when integer', () => {
    render(<ProductPhotoPill product={BASE_PRODUCT} />)
    expect(screen.getByText('$128')).toBeInTheDocument()
  })

  it('renders the price with two decimals when non-integer', () => {
    render(<ProductPhotoPill product={{ ...BASE_PRODUCT, price: 98.5 }} />)
    expect(screen.getByText('$98.50')).toBeInTheDocument()
  })

  it('fires onAddToCart on click', async () => {
    const onAddToCart = vi.fn()
    const user = userEvent.setup()
    render(<ProductPhotoPill product={BASE_PRODUCT} onAddToCart={onAddToCart} />)
    await user.click(screen.getByRole('button'))
    expect(onAddToCart).toHaveBeenCalledTimes(1)
  })

  it('hides the image when loading fails', () => {
    render(<ProductPhotoPill product={BASE_PRODUCT} />)
    const img = screen.getByRole('button').querySelector('img')
    expect(img).not.toBeNull()
    // Trigger the error handler to simulate a broken image.
    img!.dispatchEvent(new Event('error'))
    expect(img!.style.display).toBe('none')
  })

  it('omits the price when product.price is 0', () => {
    render(<ProductPhotoPill product={{ ...BASE_PRODUCT, price: 0 }} />)
    expect(screen.queryByText(/^\$/)).not.toBeInTheDocument()
  })
})
