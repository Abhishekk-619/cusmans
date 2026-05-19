import { useState } from 'react'
import { useCRMStore } from '../../store/useCRMStore'
import { ActivityItem } from './ActivityItem'
import { ACTIVITY_TYPES, type Activity, type ActivityType } from '../../types'

interface ActivityTimelineProps {
  leadId: string
  activities: Activity[]
}

export function ActivityTimeline({ leadId, activities }: ActivityTimelineProps) {
  const addActivity = useCRMStore((s) => s.addActivity)
  const [activityType, setActivityType] = useState<ActivityType>('Note')
  const [description, setDescription] = useState('')

  const handleAdd = () => {
    if (!description.trim()) return
    addActivity({ lead_id: leadId, activity_type: activityType, description: description.trim() })
    setDescription('')
  }

  return (
    <div>
      {/* Add activity */}
      <div className="mb-4 space-y-2">
        <select
          value={activityType}
          onChange={(e) => setActivityType(e.target.value as ActivityType)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
        >
          {ACTIVITY_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <textarea
          rows={2}
          placeholder="Add a note or activity description..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none resize-none"
        />
        <button
          onClick={handleAdd}
          disabled={!description.trim()}
          className="w-full py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Add Activity
        </button>
      </div>

      {/* Timeline */}
      {activities.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">No activity yet</p>
      ) : (
        <div>
          {activities.map((activity) => (
            <ActivityItem key={activity.id} activity={activity} />
          ))}
        </div>
      )}
    </div>
  )
}
