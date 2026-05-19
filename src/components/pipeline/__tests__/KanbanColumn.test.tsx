// Feature: sales-crm
import * as fc from 'fast-check'
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { KanbanColumn } from '../KanbanColumn'
import { LEAD_STATUSES, LEAD_SOURCES, type Lead, type LeadStatus } from '../../../types'
import { nanoid } from 'nanoid'

// Mock @dnd-kit/core to avoid needing a full DndContext in tests
vi.mock('@dnd-kit/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dnd-kit/core')>()
  return {
    ...actual,
    useDroppable: () => ({ setNodeRef: vi.fn(), isOver: false }),
    useDraggable: () => ({
      attributes: {},
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
    }),
  }
})

const makeLead = (status: LeadStatus, overrides: Partial<Lead> = {}): Lead => ({
  id: nanoid(),
  full_name: 'Test Lead',
  phone: '',
  email: '',
  company: 'Test Co',
  lead_source: 'Referral',
  assigned_to: 'Alice',
  status,
  followup_date: null,
  notes: '',
  created_at: new Date().toISOString(),
  ...overrides,
})

describe('KanbanColumn — Property-Based Tests', () => {
  // Property 15: Kanban column count badges match actual lead counts
  it('Property 15: Kanban column count badges match actual lead counts', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...LEAD_STATUSES),
        fc.integer({ min: 0, max: 10 }),
        (status, count) => {
          const leads = Array.from({ length: count }, () => makeLead(status))
          const { container } = render(
            <KanbanColumn
              status={status}
              leads={leads}
              onCardClick={vi.fn()}
            />
          )

          // Find the badge — it's a span with the count
          const spans = container.querySelectorAll('span')
          const badgeSpan = Array.from(spans).find(
            (s) => s.textContent === String(count)
          )
          expect(badgeSpan).not.toBeUndefined()
          expect(badgeSpan?.textContent).toBe(String(count))
        }
      ),
      { numRuns: 100 }
    )
  })
})
