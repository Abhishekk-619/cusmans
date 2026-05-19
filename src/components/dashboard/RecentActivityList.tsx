import { formatDistanceToNow } from 'date-fns'
import { getRecentActivities } from '../../store/selectors'
import type { Activity, Lead, ActivityType } from '../../types'

interface RecentActivityListProps {
  activities: Activity[]
  leads: Lead[]
}

const typeColors: Record<ActivityType, string> = {
  Call: 'bg-blue-500',
  Meeting: 'bg-purple-500',
  Note: 'bg-gray-400',
  'Status Update': 'bg-green-500',
  'Follow-up Update': 'bg-amber-500',
}

export function RecentActivityList({ activities, leads }: RecentActivityListProps) {
  const recent = getRecentActivities(activities, 10)

  if (recent.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-6">No recent activity</p>
    )
  }

  return (
    <ul className="space-y-3">
      {recent.map((activity) => {
        const lead = leads.find((l) => l.id === activity.lead_id)
        const timeAgo = (() => {
          try {
            return formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })
          } catch {
            return ''
          }
        })()

        return (
          <li key={activity.id} className="flex items-start gap-3">
            <div
              className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${typeColors[activity.activity_type]}`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-xs font-semibold text-gray-700">{activity.activity_type}</span>
                {lead && (
                  <span className="text-xs text-gray-500">· {lead.full_name}</span>
                )}
              </div>
              {activity.description && (
                <p className="text-xs text-gray-500 mt-0.5 truncate">{activity.description}</p>
              )}
              <p className="text-xs text-gray-400 mt-0.5">{timeAgo}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
