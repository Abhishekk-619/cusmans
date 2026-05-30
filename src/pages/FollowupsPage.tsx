import { useState } from 'react'
import { useCRM } from '../firebase/CRMContext'
import { categorizeFollowups, getCompletedFollowups, getTodayString } from '../store/selectors'
import { FollowupSection } from '../components/followups/FollowupSection'
import { format } from 'date-fns'
import type { Lead } from '../types'

export function FollowupsPage() {
  const { leads, activities, updateLead, addActivity, openEditModal } = useCRM()

  const today = getTodayString()
  const { today: todayLeads, upcoming, overdue } = categorizeFollowups(leads, today)
  const completed = getCompletedFollowups(leads, activities)

  const [completedTab, setCompletedTab] = useState<'today' | 'week' | 'month'>('today')

  const handleMarkComplete = (leadId: string) => {
    updateLead(leadId, { followup_date: null, followup_status: 'Completed' })
    addActivity({
      lead_id: leadId,
      activity_type: 'Follow-up Update',
      description: 'Follow-up marked as complete',
    })
  }

  const handleReschedule = (leadId: string, newDate: string) => {
    updateLead(leadId, { followup_date: newDate })
  }

  const completedList =
    completedTab === 'today'
      ? completed.today
      : completedTab === 'week'
        ? completed.thisWeek
        : completed.thisMonth

  const formatCompletedDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM d, h:mm a')
    } catch {
      return dateStr
    }
  }

  return (
    <div className="max-w-screen-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Follow-ups</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track and manage your scheduled follow-ups</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard label="Overdue" count={overdue.length} color="red" />
        <SummaryCard label="Today" count={todayLeads.length} color="amber" />
        <SummaryCard label="Upcoming" count={upcoming.length} color="blue" />
        <SummaryCard label="Completed Today" count={completed.today.length} color="green" />
      </div>

      <FollowupSection
        title="Today"
        leads={todayLeads}
        isOverdue={false}
        onMarkComplete={handleMarkComplete}
        onReschedule={handleReschedule}
        onLeadClick={(id) => openEditModal(id)}
      />

      <FollowupSection
        title="Overdue"
        leads={overdue}
        isOverdue={true}
        onMarkComplete={handleMarkComplete}
        onReschedule={handleReschedule}
        onLeadClick={(id) => openEditModal(id)}
      />

      <FollowupSection
        title="Upcoming"
        leads={upcoming}
        isOverdue={false}
        onMarkComplete={handleMarkComplete}
        onReschedule={handleReschedule}
        onLeadClick={(id) => openEditModal(id)}
      />

      {/* Completed Follow-ups */}
      <section>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-base font-semibold text-gray-900">Completed</h2>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {([
              { key: 'today', label: 'Today', count: completed.today.length },
              { key: 'week', label: 'This Week', count: completed.thisWeek.length },
              { key: 'month', label: 'This Month', count: completed.thisMonth.length },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setCompletedTab(tab.key)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  completedTab === tab.key
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {completedList.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-100 p-6 text-center">
            <p className="text-sm text-gray-400">No completed follow-ups</p>
          </div>
        ) : (
          <div className="space-y-2">
            {completedList.map((item, idx) => (
              <CompletedRow
                key={`${item.lead.id}-${idx}`}
                lead={item.lead}
                completedAt={item.completedAt}
                formatDate={formatCompletedDate}
                onClick={() => openEditModal(item.lead.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function SummaryCard({ label, count, color }: { label: string; count: number; color: string }) {
  const colors: Record<string, string> = {
    red: 'bg-red-50 border-red-100 text-red-700',
    amber: 'bg-amber-50 border-amber-100 text-amber-700',
    blue: 'bg-blue-50 border-blue-100 text-blue-700',
    green: 'bg-green-50 border-green-100 text-green-700',
  }
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="text-2xl font-bold mt-1">{count}</p>
    </div>
  )
}

function CompletedRow({
  lead,
  completedAt,
  formatDate,
  onClick,
}: {
  lead: Lead
  completedAt: string
  formatDate: (d: string) => string
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between bg-white rounded-lg border border-gray-100 px-4 py-3 hover:bg-gray-50/50 cursor-pointer transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-100 text-green-600 text-xs font-bold flex-shrink-0">
          ✓
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{lead.full_name}</p>
          {lead.company && (
            <p className="text-xs text-gray-400 truncate">{lead.company}</p>
          )}
        </div>
      </div>
      <div className="text-right flex-shrink-0 ml-4">
        <p className="text-xs text-gray-500">{formatDate(completedAt)}</p>
        <p className="text-xs text-green-600 font-medium">Completed</p>
      </div>
    </div>
  )
}
