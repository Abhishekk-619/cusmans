import { useEffect } from 'react'
import { useCRMStore } from '../../store/useCRMStore'
import { LeadForm } from './LeadForm'
import type { LeadFormData } from '../../types'

interface AddLeadModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AddLeadModal({ isOpen, onClose }: AddLeadModalProps) {
  const addLead = useCRMStore((s) => s.addLead)

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleSubmit = (data: LeadFormData) => {
    addLead(data)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg animate-fade-in"
        style={{ animation: 'fadeIn 150ms ease' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Add New Lead</h2>
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

        {/* Form */}
        <div className="px-6 py-4">
          <LeadForm onSubmit={handleSubmit} onCancel={onClose} />
        </div>
      </div>
    </div>
  )
}
