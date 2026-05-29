import { useState } from 'react'
import { useCRM } from '../../firebase/CRMContext'
import { LeadForm } from './LeadForm'
import { TimePickerAMPM } from '../ui/TimePickerAMPM'
import type { Lead, LeadFormData } from '../../types'
import { format } from 'date-fns'

interface EditLeadModalProps {
  lead: Lead | null
  onClose: () => void
}

export function EditLeadModal({ lead, onClose }: EditLeadModalProps) {
  const { updateLead, addFollowupNote } = useCRM()
  const [submitError, setSubmitError] = useState('')
  const [activeTab, setActiveTab] = useState<'edit' | 'followups'>('edit')

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

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : '')), 'MMM d, yyyy · h:mm a')
    } catch {
      return dateStr
    }
  }

  const sortedNotes = (lead.followup_notes ?? [])
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return (
    <div
      className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">{lead.full_name}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6 flex-shrink-0">
          <button
            onClick={() => setActiveTab('edit')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'edit'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Edit Lead
          </button>
          <button
            onClick={() => setActiveTab('followups')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'followups'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Follow-up History
            {sortedNotes.length > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                {sortedNotes.length}
              </span>
            )}
          </button>
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
            <div className="space-y-5">
              {/* Add Follow-up */}
              <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl space-y-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Add Follow-up Note</h3>
                <textarea
                  rows={2}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="What happened in this follow-up?"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none resize-none"
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-1">Next Follow-up Date</p>
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-1">Time</p>
                    <TimePickerAMPM
                      value={newTime}
                      onChange={(val) => setNewTime(val)}
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleAddFollowup}
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
                        <span className="text-xs text-gray-400">{formatDate(fn.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap ml-7">{fn.note}</p>
                      {(fn.date || fn.time) && (
                        <p className="text-xs text-green-600 mt-1 ml-7">
                          📅 Next follow-up: {fn.date ? formatDate(fn.date) : ''} {fn.time ?? ''}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic text-center py-6">No follow-up notes yet. Add one above.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
