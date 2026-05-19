import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from 'nanoid'
import type { CRMStore, Lead, Activity } from '../types'

export const useCRMStore = create<CRMStore>()(
  persist(
    (set, get) => ({
      leads: [],
      activities: [],
      openDrawerLeadId: null,

      addLead: (data) => {
        // Reject empty/whitespace full_name
        if (!data.full_name || !data.full_name.trim()) return
        const newLead: Lead = {
          ...data,
          id: nanoid(),
          status: data.status ?? 'New Lead',
          created_at: new Date().toISOString(),
        }
        set((s) => ({ leads: [...s.leads, newLead] }))
      },

      updateLead: (id, updates) => {
        const prev = get().leads.find((l) => l.id === id)
        if (!prev) return

        if (updates.status && updates.status !== prev.status) {
          get().addActivity({
            lead_id: id,
            activity_type: 'Status Update',
            description: `Status changed from "${prev.status}" to "${updates.status}"`,
          })
        }

        if ('followup_date' in updates && updates.followup_date !== prev.followup_date) {
          get().addActivity({
            lead_id: id,
            activity_type: 'Follow-up Update',
            description: updates.followup_date
              ? `Follow-up scheduled for ${updates.followup_date}`
              : 'Follow-up date cleared',
          })
        }

        set((s) => ({
          leads: s.leads.map((l) => (l.id === id ? { ...l, ...updates } : l)),
        }))
      },

      deleteLead: (id) => {
        set((s) => ({
          leads: s.leads.filter((l) => l.id !== id),
          activities: s.activities.filter((a) => a.lead_id !== id),
          openDrawerLeadId: s.openDrawerLeadId === id ? null : s.openDrawerLeadId,
        }))
      },

      addActivity: (data) => {
        const newActivity: Activity = {
          ...data,
          id: nanoid(),
          created_at: new Date().toISOString(),
        }
        set((s) => ({ activities: [...s.activities, newActivity] }))
      },

      openDrawer: (leadId) => set({ openDrawerLeadId: leadId }),
      closeDrawer: () => set({ openDrawerLeadId: null }),
    }),
    { name: 'sales-crm-store' }
  )
)
