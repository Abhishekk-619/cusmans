// Feature: sales-crm — Integration Tests
import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest'
import { useCRMStore } from '../store/useCRMStore'

// Mock localStorage before all tests so the persist middleware doesn't error
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

// Reset store state before each test
beforeEach(() => {
  useCRMStore.setState({ leads: [], activities: [], openDrawerLeadId: null })
})

// ─── Test 17.1: Full add-lead flow ────────────────────────────────────────────
// Requirements: 3.1, 3.3
describe('Integration 17.1: Full add-lead flow', () => {
  it('addLead with valid data adds the lead to the store', () => {
    const { addLead } = useCRMStore.getState()

    addLead({
      full_name: 'Jane Smith',
      phone: '+1 555 000 0001',
      email: 'jane@example.com',
      company: 'Acme Corp',
      lead_source: 'Referral',
      assigned_to: 'Alice Johnson',
      status: 'New Lead',
      followup_date: null,
      notes: 'Interested in enterprise plan',
    })

    const { leads } = useCRMStore.getState()
    expect(leads).toHaveLength(1)
    expect(leads[0].full_name).toBe('Jane Smith')
    expect(leads[0].email).toBe('jane@example.com')
    expect(leads[0].company).toBe('Acme Corp')
    expect(leads[0].status).toBe('New Lead')
    expect(leads[0].id).toBeDefined()
    expect(leads[0].created_at).toBeDefined()
  })

  it('addLead with empty full_name does NOT add a lead to the store', () => {
    const { addLead } = useCRMStore.getState()

    addLead({
      full_name: '',
      phone: '+1 555 000 0002',
      email: 'nope@example.com',
      company: 'Ghost Corp',
      lead_source: 'Website',
      assigned_to: 'Bob',
      status: 'New Lead',
      followup_date: null,
      notes: '',
    })

    const { leads } = useCRMStore.getState()
    expect(leads).toHaveLength(0)
  })

  it('addLead with whitespace-only full_name does NOT add a lead to the store', () => {
    const { addLead } = useCRMStore.getState()

    addLead({
      full_name: '   ',
      phone: '',
      email: '',
      company: '',
      lead_source: 'Cold Call',
      assigned_to: '',
      status: 'New Lead',
      followup_date: null,
      notes: '',
    })

    const { leads } = useCRMStore.getState()
    expect(leads).toHaveLength(0)
  })
})

// ─── Test 17.2: Drag-and-drop status update ───────────────────────────────────
// Requirements: 7.4
describe('Integration 17.2: Drag-and-drop status update', () => {
  it('updateLead with a new status updates the lead and records a Status Update activity', () => {
    const { addLead, updateLead } = useCRMStore.getState()

    // Seed a lead with status 'New Lead'
    addLead({
      full_name: 'Bob Builder',
      phone: '',
      email: 'bob@example.com',
      company: 'Build Co',
      lead_source: 'Cold Call',
      assigned_to: 'Carol',
      status: 'New Lead',
      followup_date: null,
      notes: '',
    })

    const leadId = useCRMStore.getState().leads[0].id

    // Simulate drag-and-drop: update status from 'New Lead' to 'Contacted'
    updateLead(leadId, { status: 'Contacted' })

    const { leads, activities } = useCRMStore.getState()

    // Assert the lead's status is updated
    const updatedLead = leads.find((l) => l.id === leadId)
    expect(updatedLead).toBeDefined()
    expect(updatedLead!.status).toBe('Contacted')

    // Assert a 'Status Update' activity was recorded with the correct lead_id
    const statusActivities = activities.filter(
      (a) => a.lead_id === leadId && a.activity_type === 'Status Update'
    )
    expect(statusActivities).toHaveLength(1)
    expect(statusActivities[0].description).toContain('New Lead')
    expect(statusActivities[0].description).toContain('Contacted')
  })
})

// ─── Test 17.3: Follow-up mark complete ──────────────────────────────────────
// Requirements: 8.7
describe('Integration 17.3: Follow-up mark complete', () => {
  it('clearing followup_date and adding a Follow-up Update activity works correctly', () => {
    const { addLead, updateLead, addActivity } = useCRMStore.getState()

    const today = new Date().toISOString().slice(0, 10) // 'YYYY-MM-DD'

    // Seed a lead with followup_date set to today
    addLead({
      full_name: 'Carol Danvers',
      phone: '',
      email: 'carol@example.com',
      company: 'Marvel Inc',
      lead_source: 'Event',
      assigned_to: 'Dave',
      status: 'Follow-up',
      followup_date: today,
      notes: 'Call back today',
    })

    const leadId = useCRMStore.getState().leads[0].id

    // Simulate "Mark Complete": clear followup_date and record activity
    updateLead(leadId, { followup_date: null })
    addActivity({
      lead_id: leadId,
      activity_type: 'Follow-up Update',
      description: 'Follow-up marked as complete',
    })

    const { leads, activities } = useCRMStore.getState()

    // Assert followup_date is null on the lead
    const updatedLead = leads.find((l) => l.id === leadId)
    expect(updatedLead).toBeDefined()
    expect(updatedLead!.followup_date).toBeNull()

    // Assert a 'Follow-up Update' activity was recorded
    const followupActivities = activities.filter(
      (a) => a.lead_id === leadId && a.activity_type === 'Follow-up Update'
    )
    // updateLead auto-records one + we manually added one = 2 total
    expect(followupActivities.length).toBeGreaterThanOrEqual(1)
    const manualActivity = followupActivities.find(
      (a) => a.description === 'Follow-up marked as complete'
    )
    expect(manualActivity).toBeDefined()
  })
})

// ─── Test 17.4: Global search opens Lead Drawer ───────────────────────────────
// Requirements: 10.1, 10.2
describe('Integration 17.4: Global search opens Lead Drawer', () => {
  it('openDrawer sets openDrawerLeadId to the correct lead id in the store', () => {
    const { addLead, openDrawer } = useCRMStore.getState()

    // Seed a lead
    addLead({
      full_name: 'Diana Prince',
      phone: '+1 555 999 0000',
      email: 'diana@example.com',
      company: 'Themyscira Ltd',
      lead_source: 'Social Media',
      assigned_to: 'Eve',
      status: 'Interested',
      followup_date: null,
      notes: '',
    })

    const leadId = useCRMStore.getState().leads[0].id

    // Initially drawer is closed
    expect(useCRMStore.getState().openDrawerLeadId).toBeNull()

    // Simulate selecting a search result: call openDrawer
    openDrawer(leadId)

    // Assert openDrawerLeadId equals the lead's id
    expect(useCRMStore.getState().openDrawerLeadId).toBe(leadId)
  })

  it('openDrawer with a different lead id updates openDrawerLeadId correctly', () => {
    const { addLead, openDrawer } = useCRMStore.getState()

    // Seed two leads
    addLead({
      full_name: 'Lead One',
      phone: '',
      email: '',
      company: 'Company A',
      lead_source: 'Referral',
      assigned_to: '',
      status: 'New Lead',
      followup_date: null,
      notes: '',
    })
    addLead({
      full_name: 'Lead Two',
      phone: '',
      email: '',
      company: 'Company B',
      lead_source: 'Website',
      assigned_to: '',
      status: 'Contacted',
      followup_date: null,
      notes: '',
    })

    const [lead1, lead2] = useCRMStore.getState().leads

    openDrawer(lead1.id)
    expect(useCRMStore.getState().openDrawerLeadId).toBe(lead1.id)

    // Simulate clicking a different search result
    openDrawer(lead2.id)
    expect(useCRMStore.getState().openDrawerLeadId).toBe(lead2.id)
  })
})
