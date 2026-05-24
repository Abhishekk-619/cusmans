import { useState } from 'react'
import { useCRM } from '../../firebase/CRMContext'
import { LeadForm } from './LeadForm'
import type { Lead, LeadFormData } from '../../types'

interface EditLeadModalProps {
  lead: Lead | null
  onClose: () => void
}

export function EditLeadModal({ lead, onClose }: EditLeadModalProps) {
  const { updateLead } = useCRM()
  const [submitError, setSubmitError] = useState('')

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

  return (
    <div
      className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
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

        {submitError && (
          <div className="mx-6 mt-4 px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600">
            {submitError}
          </div>
        )}

        {/* Form */}
        <div className="px-6 py-4">
          <LeadForm
            initialValues={lead}
            onSubmit={handleSubmit}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  )
}
