// Feature: sales-crm
import * as fc from 'fast-check'
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { LeadCard } from '../LeadCard'
import { LEAD_STATUSES, LEAD_SOURCES, type Lead } from '../../../types'
import { nanoid } from 'nanoid'

// Mock @dnd-kit/core
vi.mock('@dnd-kit/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dnd-kit/core')>()
  return {
    ...actual,
    useDraggable: () => ({
      attributes: {},
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
    }),
  }
})

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Translate: {
      toString: () => '',
    },
  },
}))

const makeLead = (overrides: Partial<Lead> = {}): Lead => ({
  id: nanoid(),
  full_name: 'Jane Smith',
  phone: '555-1234',
  email: 'jane@example.com',
  company: 'Acme Corp',
  lead_source: 'Referral',
  assigned_to: 'Alice Johnson',
  status: 'New Lead',
  followup_date: null,
  notes: '',
  created_at: new Date().toISOString(),
  ...overrides,
})

describe('LeadCard — Property-Based Tests', () => {
  // Property 16: Lead cards display all required fields
  it('Property 16: Lead cards display all required fields', () => {
    fc.assert(
      fc.property(
        fc.record({
          full_name: fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
          company: fc.string({ minLength: 1 }),
          assigned_to: fc.string({ minLength: 1 }),
          status: fc.constantFrom(...LEAD_STATUSES),
          followup_date: fc.option(
            fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') })
              .map((d) => d.toISOString().slice(0, 10)),
            { nil: null }
          ),
        }),
        (data) => {
          const lead = makeLead(data)
          const { container } = render(
            <LeadCard lead={lead} onClick={vi.fn()} />
          )

          const text = container.textContent ?? ''

          // full_name is visible
          expect(text).toContain(lead.full_name)

          // company is visible
          expect(text).toContain(lead.company)

          // assigned_to is visible
          expect(text).toContain(lead.assigned_to)

          // status is visible (via StatusBadge)
          expect(text).toContain(lead.status)

          // followup_date or placeholder is shown
          if (lead.followup_date) {
            // The formatted date should appear somewhere
            expect(text).not.toContain('No follow-up')
          } else {
            expect(text).toContain('No follow-up')
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
