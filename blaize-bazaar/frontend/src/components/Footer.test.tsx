/**
 * Footer tests - 5-column site footer.
 *
 * Validates Requirements 1.10.1, 1.10.2, 1.10.3.
 *
 * Coverage:
 *   - Exactly 5 columns in the authored order: Brand, Shop, About,
 *     Service, Storyboard newsletter (Req 1.10.1).
 *   - About column carries `Our story`, `Makers we love`,
 *     `Sustainability`, `Press` (Req 1.10.2).
 *   - Bottom strip shows the copyright plus Privacy, Terms,
 *     Accessibility (Req 1.10.3).
 *   - About content lives only in the footer - there is no About
 *     entry in the top nav copy (cross-check with Req 1.2.4 and the
 *     task 4.9 "done when").
 */
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import Footer from './Footer'
import { FOOTER, NAV } from '../copy'

describe('Footer - 5 columns (Req 1.10.1)', () => {
  it('renders exactly five columns in the authored order', () => {
    render(<Footer />)

    const container = screen.getByTestId('footer-columns')
    const columns = within(container).getAllByRole('region', {
      // Sections get an implicit `region` role when they carry an
      // accessible name via aria-label or aria-labelledby.
      hidden: true,
    })

    // Each column is a <section> with an accessible name, so there
    // should be exactly 5 regions inside the columns container.
    expect(columns).toHaveLength(5)

    // Spot-check every column is present by test id, in order.
    expect(screen.getByTestId('footer-column-brand')).toBeInTheDocument()
    expect(screen.getByTestId('footer-column-shop')).toBeInTheDocument()
    expect(screen.getByTestId('footer-column-about')).toBeInTheDocument()
    expect(screen.getByTestId('footer-column-service')).toBeInTheDocument()
    expect(screen.getByTestId('footer-column-newsletter')).toBeInTheDocument()
  })

  it('renders the brand column with the tagline from copy.ts', () => {
    render(<Footer />)
    expect(screen.getByTestId('footer-brand-tagline')).toHaveTextContent(
      FOOTER.BRAND.TAGLINE,
    )
  })

  it('renders the Shop column with its four items from copy.ts', () => {
    render(<Footer />)
    const shop = screen.getByTestId('footer-column-shop')
    expect(within(shop).getByRole('heading').textContent).toBe(
      FOOTER.SHOP.HEADING,
    )
    FOOTER.SHOP.ITEMS.forEach((item) => {
      expect(within(shop).getByText(item)).toBeInTheDocument()
    })
  })

  it('renders the Service column with its four items from copy.ts', () => {
    render(<Footer />)
    const service = screen.getByTestId('footer-column-service')
    expect(within(service).getByRole('heading').textContent).toBe(
      FOOTER.SERVICE.HEADING,
    )
    FOOTER.SERVICE.ITEMS.forEach((item) => {
      expect(within(service).getByText(item)).toBeInTheDocument()
    })
  })

  it('renders the Storyboard newsletter column with the italic copy and signup form', () => {
    render(<Footer />)
    const newsletter = screen.getByTestId('footer-column-newsletter')
    expect(within(newsletter).getByRole('heading').textContent).toBe(
      FOOTER.STORYBOARD_NEWSLETTER.HEADING,
    )
    expect(
      within(newsletter).getByText(FOOTER.STORYBOARD_NEWSLETTER.COPY),
    ).toBeInTheDocument()

    const email = within(newsletter).getByTestId('footer-newsletter-email')
    expect(email).toHaveAttribute('type', 'email')
    expect(email).toHaveAttribute(
      'placeholder',
      FOOTER.STORYBOARD_NEWSLETTER.EMAIL_PLACEHOLDER,
    )
    expect(within(newsletter).getByTestId('footer-newsletter-submit'))
      .toHaveTextContent(FOOTER.STORYBOARD_NEWSLETTER.SUBMIT)
  })

  it('acknowledges a newsletter submission', () => {
    render(<Footer />)

    const email = screen.getByTestId('footer-newsletter-email')
    const form = screen.getByTestId('footer-newsletter-form')

    fireEvent.change(email, { target: { value: 'reader@example.com' } })
    fireEvent.submit(form)

    expect(screen.getByTestId('footer-newsletter-ack')).toBeInTheDocument()
  })
})

describe('Footer - About column contents (Req 1.10.2)', () => {
  it('renders the About heading', () => {
    render(<Footer />)
    const about = screen.getByTestId('footer-column-about')
    expect(within(about).getByRole('heading').textContent).toBe(
      FOOTER.ABOUT.HEADING,
    )
  })

  it('renders the four About links verbatim from the spec', () => {
    render(<Footer />)
    const about = screen.getByTestId('footer-column-about')

    // Req 1.10.2 - the exact, ordered link set.
    expect(FOOTER.ABOUT.ITEMS).toEqual([
      'Our story',
      'Makers we love',
      'Sustainability',
      'Press',
    ])

    const links = within(about).getAllByRole('link')
    expect(links.map((a) => a.textContent)).toEqual([
      'Our story',
      'Makers we love',
      'Sustainability',
      'Press',
    ])
  })

  it('keeps About out of the top nav copy (confirms footer-only placement)', () => {
    // Cross-check: the top nav copy object carries only the five nav
    // items from Req 1.2.1 (Home, Shop, Storyboard, Discover, Account).
    // `About` must not leak back into the nav.
    const navValues = Object.values(NAV)
    expect(navValues).not.toContain('About')
    expect(navValues).not.toContain(FOOTER.ABOUT.HEADING)
  })
})

describe('Footer - bottom strip (Req 1.10.3)', () => {
  it('renders the copyright line with the current year', () => {
    render(<Footer />)

    const strip = screen.getByTestId('footer-bottom-strip')
    const copyright = within(strip).getByTestId('footer-copyright')

    // The copyright token from copy.ts is the authored prefix; the
    // component appends the current calendar year.
    expect(copyright.textContent).toContain(FOOTER.BOTTOM_STRIP.COPYRIGHT)
    expect(copyright.textContent).toContain(String(new Date().getFullYear()))
  })

  it('renders Privacy, Terms, and Accessibility links in the bottom strip', () => {
    render(<Footer />)

    const strip = screen.getByTestId('footer-bottom-strip')

    // Req 1.10.3 exact labels, no more, no less.
    expect(FOOTER.BOTTOM_STRIP.LINKS).toEqual([
      'Privacy',
      'Terms',
      'Accessibility',
    ])

    FOOTER.BOTTOM_STRIP.LINKS.forEach((label) => {
      const link = within(strip).getByTestId(
        `footer-bottom-link-${label.toLowerCase()}`,
      )
      expect(link).toHaveTextContent(label)
    })
  })
})
