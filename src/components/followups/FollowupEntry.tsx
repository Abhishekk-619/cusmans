import { useState } from 'react'
import { StatusBadge } from '../ui/StatusBadge'
import { parseFollowupParts } from '../../utils/formatDateTime'
import type { Lead } from '../../types'

interface FollowupEntryProps {
  lead: Lead
  isOverdue?: boolean
  onMarkComplete: (leadId: string) => void
  onReschedule: (leadId: string, newDate: string) => void
  onLeadClick: (leadId: string) => void
}

export function FollowupEntry({
  lead,
  isOverdue = false,
  onMarkComplete,
  onReschedule,
  onLeadClick,
}: FollowupEntryProps) {
  const [rescheduling, setRescheduling] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')

  const handleRescheduleConfirm = () => {
    if (!newDate) return
    const combined = newTime ? `${newDate}T${newTime}` : newDate
    onReschedule(lead.id, combined)
    setRescheduling(false)
    setNewDate('')
    setNewTime('')
  }

  return (
    <div
      className={`bg-white rounded-lg p-4 border shadow-sm ${
        isOverdue ? 'border-amber-200 border-l-4 border-l-amber-400' : 'border-gray-100'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Lead name + status badge inline */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onLeadClick(lead.id)}
              className="text-sm font-medium text-gray-900 hover:text-green-600 transition-colors text-left"
            >
              {lead.full_name}
            </button>
            {lead.status !== 'Lost' && <StatusBadge status={lead.status} size="sm" />}
            {lead.status === 'Lost' && lead.lost_reason && (
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-700">
                {lead.lost_reason}
              </span>
            )}
          </div>

          {/* Meta — date + time on two lines */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
            <div className="text-xs text-gray-500">
              {(() => {
                const { date, time } = parseFollowupParts(lead.followup_date, lead.followup_time)
                return (
                  <span>
                    {date}
                    {time && <span className="block text-xs text-gray-400">{time}</span>}
                    {isOverdue && <span className="ml-1 text-amber-600 font-medium">· Overdue</span>}
                  </span>
                )
              })()}
            </div>
            {lead.assigned_to && (
              <span className="text-xs text-gray-400">{lead.assigned_to}</span>
            )}
          </div>

          {/* Notes */}
          {lead.notes && (
            <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{lead.notes}</p>
          )}

          {/* Reschedule inline — separate date + time */}
          {rescheduling && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-700 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
              />
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-700 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
              />
              <button
                onClick={handleRescheduleConfirm}
                disabled={!newDate}
                className="px-2 py-1 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={() => { setRescheduling(false); setNewDate(''); setNewTime('') }}
                className="px-2 py-1 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Right side — actions only */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {lead.status !== 'Lost' && (
            <div className="flex items-center gap-2">
              {!rescheduling && (
                <button
                  onClick={() => setRescheduling(true)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Reschedule
                </button>
              )}
              <button
                onClick={() => onMarkComplete(lead.id)}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
              >
                Mark Complete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
