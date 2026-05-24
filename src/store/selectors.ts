import { format, startOfDay, endOfDay } from 'date-fns'
import type { Lead, Activity, LeadStatus, LeadFilters, SortConfig } from '../types'

export const getLeadsByStatus = (leads: Lead[], status: LeadStatus): Lead[] =>
  leads.filter((l) => l.status === status)

export const getActivitiesForLead = (activities: Activity[], leadId: string): Activity[] =>
  activities
    .filter((a) => a.lead_id === leadId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))

/**
 * Resolve the lead's effective follow-up timestamp.
 * - If followup_date already contains a time, use it directly
 * - If followup_date is date-only and followup_time exists, combine them
 * - If followup_date is date-only and no time exists, treat it as start of day
 */
export function getLeadFollowupTimestamp(lead: Lead): number | null {
  const dateStr = lead.followup_date
  if (!dateStr) return null

  if (dateStr.length > 10) {
    const t = new Date(dateStr).getTime()
    return Number.isNaN(t) ? null : t
  }

  const combined = lead.followup_time ? `${dateStr}T${lead.followup_time}` : `${dateStr}T00:00:00`
  const t = new Date(combined).getTime()
  return Number.isNaN(t) ? null : t
}

export function isLeadFollowupOverdue(lead: Lead, now = Date.now()): boolean {
  if (!lead.followup_date) return false

  const timestamp = getLeadFollowupTimestamp(lead)
  if (timestamp == null) return false

  if (lead.followup_date.length === 10 && !lead.followup_time) {
    return timestamp < startOfDay(new Date(now)).getTime()
  }

  return timestamp < now
}

/**
 * Categorize leads by follow-up urgency:
 * - overdue: followup datetime has passed (before now)
 * - today: followup is today and time has NOT yet passed
 * - upcoming: followup is after today
 *
 * For date-only entries (no time set), the entire day is considered "today"
 * until midnight — it only becomes overdue the next day.
 */
export const categorizeFollowups = (
  leads: Lead[],
  _today: string
): { today: Lead[]; upcoming: Lead[]; overdue: Lead[] } => {
  const now = Date.now()
  const todayStart = startOfDay(new Date()).getTime()
  const todayEnd = endOfDay(new Date()).getTime()

  const leadsWithDate = leads.filter((l) => l.followup_date != null && l.followup_date !== '')

  return {
    overdue: leadsWithDate.filter((l) => {
      const t = getLeadFollowupTimestamp(l)
      if (t == null) return false
      if (l.followup_date!.length === 10 && !l.followup_time) {
        return t < todayStart
      }
      return t < now
    }),
    today: leadsWithDate.filter((l) => {
      const t = getLeadFollowupTimestamp(l)
      if (t == null) return false
      if (l.followup_date!.length === 10 && !l.followup_time) {
        return t >= todayStart && t <= todayEnd
      }
      return t >= now && t >= todayStart && t <= todayEnd
    }),
    upcoming: leadsWithDate.filter((l) => {
      const t = getLeadFollowupTimestamp(l)
      if (t == null) return false
      return t > todayEnd
    }),
  }
}

export const computeMetrics = (
  leads: Lead[],
  _activities: Activity[],
  _today: string
) => {
  const todayStart = startOfDay(new Date()).getTime()
  const todayEnd = endOfDay(new Date()).getTime()

  return {
    total: leads.length,
    newLeads: leads.filter((l) => l.status === 'New Lead').length,
    interested: leads.filter((l) => l.status === 'Interested').length,
    won: leads.filter((l) => l.status === 'Won').length,
    lost: leads.filter((l) => l.status === 'Lost').length,
    followupsToday: leads.filter((l) => {
      const t = getLeadFollowupTimestamp(l)
      if (t == null) return false
      return t >= todayStart && t <= todayEnd
    }).length,
  }
}

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
