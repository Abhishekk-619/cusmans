import { useState } from 'react'
import { useCRMStore } from '../../store/useCRMStore'
import { getActivitiesForLead } from '../../store/selectors'
import { StatusBadge } from '../ui/StatusBadge'
import { ActivityTimeline } from './ActivityTimeline'
import { LeadForm } from './LeadForm'
import { LEAD_STATUSES, type LeadStatus, type LeadFormData } from '../../types'
import { format } from 'date-fns'

export function LeadDrawer() {
  const openDrawerLeadId = useCRMStore((s) => s.openDrawerLeadId)
  const leads = useCRMStore((s) => s.leads)
  const activities = useCRMStore((s) => s.activities)
  const closeDrawer = useCRMStore((s) => s.closeDrawer)
  const updateLead = useCRMStore((s) => s.updateLead)

  const [isEditing, setIsEditing] = useState(false)
  const [localNotes, setLocalNotes] = useState<string | null>(null)

  const lead = openDrawerLeadId ? leads.find((l) => l.id === openDrawerLeadId) ?? null : null
  const leadActivities = lead ? getActivitiesForLead(activities, lead.id) : []

  const isOpen = lead !== null

  const handleClose = () => {
    setIsEditing(false)
    setLocalNotes(null)
    closeDrawer()
  }

  const handleStatusChange = (newStatus: LeadStatus) => {
    if (!lead) return
    updateLead(lead.id, { status: newStatus })
  }

  const handleFollowupChange = (newDate: string) => {
    if (!lead) return
    updateLead(lead.id, { followup_date: newDate || null })
  }

  const handleSaveNotes = () => {
    if (!lead || localNotes === null) return
    updateLead(lead.id, { notes: localNotes })
    setLocalNotes(null)
  }

  const handleEditSubmit = (data: LeadFormData) => {
    if (!lead) return
    updateLead(lead.id, data)
    setIsEditing(false)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    try {
      return format(new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : '')), 'MMM d, yyyy')
    } catch {
      return '—'
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/20 z-[39] transition-opacity duration-250 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleClose}
      />

      {/* Drawer panel */}
      <div
        className={`fixed right-0 top-0 h-full w-[480px] bg-white shadow-2xl z-40 flex flex-col transition-transform duration-250 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {lead && (
          <>
            {/* Header */}
            <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-gray-900 truncate">{lead.full_name}</h2>
                {lead.company && (
                  <p className="text-sm text-gray-500 mt-0.5">{lead.company}</p>
                )}
              </div>
              <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1.5 text-xs font-medium text-green-600 border border-green-200 rounded-lg hover:bg-green-50 transition-colors"
                  >
                    Edit
                  </button>
                )}
                <button
                  onClick={handleClose}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
                  aria-label="Close drawer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              {isEditing ? (
                <LeadForm
                  initialValues={lead}
                  onSubmit={handleEditSubmit}
                  onCancel={() => setIsEditing(false)}
                />
              ) : (
                <>
                  {/* Lead Information */}
                  <section>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                      Lead Information
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <InfoField label="Phone" value={lead.phone || '—'} />
                      <InfoField label="Email" value={lead.email || '—'} />
                      <InfoField label="Company" value={lead.company || '—'} />
                      <InfoField label="Lead Source" value={lead.lead_source} />
                      <InfoField label="Assigned To" value={lead.assigned_to || '—'} />
                      <InfoField label="Created" value={formatDate(lead.created_at)} />
                    </div>
                  </section>

                  {/* Current Status */}
                  <section>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                      Current Status
                    </h3>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={lead.status} size="md" />
                      <select
                        value={lead.status}
                        onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
                        className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
                      >
                        {LEAD_STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </section>

                  {/* Follow-up Information */}
                  <section>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                      Follow-up Information
                    </h3>
                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <div>
                        <p className="text-xs text-gray-400 font-medium mb-1">Date</p>
                        <input
                          type="date"
                          value={lead.followup_date ? lead.followup_date.slice(0, 10) : ''}
                          onChange={(e) => {
                            const time = lead.followup_time ?? ''
                            const combined = time ? `${e.target.value}T${time}` : e.target.value
                            handleFollowupChange(combined || '')
                          }}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-medium mb-1">Time</p>
                        <input
                          type="time"
                          value={lead.followup_time ?? ''}
                          onChange={(e) => {
                            const date = lead.followup_date ? lead.followup_date.slice(0, 10) : ''
                            if (date) {
                              handleFollowupChange(`${date}T${e.target.value}`)
                            }
                            updateLead(lead.id, { followup_time: e.target.value })
                          }}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    {lead.followup_date && (
                      <button
                        onClick={() => handleFollowupChange('')}
                        className="px-3 py-2 text-xs font-medium text-green-700 border border-green-200 rounded-lg hover:bg-green-50 transition-colors whitespace-nowrap"
                      >
                        Mark Complete
                      </button>
                    )}
                  </section>

                  {/* Notes */}
                  <section>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                      Notes
                    </h3>
                    <textarea
                      rows={3}
                      value={localNotes !== null ? localNotes : lead.notes}
                      onChange={(e) => setLocalNotes(e.target.value)}
                      placeholder="Add notes about this lead..."
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none resize-none"
                    />
                    {localNotes !== null && localNotes !== lead.notes && (
                      <button
                        onClick={handleSaveNotes}
                        className="mt-2 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Save Notes
                      </button>
                    )}
                  </section>

                  {/* Activity Timeline */}
                  <section>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                      Activity Timeline
                    </h3>
                    <ActivityTimeline leadId={lead.id} activities={leadActivities} />
                  </section>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className="text-sm text-gray-700 mt-0.5 break-words">{value}</p>
    </div>
  )
}
