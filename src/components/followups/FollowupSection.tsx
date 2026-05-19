import { FollowupEntry } from './FollowupEntry'
import type { Lead } from '../../types'

interface FollowupSectionProps {
  title: string
  leads: Lead[]
  isOverdue: boolean
  onMarkComplete: (leadId: string) => void
  onReschedule: (leadId: string, newDate: string) => void
  onLeadClick: (leadId: string) => void
}

export function FollowupSection({
  title,
  leads,
  isOverdue,
  onMarkComplete,
  onReschedule,
  onLeadClick,
}: FollowupSectionProps) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            isOverdue
              ? 'bg-amber-100 text-amber-700'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {leads.length}
        </span>
      </div>

      {leads.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-100 p-6 text-center">
          <p className="text-sm text-gray-400">No follow-ups</p>
        </div>
      ) : (
        <div className="space-y-2">
          {leads.map((lead) => (
            <FollowupEntry
              key={lead.id}
              lead={lead}
              isOverdue={isOverdue}
              onMarkComplete={onMarkComplete}
              onReschedule={onReschedule}
              onLeadClick={onLeadClick}
            />
          ))}
        </div>
      )}
    </section>
  )
}
