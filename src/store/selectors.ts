import { format } from 'date-fns'
import type { Lead, Activity, LeadStatus, LeadFilters, SortConfig } from '../types'

export const getLeadsByStatus = (leads: Lead[], status: LeadStatus): Lead[] =>
  leads.filter((l) => l.status === status)

export const getActivitiesForLead = (activities: Activity[], leadId: string): Activity[] =>
  activities
    .filter((a) => a.lead_id === leadId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))

export const categorizeFollowups = (
  leads: Lead[],
  today: string
): { today: Lead[]; upcoming: Lead[]; overdue: Lead[] } => ({
  today: leads.filter((l) => l.followup_date === today),
  upcoming: leads.filter((l) => l.followup_date != null && l.followup_date > today),
  overdue: leads.filter((l) => l.followup_date != null && l.followup_date < today),
})

export const computeMetrics = (
  leads: Lead[],
  _activities: Activity[],
  today: string
) => ({
  total: leads.length,
  newLeads: leads.filter((l) => l.status === 'New Lead').length,
  interested: leads.filter((l) => l.status === 'Interested').length,
  won: leads.filter((l) => l.status === 'Won').length,
  lost: leads.filter((l) => l.status === 'Lost').length,
  followupsToday: leads.filter((l) => l.followup_date === today).length,
})

export const searchLeads = (leads: Lead[], term: string): Lead[] => {
  if (term.length < 2) return []
  const lower = term.toLowerCase()
  return leads.filter(
    (l) =>
      l.full_name.toLowerCase().includes(lower) ||
      l.phone.includes(lower) ||
      l.company.toLowerCase().includes(lower)
  )
}

export const applyFiltersAndSort = (
  leads: Lead[],
  filters: LeadFilters,
  sort: SortConfig
): Lead[] => {
  let result = leads.filter((l) => {
    const term = filters.searchTerm.toLowerCase()
    const matchesSearch =
      !term ||
      l.full_name.toLowerCase().includes(term) ||
      l.phone.includes(term) ||
      l.company.toLowerCase().includes(term)

    const matchesStatus = !filters.status || l.status === filters.status
    const matchesSource = !filters.source || l.lead_source === filters.source
    const matchesAssigned = !filters.assignedTo || l.assigned_to === filters.assignedTo
    const matchesFollowup = !filters.followupDate || l.followup_date === filters.followupDate

    return matchesSearch && matchesStatus && matchesSource && matchesAssigned && matchesFollowup
  })

  result = [...result].sort((a, b) => {
    const aVal = a[sort.column] ?? ''
    const bVal = b[sort.column] ?? ''
    const cmp = String(aVal).localeCompare(String(bVal))
    // Secondary sort by created_at descending for ties
    if (cmp !== 0) return sort.direction === 'asc' ? cmp : -cmp
    return b.created_at.localeCompare(a.created_at)
  })

  return result
}

export const getRecentActivities = (activities: Activity[], limit: number): Activity[] =>
  [...activities]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit)

export const getTodayString = (): string => format(new Date(), 'yyyy-MM-dd')
