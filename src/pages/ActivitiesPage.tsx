import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { useCRM } from '../firebase/CRMContext'
import { useAuth } from '../firebase/AuthContext'
import { useUsers } from '../firebase/useUsers'
import type { Activity, ActivityType } from '../types'

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  Call: 'bg-blue-500',
  Meeting: 'bg-purple-500',
  Note: 'bg-gray-400',
  'Status Update': 'bg-green-500',
  'Follow-up Update': 'bg-amber-500',
}

function formatDateKey(ts: string): string {
  try {
    return format(new Date(ts), 'yyyy-MM-dd')
  } catch {
    return ''
  }
}

function formatDisplayTime(ts: string): string {
  try {
    return format(new Date(ts), 'hh:mm a')
  } catch {
    return ts
  }
}

function formatDisplayDate(ts: string): string {
  try {
    return format(new Date(ts), 'MMM d, yyyy')
  } catch {
    return ts
  }
}

export function ActivitiesPage() {
  const { activities, leads, openEditModal } = useCRM()
  const { currentUser } = useAuth()
  const { teamLeads, employees, getEmployeesUnderTeamLead } = useUsers()
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')

  // For admin: list all users (team leads + employees) in the member dropdown
  // For team lead: list their own employees
  const filterableMembers = useMemo(() => {
    if (!currentUser) return []
    if (currentUser.role === 'admin') {
      return [...teamLeads, ...employees]
    }
    if (currentUser.role === 'team_lead') {
      return getEmployeesUnderTeamLead(currentUser.uid)
    }
    return []
  }, [currentUser, teamLeads, employees, getEmployeesUnderTeamLead])

  // Build the set of UIDs whose activities are visible to the current user.
  // - Admin: null (sees everything — no filter)
  // - Team Lead: own UID + all employees under them
  // - Employee: empty set (employees don't see the Activities page)
  const allowedActorUids = useMemo(() => {
    if (!currentUser) return new Set<string>()
    if (currentUser.role === 'admin') return null // admin sees all
    if (currentUser.role === 'team_lead') {
      const empUids = getEmployeesUnderTeamLead(currentUser.uid).map((e) => e.uid)
      return new Set([currentUser.uid, ...empUids]) // include TL's own UID
    }
    return new Set<string>()
  }, [currentUser, getEmployeesUnderTeamLead])

  const visibleActivities = useMemo(() => {
    const sorted = [...activities].sort((a, b) => b.created_at.localeCompare(a.created_at))

    return sorted.filter((activity) => {
      const actorUid = activity.performed_by_uid ?? ''

      // Role-based visibility gate
      if (allowedActorUids && !allowedActorUids.has(actorUid)) {
        return false
      }

      // Date filter
      if (selectedDate && formatDateKey(activity.created_at) !== selectedDate) {
        return false
      }

      // Admin drill-down filter
      if (currentUser?.role === 'admin' && selectedEmployeeId) {
        return actorUid === selectedEmployeeId
      }

      // Team lead employee filter
      if (currentUser?.role === 'team_lead' && selectedEmployeeId) {
        return actorUid === selectedEmployeeId
      }

      return true
    })
  }, [
    activities,
    allowedActorUids,
    currentUser?.role,
    selectedDate,
    selectedEmployeeId,
  ])

  const getLeadName = (leadId: string) =>
    leads.find((lead) => lead.id === leadId)?.full_name ?? (leadId === 'import' ? 'Lead Import' : 'Unknown Lead')

  const getActorName = (activity: Activity) =>
    activity.performed_by_name || (activity.performed_by_uid ? 'Unknown User' : 'System')

  const subtitle =
    currentUser?.role === 'admin'
      ? 'View all logs done by admins, team leads, and employees'
      : 'View logs done by employees in your team'

  const clearFilters = () => {
    setSelectedDate('')
    setSelectedEmployeeId('')
  }

  return (
    <div className="max-w-screen-lg mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activities</h1>
          <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none bg-white"
          />

          {(currentUser?.role === 'team_lead' || currentUser?.role === 'admin') && (
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none bg-white"
            >
              <option value="">All Members</option>
              {/* For TL: show themselves + their employees */}
              {currentUser?.role === 'team_lead' && (
                <option value={currentUser.uid}>{currentUser.name} (You)</option>
              )}
              {filterableMembers.map((member) => (
                <option key={member.uid} value={member.uid}>
                  {member.name}{member.role === 'team_lead' ? ' (Team Lead)' : ''}
                </option>
              ))}
            </select>
          )}

          {(selectedDate || selectedEmployeeId) && (
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {visibleActivities.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center text-sm text-gray-400">
          No activities found for the selected filters
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {visibleActivities.map((activity) => {
            const lead = leads.find((item) => item.id === activity.lead_id)
            return (
              <div key={activity.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="mt-1 flex-shrink-0">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${ACTIVITY_COLORS[activity.activity_type] ?? 'bg-gray-400'}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900">{getActorName(activity)}</p>
                      <span className="text-xs text-gray-400">
                        {formatDisplayDate(activity.created_at)} at {formatDisplayTime(activity.created_at)}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mt-1">{activity.description}</p>

                    <div className="flex items-center gap-2 flex-wrap mt-2">
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-700">
                        {activity.activity_type}
                      </span>
                      <button
                        onClick={() => lead && openEditModal(lead.id)}
                        disabled={!lead}
                        className="text-xs text-green-600 hover:text-green-700 disabled:text-gray-400 transition-colors"
                      >
                        {getLeadName(activity.lead_id)}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
