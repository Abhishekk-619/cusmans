// Feature: sales-crm
import * as fc from 'fast-check'
import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest'
import { useCRMStore } from '../useCRMStore'
import {
  LEAD_STATUSES,
  LEAD_SOURCES,
  ACTIVITY_TYPES,
} from '../../types'

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

describe('CRM Store — Property-Based Tests', () => {
  // Property 1: Lead creation produces a complete, well-shaped record
  it('Property 1: Lead creation produces a complete, well-shaped record', () => {
    fc.assert(
      fc.property(
        fc.record({
          full_name: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          phone: fc.string(),
          email: fc.string(),
          company: fc.string(),
          lead_source: fc.constantFrom(...LEAD_SOURCES),
          assigned_to: fc.string(),
          status: fc.constantFrom(...LEAD_STATUSES),
          followup_date: fc.option(fc.string(), { nil: null }),
          notes: fc.string(),
        }),
        (data) => {
          useCRMStore.setState({ leads: [], activities: [] })
          useCRMStore.getState().addLead(data)
          const leads = useCRMStore.getState().leads
          expect(leads).toHaveLength(1)
          const lead = leads[0]
          expect(lead.id).toBeDefined()
          expect(lead.full_name).toBe(data.full_name)
          expect(lead.created_at).toBeDefined()
          expect(new Date(lead.created_at).toISOString()).toBe(lead.created_at)
          expect(LEAD_STATUSES).toContain(lead.status)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Property 2: Activity creation produces a complete, well-shaped record
  it('Property 2: Activity creation produces a complete, well-shaped record', () => {
    fc.assert(
      fc.property(
        fc.record({
          lead_id: fc.string({ minLength: 1 }),
          activity_type: fc.constantFrom(...ACTIVITY_TYPES),
          description: fc.string(),
        }),
        (data) => {
          useCRMStore.setState({ activities: [] })
          useCRMStore.getState().addActivity(data)
          const activities = useCRMStore.getState().activities
          expect(activities).toHaveLength(1)
          const activity = activities[0]
          expect(activity.id).toBeDefined()
          expect(activity.lead_id).toBe(data.lead_id)
          expect(activity.activity_type).toBe(data.activity_type)
          expect(activity.description).toBe(data.description)
          expect(new Date(activity.created_at).toISOString()).toBe(activity.created_at)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Property 3: Status and activity_type fields only accept valid enum values
  it('Property 3: Status and activity_type fields only accept valid enum values', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            full_name: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            phone: fc.string(),
            email: fc.string(),
            company: fc.string(),
            lead_source: fc.constantFrom(...LEAD_SOURCES),
            assigned_to: fc.string(),
            status: fc.constantFrom(...LEAD_STATUSES),
            followup_date: fc.option(fc.string(), { nil: null }),
            notes: fc.string(),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (leadsData) => {
          useCRMStore.setState({ leads: [], activities: [] })
          leadsData.forEach(d => useCRMStore.getState().addLead(d))
          const { leads, activities } = useCRMStore.getState()
          leads.forEach(l => expect(LEAD_STATUSES).toContain(l.status))
          activities.forEach(a => expect(ACTIVITY_TYPES).toContain(a.activity_type))
        }
      ),
      { numRuns: 100 }
    )
  })

  // Property 5: Adding a valid lead always produces a matching record in the store
  it('Property 5: Adding a valid lead always produces a matching record in the store', () => {
    fc.assert(
      fc.property(
        fc.record({
          full_name: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          phone: fc.string(),
          email: fc.string(),
          company: fc.string(),
          lead_source: fc.constantFrom(...LEAD_SOURCES),
          assigned_to: fc.string(),
          status: fc.constantFrom(...LEAD_STATUSES),
          followup_date: fc.option(fc.string(), { nil: null }),
          notes: fc.string(),
        }),
        (data) => {
          useCRMStore.setState({ leads: [] })
          useCRMStore.getState().addLead(data)
          const leads = useCRMStore.getState().leads
          expect(leads).toHaveLength(1)
          const lead = leads[0]
          expect(lead.full_name).toBe(data.full_name)
          expect(lead.phone).toBe(data.phone)
          expect(lead.email).toBe(data.email)
          expect(lead.company).toBe(data.company)
          expect(lead.lead_source).toBe(data.lead_source)
          expect(lead.assigned_to).toBe(data.assigned_to)
          expect(lead.status).toBe(data.status)
          expect(lead.followup_date).toBe(data.followup_date)
          expect(lead.notes).toBe(data.notes)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Property 9: Deleting a lead removes all associated activities
  it('Property 9: Deleting a lead removes all associated activities', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            activity_type: fc.constantFrom(...ACTIVITY_TYPES),
            description: fc.string(),
          }),
          { minLength: 0, maxLength: 10 }
        ),
        (activitiesData) => {
          useCRMStore.setState({ leads: [], activities: [] })
          useCRMStore.getState().addLead({
            full_name: 'Test Lead',
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
          activitiesData.forEach(a =>
            useCRMStore.getState().addActivity({ ...a, lead_id: leadId })
          )
          useCRMStore.getState().deleteLead(leadId)
          const remaining = useCRMStore.getState().activities.filter(a => a.lead_id === leadId)
          expect(remaining).toHaveLength(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Property 11: Status change always auto-records a Status Update activity
  it('Property 11: Status change always auto-records a Status Update activity', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...LEAD_STATUSES),
        fc.constantFrom(...LEAD_STATUSES),
        (oldStatus, newStatus) => {
          fc.pre(oldStatus !== newStatus)
          useCRMStore.setState({ leads: [], activities: [] })
          useCRMStore.getState().addLead({
            full_name: 'Test',
            phone: '',
            email: '',
            company: '',
            lead_source: 'Referral',
            assigned_to: '',
            status: oldStatus,
            followup_date: null,
            notes: '',
          })
          const leadId = useCRMStore.getState().leads[0].id
          const actsBefore = useCRMStore.getState().activities.length
          useCRMStore.getState().updateLead(leadId, { status: newStatus })
          const actsAfter = useCRMStore.getState().activities
          expect(actsAfter.length).toBe(actsBefore + 1)
          const newAct = actsAfter[actsAfter.length - 1]
          expect(newAct.activity_type).toBe('Status Update')
          expect(newAct.lead_id).toBe(leadId)
          expect(newAct.description).toContain(oldStatus)
          expect(newAct.description).toContain(newStatus)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Property 12: Follow-up date change always auto-records a Follow-up Update activity
  it('Property 12: Follow-up date change always auto-records a Follow-up Update activity', () => {
    fc.assert(
      fc.property(
        fc.option(fc.string(), { nil: null }),
        fc.option(fc.string(), { nil: null }),
        (oldDate, newDate) => {
          fc.pre(oldDate !== newDate)
          useCRMStore.setState({ leads: [], activities: [] })
          useCRMStore.getState().addLead({
            full_name: 'Test',
            phone: '',
            email: '',
            company: '',
            lead_source: 'Referral',
            assigned_to: '',
            status: 'New Lead',
            followup_date: oldDate,
            notes: '',
          })
          const leadId = useCRMStore.getState().leads[0].id
          const actsBefore = useCRMStore.getState().activities.length
          useCRMStore.getState().updateLead(leadId, { followup_date: newDate })
          const actsAfter = useCRMStore.getState().activities
          expect(actsAfter.length).toBe(actsBefore + 1)
          const newAct = actsAfter[actsAfter.length - 1]
          expect(newAct.activity_type).toBe('Follow-up Update')
          expect(newAct.lead_id).toBe(leadId)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Property 14: Updating a lead reflects the new values in the store
  it('Property 14: Updating a lead reflects the new values in the store', () => {
    fc.assert(
      fc.property(
        fc.record({
          phone: fc.string(),
          email: fc.string(),
          company: fc.string(),
          notes: fc.string(),
        }),
        (updates) => {
          useCRMStore.setState({ leads: [], activities: [] })
          useCRMStore.getState().addLead({
            full_name: 'Original',
            phone: 'old-phone',
            email: 'old@email.com',
            company: 'Old Co',
            lead_source: 'Referral',
            assigned_to: 'Alice',
            status: 'New Lead',
            followup_date: null,
            notes: 'old notes',
          })
          const leadId = useCRMStore.getState().leads[0].id
          useCRMStore.getState().updateLead(leadId, updates)
          const updated = useCRMStore.getState().leads.find(l => l.id === leadId)!
          expect(updated.phone).toBe(updates.phone)
          expect(updated.email).toBe(updates.email)
          expect(updated.company).toBe(updates.company)
          expect(updated.notes).toBe(updates.notes)
          // Non-updated fields remain unchanged
          expect(updated.full_name).toBe('Original')
          expect(updated.lead_source).toBe('Referral')
          expect(updated.assigned_to).toBe('Alice')
        }
      ),
      { numRuns: 100 }
    )
  })
})
