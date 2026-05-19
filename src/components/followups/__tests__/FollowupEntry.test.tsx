// Feature: sales-crm
import * as fc from 'fast-check'
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { FollowupEntry } from '../FollowupEntry'
import { LEAD_STATUSES, LEAD_SOURCES, type Lead } from '../../../types'
import { nanoid } from 'nanoid'

const makeLead = (overrides: Partial<Lead> = {}): Lead => ({
  id: nanoid(),
  full_name: 'Jane Smith',
  phone: '555-1234',
  email: 'jane@example.com',
  company: 'Acme Corp',
  lead_source: 'Referral',
  assigned_to: 'Alice Johnson',
  status: 'New Lead',
  followup_date: '2025-06-15',
  notes: 'Important client',
  created_at: new Date().toISOString(),
  ...overrides,
})

describe('FollowupEntry — Property-Based Tests', () => {
  // Property 18: Follow-up entries display all required fields
  it('Property 18: Follow-up entries display all required fields', () => {
    fc.assert(
      fc.property(
        fc.record({
          full_name: fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
          assigned_to: fc.string({ minLength: 1 }),
          status: fc.constantFrom(...LEAD_STATUSES),
          notes: fc.string({ minLength: 1 }),
          followup_date: fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') })
            .map((d) => d.toISOString().slice(0, 10)),
        }),
        (data) => {
          const lead = makeLead(data)
          const { container } = render(
            <FollowupEntry
              lead={lead}
              onMarkComplete={vi.fn()}
              onReschedule={vi.fn()}
              onLeadClick={vi.fn()}
            />
          )

          const text = container.textContent ?? ''

          // full_name is visible
          expect(text).toContain(lead.full_name)

          // assigned_to is visible
          expect(text).toContain(lead.assigned_to)

          // status is visible (via StatusBadge)
          expect(text).toContain(lead.status)

          // notes is visible (truncated but present)
          expect(text).toContain(lead.notes)

          // followup_date is visible (formatted)
          // The date is formatted as "MMM d, yyyy" so we check the year at minimum
          const year = lead.followup_date.slice(0, 4)
          expect(text).toContain(year)
        }
      ),
      { numRuns: 100 }
    )
  })
})
