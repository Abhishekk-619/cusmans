import { formatDistanceToNow } from 'date-fns'
import type { Activity, ActivityType } from '../../types'

interface ActivityItemProps {
  activity: Activity
}

const typeConfig: Record<ActivityType, { color: string; label: string }> = {
  Call: { color: 'bg-blue-500', label: 'Call' },
  Meeting: { color: 'bg-purple-500', label: 'Meeting' },
  Note: { color: 'bg-gray-400', label: 'Note' },
  'Status Update': { color: 'bg-green-500', label: 'Status Update' },
  'Follow-up Update': { color: 'bg-amber-500', label: 'Follow-up Update' },
}

export function ActivityItem({ activity }: ActivityItemProps) {
  const config = typeConfig[activity.activity_type]

  const timeAgo = (() => {
    try {
      return formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })
    } catch {
      return ''
    }
  })()

  return (
    <div className="flex gap-3">
      {/* Dot */}
      <div className="flex flex-col items-center">
        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${config.color}`} />
        <div className="w-px flex-1 bg-gray-100 mt-1" />
      </div>

      {/* Content */}
      <div className="pb-4 min-w-0">
        <p className="text-xs font-semibold text-gray-700">{config.label}</p>
        {activity.description && (
          <p className="text-xs text-gray-500 mt-0.5 break-words">{activity.description}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">{timeAgo}</p>
      </div>
    </div>
  )
}
