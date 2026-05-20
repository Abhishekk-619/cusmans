import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { StatusBadge } from '../ui/StatusBadge'
import { formatFollowupDateTime } from '../../utils/formatDateTime'
import type { Lead } from '../../types'

interface LeadCardProps {
  lead: Lead
  onClick: () => void
  isDragging?: boolean
}

function isOverdue(lead: Lead): boolean {
  if (!lead.followup_date) return false
  if (lead.status === 'Won' || lead.status === 'Lost') return false
  const followupTime = new Date(lead.followup_date).getTime()
  return followupTime < Date.now()
}

export function LeadCard({ lead, onClick, isDragging = false }: LeadCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: lead.id,
  })

  const overdue = isOverdue(lead)

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: isDragging ? undefined : 'transform 200ms ease',
    willChange: isDragging ? 'transform' : undefined,
  }

  const followupFormatted = formatFollowupDateTime(lead.followup_date)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`rounded-lg p-3 shadow-sm border cursor-grab active:cursor-grabbing select-none transition-all ${
        isDragging
          ? 'opacity-50'
          : overdue
          ? 'bg-red-50 border-red-300 hover:shadow-md hover:border-red-400'
          : 'bg-white border-gray-100 hover:shadow-md'
      }`}
      onClick={(e) => {
        if (transform) return
        e.stopPropagation()
        onClick()
      }}
    >
      <p className={`text-sm font-medium truncate ${overdue ? 'text-red-700' : 'text-gray-900'}`}>
        {lead.full_name}
      </p>

      <div className="mt-2 space-y-1">
        {/* Follow-up date */}
        <div className={`flex items-center gap-1 text-xs ${overdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{followupFormatted === '—' ? 'No follow-up' : followupFormatted}{overdue ? ' · Overdue' : ''}</span>
        </div>

        {/* Assigned to */}
        {lead.assigned_to && (
          <div className={`flex items-center gap-1 text-xs ${overdue ? 'text-red-400' : 'text-gray-400'}`}>
            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="truncate">{lead.assigned_to}</span>
          </div>
        )}
      </div>

      <div className="mt-2">
        {lead.status === 'Lost' && lead.lost_reason ? (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700">
            {lead.lost_reason}
          </span>
        ) : (
          <StatusBadge status={lead.status} size="sm" />
        )}
      </div>
    </div>
  )
}
