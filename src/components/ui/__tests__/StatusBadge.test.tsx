// Feature: sales-crm
import * as fc from 'fast-check'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from '../StatusBadge'
import { LEAD_STATUSES, STATUS_COLORS } from '../../../types'

describe('StatusBadge — Property-Based Tests', () => {
  // Property 23: StatusBadge renders the correct color for every valid status
  it('Property 23: StatusBadge renders the correct color for every valid status', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...LEAD_STATUSES),
        (status) => {
          const { container } = render(<StatusBadge status={status} />)
          const span = container.querySelector('span')
          expect(span).not.toBeNull()

          const { bg, text } = STATUS_COLORS[status]
          // Check that the bg and text classes are present
          expect(span!.className).toContain(bg)
          expect(span!.className).toContain(text)

          // The status text is rendered
          expect(span!.textContent).toBe(status)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('renders sm size by default', () => {
    render(<StatusBadge status="New Lead" />)
    const span = document.querySelector('span')
    expect(span?.className).toContain('px-2')
    expect(span?.className).toContain('py-0.5')
  })

  it('renders md size when specified', () => {
    render(<StatusBadge status="Won" size="md" />)
    const span = document.querySelector('span')
    expect(span?.className).toContain('px-2.5')
    expect(span?.className).toContain('py-1')
  })

  it('renders all 7 statuses without error', () => {
    LEAD_STATUSES.forEach((status) => {
      const { unmount } = render(<StatusBadge status={status} />)
      expect(screen.getByText(status)).toBeTruthy()
      unmount()
    })
  })
})
