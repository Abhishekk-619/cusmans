import { useCRMStore } from '../store/useCRMStore'
import { computeMetrics, categorizeFollowups, getRecentActivities, getTodayString } from '../store/selectors'
import { MetricCard } from '../components/dashboard/MetricCard'
import { RecentActivityList } from '../components/dashboard/RecentActivityList'
import { StatusBadge } from '../components/ui/StatusBadge'
import { format } from 'date-fns'

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

  const today = getTodayString()
  const metrics = computeMetrics(leads, activities, today)
  const { today: todayLeads, overdue } = categorizeFollowups(leads, today)

  const followupLeads = [...todayLeads, ...overdue].sort((a, b) =>
    (a.followup_date ?? '').localeCompare(b.followup_date ?? '')
  )

  const metricCards = [
    { label: 'Total Leads', value: metrics.total },
    { label: 'New Leads', value: metrics.newLeads },
    { label: 'Interested', value: metrics.interested },
    { label: 'Won Deals', value: metrics.won, accent: true },
    { label: 'Lost Deals', value: metrics.lost },
    { label: 'Follow-ups Today', value: metrics.followupsToday, accent: metrics.followupsToday > 0 },
  ]

  return (
    <div className="max-w-screen-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">{getGreeting()} — here's your sales overview</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {metricCards.map((card) => (
          <MetricCard key={card.label} label={card.label} value={card.value} accent={card.accent} />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <RecentActivityList activities={activities} leads={leads} />
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
                      isOverdue ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100'
                    }`}
                    onClick={() => openDrawer(lead.id)}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{lead.full_name}</p>
                      <p className="text-xs text-gray-500">
                        {lead.followup_date
                          ? format(new Date(lead.followup_date + 'T00:00:00'), 'MMM d, yyyy')
                          : '—'}
                        {isOverdue && (
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
