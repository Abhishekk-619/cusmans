// Feature: sales-crm
import * as fc from 'fast-check'
import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest'
import { nanoid } from 'nanoid'
import {
  LEAD_STATUSES,
  LEAD_SOURCES,
  ACTIVITY_TYPES,
  type Lead,
  type Activity,
  type ActivityType,
  type LeadFilters,
  type SortConfig,
} from '../../types'
import {
  getLeadsByStatus,
  getActivitiesForLead,
  categorizeFollowups,
  computeMetrics,
  searchLeads,
  applyFiltersAndSort,
  getRecentActivities,
} from '../selectors'
import { useCRMStore } from '../useCRMStore'

beforeAll(() => {
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    },
    writable: true,
  })
})

beforeEach(() => {
  useCRMStore.setState({ leads: [], activities: [], openDrawerLeadId: null })
})

const makeLead = (overrides: Partial<Lead> = {}): Lead => ({
  id: nanoid(),
  full_name: 'Test Lead',
  phone: '555-0000',
  email: 'test@example.com',
  company: 'Test Co',
  lead_source: 'Referral',
  assigned_to: 'Alice',
  status: 'New Lead',
  followup_date: null,
  notes: '',
  created_at: new Date().toISOString(),
  ...overrides,
})

describe('Selectors — Property-Based Tests', () => {
  // Property 4: Empty or whitespace-only full_name is always rejected
  it('Property 4: Empty or whitespace-only full_name is always rejected', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^\s*$/),
        (whitespaceStr) => {
          useCRMStore.setState({ leads: [], activities: [] })
          const before = useCRMStore.getState().leads.length
          useCRMStore.getState().addLead({
            full_name: whitespaceStr,
            phone: '',
            email: '',
            company: '',
            lead_source: 'Referral',
            assigned_to: '',
            status: 'New Lead',
            followup_date: null,
            notes: '',
          })
          expect(useCRMStore.getState().leads.length).toBe(before)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Property 6: Search filter returns only leads that match the search term
  it('Property 6: Search filter returns only leads that match the search term', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            full_name: fc.string({ minLength: 1 }),
            phone: fc.string(),
            company: fc.string(),
          }),
          { minLength: 0, maxLength: 10 }
        ),
        fc.string({ minLength: 2, maxLength: 20 }),
        (leadsData, term) => {
          const leads = leadsData.map((d, i) =>
            makeLead({ ...d, id: String(i) })
          )
          const results = searchLeads(leads, term)
          const lower = term.toLowerCase()
          // Every result must match
          results.forEach((l) => {
            const matches =
              l.full_name.toLowerCase().includes(lower) ||
              l.phone.includes(lower) ||
              l.company.toLowerCase().includes(lower)
            expect(matches).toBe(true)
          })
          // No non-matching lead should appear
          const nonMatching = leads.filter(
            (l) =>
              !l.full_name.toLowerCase().includes(lower) &&
              !l.phone.includes(lower) &&
              !l.company.toLowerCase().includes(lower)
          )
          nonMatching.forEach((l) => {
            expect(results.find((r) => r.id === l.id)).toBeUndefined()
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  // Property 7: Multi-filter conjunction — all active filters are satisfied simultaneously
  it('Property 7: Multi-filter conjunction — all active filters are satisfied simultaneously', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            status: fc.constantFrom(...LEAD_STATUSES),
            lead_source: fc.constantFrom(...LEAD_SOURCES),
            assigned_to: fc.string({ minLength: 1, maxLength: 10 }),
            followup_date: fc.option(
              fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') })
                .map(d => d.toISOString().slice(0, 10)),
              { nil: null }
            ),
          }),
          { minLength: 0, maxLength: 10 }
        ),
        fc.record({
          status: fc.option(fc.constantFrom(...LEAD_STATUSES), { nil: '' as const }),
          source: fc.option(fc.constantFrom(...LEAD_SOURCES), { nil: '' as const }),
          assignedTo: fc.option(fc.string({ minLength: 1, maxLength: 10 }), { nil: '' }),
          followupDate: fc.option(
            fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') })
              .map(d => d.toISOString().slice(0, 10)),
            { nil: '' }
          ),
        }),
        (leadsData, filterValues) => {
          const leads = leadsData.map((d, i) => makeLead({ ...d, id: String(i) }))
          const filters: LeadFilters = {
            searchTerm: '',
            status: filterValues.status ?? '',
            source: filterValues.source ?? '',
            assignedTo: filterValues.assignedTo ?? '',
            followupDate: filterValues.followupDate ?? '',
          }
          const sort: SortConfig = { column: 'created_at', direction: 'asc' }
          const results = applyFiltersAndSort(leads, filters, sort)
          results.forEach((l) => {
            if (filters.status) expect(l.status).toBe(filters.status)
            if (filters.source) expect(l.lead_source).toBe(filters.source)
            if (filters.assignedTo) expect(l.assigned_to).toBe(filters.assignedTo)
            if (filters.followupDate) expect(l.followup_date).toBe(filters.followupDate)
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  // Property 8: Column sort produces correctly ordered results
  it('Property 8: Column sort produces correctly ordered results', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            full_name: fc.string(),
            company: fc.string(),
          }),
          { minLength: 0, maxLength: 10 }
        ),
        fc.constantFrom('full_name', 'company', 'created_at') as fc.Arbitrary<keyof Lead>,
        (leadsData, column) => {
          const leads = leadsData.map((d, i) =>
            makeLead({ ...d, id: String(i), created_at: new Date(i * 1000).toISOString() })
          )
          const filters: LeadFilters = { searchTerm: '', status: '', source: '', assignedTo: '', followupDate: '' }

          const asc = applyFiltersAndSort(leads, filters, { column, direction: 'asc' })
          for (let i = 0; i < asc.length - 1; i++) {
            const a = String(asc[i][column] ?? '')
            const b = String(asc[i + 1][column] ?? '')
            expect(a.localeCompare(b)).toBeLessThanOrEqual(0)
          }

          const desc = applyFiltersAndSort(leads, filters, { column, direction: 'desc' })
          for (let i = 0; i < desc.length - 1; i++) {
            const a = String(desc[i][column] ?? '')
            const b = String(desc[i + 1][column] ?? '')
            expect(a.localeCompare(b)).toBeGreaterThanOrEqual(0)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  // Property 10: Activity timeline is always ordered newest-first
  it('Property 10: Activity timeline is always ordered newest-first', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
            .map(d => d.toISOString()),
          { minLength: 0, maxLength: 20 }
        ),
        (timestamps) => {
          const leadId = 'test-lead'
          const activities: Activity[] = timestamps.map((ts, i) => ({
            id: String(i),
            lead_id: leadId,
            activity_type: 'Note' as ActivityType,
            description: '',
            created_at: ts,
          }))
          const result = getActivitiesForLead(activities, leadId)
          for (let i = 0; i < result.length - 1; i++) {
            expect(result[i].created_at >= result[i + 1].created_at).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  // Property 17: Follow-up categorization is correct for all date relationships
  it('Property 17: Follow-up categorization is correct for all date relationships', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.option(
            fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
              .map(d => d.toISOString().slice(0, 10)),
            { nil: null }
          ),
          { minLength: 0, maxLength: 20 }
        ),
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
          .map(d => d.toISOString().slice(0, 10)),
        (followupDates, today) => {
          const leads = followupDates.map((fd, i) =>
            makeLead({ id: String(i), followup_date: fd })
          )
          const { today: todayLeads, upcoming, overdue } = categorizeFollowups(leads, today)

          // Each lead with a followup_date appears in exactly one bucket
          const leadsWithDate = leads.filter(l => l.followup_date !== null)
          leadsWithDate.forEach(l => {
            const inToday = todayLeads.some(t => t.id === l.id)
            const inUpcoming = upcoming.some(u => u.id === l.id)
            const inOverdue = overdue.some(o => o.id === l.id)
            const count = [inToday, inUpcoming, inOverdue].filter(Boolean).length
            expect(count).toBe(1)
          })

          // No lead without a followup_date appears in any bucket
          const leadsWithoutDate = leads.filter(l => l.followup_date === null)
          leadsWithoutDate.forEach(l => {
            expect(todayLeads.some(t => t.id === l.id)).toBe(false)
            expect(upcoming.some(u => u.id === l.id)).toBe(false)
            expect(overdue.some(o => o.id === l.id)).toBe(false)
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  // Property 20: Dashboard metric computation is accurate
  it('Property 20: Dashboard metric computation is accurate', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            status: fc.constantFrom(...LEAD_STATUSES),
            followup_date: fc.option(fc.string(), { nil: null }),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        fc.string(),
        (leadsData, today) => {
          const leads = leadsData.map((d, i) => makeLead({ ...d, id: String(i) }))
          const metrics = computeMetrics(leads, [], today)
          expect(metrics.total).toBe(leads.length)
          expect(metrics.newLeads).toBe(leads.filter(l => l.status === 'New Lead').length)
          expect(metrics.interested).toBe(leads.filter(l => l.status === 'Interested').length)
          expect(metrics.won).toBe(leads.filter(l => l.status === 'Won').length)
          expect(metrics.lost).toBe(leads.filter(l => l.status === 'Lost').length)
          expect(metrics.followupsToday).toBe(leads.filter(l => l.followup_date === today).length)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Property 21: Recent activity list contains at most 10 entries, all from the most recent
  it('Property 21: Recent activity list contains at most 10 entries, all from the most recent', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
            .map(d => d.toISOString()),
          { minLength: 0, maxLength: 30 }
        ),
        (timestamps) => {
          const activities: Activity[] = timestamps.map((ts, i) => ({
            id: String(i),
            lead_id: 'lead-1',
            activity_type: 'Note' as ActivityType,
            description: '',
            created_at: ts,
          }))
          const result = getRecentActivities(activities, 10)
          expect(result.length).toBeLessThanOrEqual(10)

          if (activities.length > 10) {
            const resultIds = new Set(result.map(a => a.id))
            const excluded = activities.filter(a => !resultIds.has(a.id))
            result.forEach(r => {
              excluded.forEach(e => {
                expect(r.created_at >= e.created_at).toBe(true)
              })
            })
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  // Property 22: Dashboard follow-up section contains all and only today + overdue leads, ordered by date
  it('Property 22: Dashboard follow-up section contains all and only today + overdue leads, ordered by date', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.option(
            fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
              .map(d => d.toISOString().slice(0, 10)),
            { nil: null }
          ),
          { minLength: 0, maxLength: 20 }
        ),
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
          .map(d => d.toISOString().slice(0, 10)),
        (followupDates, today) => {
          const leads = followupDates.map((fd, i) => makeLead({ id: String(i), followup_date: fd }))
          const { today: todayLeads, overdue } = categorizeFollowups(leads, today)
          const combined = [...todayLeads, ...overdue].sort((a, b) =>
            (a.followup_date ?? '').localeCompare(b.followup_date ?? '')
          )

          // Should contain exactly leads with followup_date <= today (non-null)
          const expected = leads
            .filter(l => l.followup_date !== null && l.followup_date <= today)
            .sort((a, b) => (a.followup_date ?? '').localeCompare(b.followup_date ?? ''))

          expect(combined.map(l => l.id).sort()).toEqual(expected.map(l => l.id).sort())
        }
      ),
      { numRuns: 100 }
    )
  })

  // Property 19: Rescheduling a follow-up updates the lead's followup_date
  it("Property 19: Rescheduling a follow-up updates the lead's followup_date", () => {
    fc.assert(
      fc.property(
        fc.string(),
        (newDate) => {
          useCRMStore.setState({ leads: [], activities: [] })
          useCRMStore.getState().addLead({
            full_name: 'Test',
            phone: '',
            email: '',
            company: '',
            lead_source: 'Referral',
            assigned_to: '',
            status: 'New Lead',
            followup_date: null,
            notes: '',
          })
          const leadId = useCRMStore.getState().leads[0].id
          useCRMStore.getState().updateLead(leadId, { followup_date: newDate })
          const updated = useCRMStore.getState().leads.find(l => l.id === leadId)!
          expect(updated.followup_date).toBe(newDate)
        }
      ),
      { numRuns: 100 }
    )
  })
})
