import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { StatusBadge } from '../ui/StatusBadge'
import type { Lead } from '../../types'
import { format } from 'date-fns'

interface LeadCardProps {
  lead: Lead
  onClick: () => void
  isDragging?: boolean
}

export function LeadCard({ lead, onClick, isDragging = false }: LeadCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: lead.id,
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: isDragging ? undefined : 'transform 200ms ease',
    willChange: isDragging ? 'transform' : undefined,
  }

  const formatFollowup = (dateStr: string | null) => {
    if (!dateStr) return null
    try {
      return format(new Date(dateStr + 'T00:00:00'), 'MMM d, yyyy')
    } catch {
      return null
    }
  }

  const followupFormatted = formatFollowup(lead.followup_date)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white rounded-lg p-3 shadow-sm border border-gray-100 cursor-grab active:cursor-grabbing select-none transition-opacity ${
        isDragging ? 'opacity-50' : 'hover:shadow-md'
      }`}
      onClick={(e) => {
        // Don't fire click when dragging
        if (transform) return
        e.stopPropagation()
        onClick()
      }}
    >
      <p className="text-sm font-medium text-gray-900 truncate">{lead.full_name}</p>
      {lead.company && (
        <p className="text-xs text-gray-500 mt-0.5 truncate">{lead.company}</p>
      )}

      <div className="mt-2 space-y-1">
        {/* Follow-up date */}
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{followupFormatted ?? 'No follow-up'}</span>
        </div>

        {/* Assigned to */}
        {lead.assigned_to && (
          <div className="flex items-center gap-1 text-xs text-gray-400">
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
