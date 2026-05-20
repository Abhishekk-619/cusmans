import { StatusBadge } from '../ui/StatusBadge'
import { formatFollowupDateTime, formatDate, formatTime } from '../../utils/formatDateTime'
import type { Lead } from '../../types'

interface LeadRowProps {
  lead: Lead
  onRowClick: (leadId: string) => void
  onDelete: (leadId: string) => void
  onToggleFollowupStatus: (leadId: string, status: 'Ongoing' | 'Completed') => void
}

export function LeadRow({ lead, onRowClick, onDelete, onToggleFollowupStatus }: LeadRowProps) {
  const isLost = lead.status === 'Lost'
  const followupStatus = lead.followup_status ?? 'Ongoing'

  return (
    <>
      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
        {formatDate(lead.created_at)}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
        {formatTime(lead.created_at)}
      </td>
      <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
        {lead.full_name}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{lead.phone || '—'}</td>
      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{lead.email || '—'}</td>
      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{lead.company || '—'}</td>
      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{lead.lead_source}</td>
      <td className="px-4 py-3 whitespace-nowrap">
        <StatusBadge status={lead.status} />
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{lead.assigned_to || '—'}</td>
      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
        {formatFollowupDateTime(lead.followup_date)}
      </td>

      {/* Follow-up Status column */}
      <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        {isLost ? (
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-700">
            {lead.lost_reason ?? 'Lost'}
          </span>
        ) : (
          <select
            value={followupStatus}
            onChange={(e) => onToggleFollowupStatus(lead.id, e.target.value as 'Ongoing' | 'Completed')}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium border-0 cursor-pointer focus:ring-1 focus:ring-green-500 focus:outline-none ${
              followupStatus === 'Completed'
                ? 'bg-green-100 text-green-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            <option value="Ongoing">Ongoing</option>
            <option value="Completed">Completed</option>
          </select>
        )}
      </td>

      {/* Actions — always visible */}
      <td
        className="px-4 py-3 whitespace-nowrap"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRowClick(lead.id)
            }}
            className="p-1.5 text-green-600 hover:text-green-700 rounded transition-colors"
            title="View / Edit"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(lead.id)
            }}
            className="p-1.5 text-red-500 hover:text-red-600 rounded transition-colors"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </td>
    </>
  )
}
