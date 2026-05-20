import { useNavigate } from 'react-router-dom'
import { useCRMStore } from '../store/useCRMStore'
import { categorizeFollowups, getRecentActivities, getTodayString } from '../store/selectors'
import { RecentActivityList } from '../components/dashboard/RecentActivityList'
import { StatusBadge } from '../components/ui/StatusBadge'
import { LEAD_STATUSES, STATUS_COLORS, type LeadStatus } from '../types'
import { formatFollowupDateTime } from '../utils/formatDateTime'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function DashboardPage() {
  const leads = useCRMStore((s) => s.leads)
  const activities = useCRMStore((s) => s.activities)
  const openDrawer = useCRMStore((s) => s.openDrawer)
  const navigate = useNavigate()

  const today = getTodayString()
  const { today: todayLeads, overdue } = categorizeFollowups(leads, today)
  const recentActivities = getRecentActivities(activities, 10)

  const followupLeads = [...todayLeads, ...overdue].sort((a, b) =>
    new Date(a.followup_date ?? '').getTime() - new Date(b.followup_date ?? '').getTime()
  )

  // Build stage cards from ALL LEAD_STATUSES for consistency
  const stageCards = LEAD_STATUSES.map((status) => ({
    status,
    count: leads.filter((l) => l.status === status).length,
  }))

  // Total leads card
  const totalLeads = leads.length

  // Follow-ups today count
  const followupsTodayCount = todayLeads.length

  const handleStageClick = (status: LeadStatus) => {
    navigate(`/leads?status=${encodeURIComponent(status)}`)
  }

  return (
    <div className="max-w-screen-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">{getGreeting()} — here's your sales overview</p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Total Leads */}
        <button
          onClick={() => navigate('/leads')}
          className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-left hover:shadow-md hover:border-green-200 transition-all"
        >
          <p className="text-sm text-gray-500 font-medium">Total Leads</p>
          <p className="text-3xl font-bold mt-1 text-gray-900">{totalLeads}</p>
        </button>

        {/* Follow-ups Today */}
        <button
          onClick={() => navigate('/followups')}
          className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-left hover:shadow-md hover:border-amber-200 transition-all"
        >
          <p className="text-sm text-gray-500 font-medium">Follow-ups Today</p>
          <p className={`text-3xl font-bold mt-1 ${followupsTodayCount > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
            {followupsTodayCount}
          </p>
        </button>
      </div>

      {/* All stage cards — one per status, clickable */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Lead Stages</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {stageCards.map(({ status, count }) => {
            const colors = STATUS_COLORS[status]
            return (
              <button
                key={status}
                onClick={() => handleStageClick(status)}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-left hover:shadow-md hover:border-green-200 transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}>
                    {status}
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">
                  {count}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">leads</p>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <RecentActivityList activities={recentActivities} leads={leads} />
        </div>

        {/* Follow-ups */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Follow-ups Due
            {followupLeads.length > 0 && (
              <span className="ml-2 bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full">
                {followupLeads.length}
              </span>
            )}
          </h2>
          {followupLeads.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No follow-ups due</p>
          ) : (
            <ul className="space-y-2">
              {followupLeads.map((lead) => {
                const isOverdue = lead.followup_date != null && lead.followup_date < today
                return (
                  <li
                    key={lead.id}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors ${
                      lead.followup_date && new Date(lead.followup_date).getTime() < Date.now()
                        ? 'border-amber-200 bg-amber-50/30'
                        : 'border-gray-100'
                    }`}
                    onClick={() => openDrawer(lead.id)}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{lead.full_name}</p>
                      <p className="text-xs text-gray-500">
                        {formatFollowupDateTime(lead.followup_date)}
                        {lead.followup_date && new Date(lead.followup_date).getTime() < Date.now() && (
                          <span className="ml-1 text-amber-600 font-medium">· Overdue</span>
                        )}
                      </p>
                    </div>
                    <StatusBadge status={lead.status} size="sm" />
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
