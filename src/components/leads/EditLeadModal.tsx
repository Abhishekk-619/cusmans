import { useState, useMemo } from 'react'
import { useCRM } from '../../firebase/CRMContext'
import { getActivitiesForLead, isLeadFollowupOverdue } from '../../store/selectors'
import { LeadForm } from './LeadForm'
import { TimePickerAMPM } from '../ui/TimePickerAMPM'
import type { Lead, LeadFormData, Activity, FollowupNote } from '../../types'
import { format, formatDistanceToNow } from 'date-fns'

interface EditLeadModalProps {
  lead: Lead | null
  onClose: () => void
}

export function EditLeadModal({ lead, onClose }: EditLeadModalProps) {
  const { updateLead, addFollowupNote, activities } = useCRM()
  const [submitError, setSubmitError] = useState('')
  const [activeTab, setActiveTab] = useState<'edit' | 'followups' | 'activity'>('edit')

  // Follow-up form state
  const [newNote, setNewNote] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')
  const [saving, setSaving] = useState(false)

  if (!lead) return null

  const handleSubmit = async (data: LeadFormData) => {
    setSubmitError('')
    try {
      await updateLead(lead.id, data)
      onClose()
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to update lead')
    }
  }

  const handleAddFollowup = async () => {
    if (!newNote.trim()) return
    setSaving(true)
    try {
      await addFollowupNote(lead.id, {
        note: newNote.trim(),
        date: newDate || undefined,
        time: newTime || undefined,
      })
      if (newDate) {
        const combined = newTime ? `${newDate}T${newTime}` : newDate
        updateLead(lead.id, {
          followup_date: combined,
          followup_time: newTime || null,
          followup_status: 'Ongoing',
        })
      }
      setNewNote('')
      setNewDate('')
      setNewTime('')
    } catch (err) {
      console.error('Failed to add follow-up:', err)
    }
    setSaving(false)
  }

  const fmtDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : '')), 'MMM d, yyyy · h:mm a')
    } catch {
      return dateStr
    }
  }

  const sortedNotes = (lead.followup_notes ?? [])
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const leadActivities = getActivitiesForLead(activities, lead.id)

  return (
    <div
      className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900 truncate">{lead.full_name}</h2>
            {lead.company && <p className="text-xs text-gray-400 mt-0.5">{lead.company}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors ml-3 flex-shrink-0"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6 flex-shrink-0">
          {([
            { key: 'edit' as const, label: 'Edit Lead' },
            { key: 'followups' as const, label: 'Follow-ups', badge: sortedNotes.length },
            { key: 'activity' as const, label: 'Activity Log', badge: leadActivities.length },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.badge != null && tab.badge > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {submitError && (
          <div className="mx-6 mt-4 px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600">
            {submitError}
          </div>
        )}

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {activeTab === 'edit' && (
            <LeadForm
              initialValues={lead}
              onSubmit={handleSubmit}
              onCancel={onClose}
            />
          )}

          {activeTab === 'followups' && (
            <FollowupsTab
              sortedNotes={sortedNotes}
              newNote={newNote}
              newDate={newDate}
              newTime={newTime}
              saving={saving}
              onNoteChange={setNewNote}
              onDateChange={setNewDate}
              onTimeChange={setNewTime}
              onSave={handleAddFollowup}
              fmtDate={fmtDate}
            />
          )}

          {activeTab === 'activity' && (
            <ActivityTab
              lead={lead}
              activities={leadActivities}
              followupNotes={lead.followup_notes ?? []}
              fmtDate={fmtDate}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Follow-ups Tab ───────────────────────────────────────────────────────────

function FollowupsTab({
  sortedNotes, newNote, newDate, newTime, saving,
  onNoteChange, onDateChange, onTimeChange, onSave, fmtDate,
}: {
  sortedNotes: FollowupNote[]
  newNote: string; newDate: string; newTime: string; saving: boolean
  onNoteChange: (v: string) => void; onDateChange: (v: string) => void
  onTimeChange: (v: string) => void; onSave: () => void
  fmtDate: (d: string) => string
}) {
  return (
    <div className="space-y-5">
      {/* Add Follow-up */}
      <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl space-y-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Add Follow-up Note</h3>
        <textarea
          rows={2}
          value={newNote}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="What happened in this follow-up?"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none resize-none"
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-400 font-medium mb-1">Next Follow-up Date</p>
            <input
              type="date"
              value={newDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
            />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium mb-1">Time</p>
            <TimePickerAMPM value={newTime} onChange={(val) => onTimeChange(val)} />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={onSave}
            disabled={!newNote.trim() || saving}
            className="px-4 py-2 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Follow-up'}
          </button>
        </div>
      </div>

      {/* Timeline */}
      {sortedNotes.length > 0 ? (
        <div className="space-y-4">
          {sortedNotes.map((fn) => (
            <div key={fn.id} className="relative pl-4 border-l-2 border-green-200">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-600 text-[10px] font-bold flex-shrink-0">
                  {fn.added_by_name?.charAt(0)?.toUpperCase() ?? '?'}
                </span>
                <span className="text-xs font-medium text-gray-700">{fn.added_by_name}</span>
                <span className="text-xs text-gray-400">·</span>
                <span className="text-xs text-gray-400">{fmtDate(fn.created_at)}</span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap ml-7">{fn.note}</p>
              {(fn.date || fn.time) && (
                <p className="text-xs text-green-600 mt-1 ml-7">
                  📅 Next follow-up: {fn.date ? fmtDate(fn.date) : ''} {fn.time ?? ''}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 italic text-center py-6">No follow-up notes yet. Add one above.</p>
      )}
    </div>
  )
}

// ─── Activity Log Tab ─────────────────────────────────────────────────────────

type TimelineEntry = {
  id: string
  type: 'activity' | 'followup_note'
  timestamp: string
  // Activity fields
  activityType?: string
  description?: string
  performedBy?: string
  // Followup note fields
  note?: string
  nextDate?: string
  nextTime?: string
  addedBy?: string
}

const ACTIVITY_COLORS: Record<string, string> = {
  Call: 'bg-blue-500',
  Meeting: 'bg-purple-500',
  Note: 'bg-gray-400',
  'Status Update': 'bg-green-500',
  'Follow-up Update': 'bg-amber-500',
}

function ActivityTab({
  lead,
  activities,
  followupNotes,
  fmtDate,
}: {
  lead: Lead
  activities: Activity[]
  followupNotes: FollowupNote[]
  fmtDate: (d: string) => string
}) {
  // Compute stats
  const totalFollowupsDone = activities.filter(
    (a) => a.activity_type === 'Follow-up Update' && a.description.toLowerCase().includes('marked as complete')
  ).length
  const followupNotesCount = followupNotes.length
  const hasPendingFollowup = lead.followup_date && lead.followup_status !== 'Completed'
  const isOverdue = isLeadFollowupOverdue(lead)
  const statusChanges = activities.filter((a) => a.activity_type === 'Status Update').length

  // Merge activities + followup notes into a unified timeline
  const timeline = useMemo(() => {
    const entries: TimelineEntry[] = []

    activities.forEach((a) => {
      entries.push({
        id: a.id,
        type: 'activity',
        timestamp: a.created_at,
        activityType: a.activity_type,
        description: a.description,
        performedBy: a.performed_by_name ?? 'System',
      })
    })

    followupNotes.forEach((fn) => {
      entries.push({
        id: fn.id,
        type: 'followup_note',
        timestamp: fn.created_at,
        note: fn.note,
        nextDate: fn.date,
        nextTime: fn.time,
        addedBy: fn.added_by_name,
      })
    })

    return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [activities, followupNotes])

  const timeAgo = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
    } catch {
      return ''
    }
  }

  return (
    <div className="space-y-5">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Follow-ups Done" value={totalFollowupsDone} color="green" />
        <StatCard
          label="Pending"
          value={hasPendingFollowup ? 1 : 0}
          color={hasPendingFollowup ? 'amber' : 'gray'}
        />
        <StatCard
          label="Overdue"
          value={isOverdue ? 1 : 0}
          color={isOverdue ? 'red' : 'gray'}
        />
        <StatCard label="Status Changes" value={statusChanges} color="blue" />
      </div>

      {/* Current Follow-up Status */}
      {lead.followup_date && (
        <div className={`rounded-lg px-4 py-3 border text-sm ${
          isOverdue
            ? 'bg-red-50 border-red-100 text-red-700'
            : 'bg-amber-50 border-amber-100 text-amber-700'
        }`}>
          <span className="font-medium">{isOverdue ? '⚠ Overdue:' : '📅 Next follow-up:'}</span>{' '}
          {fmtDate(lead.followup_date)}
        </div>
      )}

      {/* Unified Timeline */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Complete Activity Timeline ({timeline.length})
        </h3>

        {timeline.length === 0 ? (
          <p className="text-sm text-gray-400 italic text-center py-6">No activity recorded yet.</p>
        ) : (
          <div className="space-y-0">
            {timeline.map((entry) => (
              <div key={entry.id} className="flex gap-3">
                {/* Dot + Line */}
                <div className="flex flex-col items-center">
                  {entry.type === 'activity' ? (
                    <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${ACTIVITY_COLORS[entry.activityType ?? ''] ?? 'bg-gray-300'}`} />
                  ) : (
                    <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 bg-green-400 ring-2 ring-green-100" />
                  )}
                  <div className="w-px flex-1 bg-gray-100 mt-1" />
                </div>

                {/* Content */}
                <div className="pb-4 min-w-0 flex-1">
                  {entry.type === 'activity' ? (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-700">{entry.activityType}</span>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-gray-400">{entry.performedBy}</span>
                      </div>
                      {entry.description && (
                        <p className="text-xs text-gray-500 mt-0.5 break-words">{entry.description}</p>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-green-700">Follow-up Note</span>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-gray-400">{entry.addedBy}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5 break-words whitespace-pre-wrap">{entry.note}</p>
                      {(entry.nextDate || entry.nextTime) && (
                        <p className="text-xs text-green-600 mt-0.5">
                          📅 Scheduled: {entry.nextDate ? fmtDate(entry.nextDate) : ''} {entry.nextTime ?? ''}
                        </p>
                      )}
                    </>
                  )}
                  <p className="text-xs text-gray-300 mt-1">{timeAgo(entry.timestamp)} · {fmtDate(entry.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    green: 'bg-green-50 text-green-700 border-green-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    gray: 'bg-gray-50 text-gray-500 border-gray-100',
  }
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${colors[color] ?? colors.gray}`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="text-lg font-bold mt-0.5">{value}</p>
    </div>
  )
}
