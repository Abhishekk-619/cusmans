import { useState } from 'react'
import { LeadRow } from './LeadRow'
import { useCRM } from '../../firebase/CRMContext'
import type { Lead, SortConfig } from '../../types'

interface LeadTableProps {
  leads: Lead[]
  sort: SortConfig
  onSort: (column: SortConfig['column']) => void
  onRowClick: (leadId: string) => void
  onEditClick: (leadId: string) => void
  onDeleteLead: (leadId: string) => void
  canDelete?: boolean
}

const columns: { key: string; sortKey?: SortConfig['column']; label: string }[] = [
  { key: 'created_date', sortKey: 'created_at', label: 'Created Date' },
  { key: 'created_time', sortKey: 'created_at', label: 'Created Time' },
  { key: 'full_name', sortKey: 'full_name', label: 'Lead Name' },
  { key: 'phone', sortKey: 'phone', label: 'Phone' },
  { key: 'email', sortKey: 'email', label: 'Email' },
  { key: 'company', sortKey: 'company', label: 'Company' },
  { key: 'lead_source', sortKey: 'lead_source', label: 'Type of Business' },
  { key: 'status', sortKey: 'status', label: 'Status' },
  { key: 'assigned_to', sortKey: 'assigned_to', label: 'Assigned To' },
  { key: 'followup_date', sortKey: 'followup_date', label: 'Follow-up Date & Time' },
]

function SortIcon({ column, sort }: { column: SortConfig['column'] | undefined; sort: SortConfig }) {
  if (!column || sort.column !== column) {
    return (
      <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    )
  }
  return sort.direction === 'asc' ? (
    <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  ) : (
    <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}

export function LeadTable({ leads, sort, onSort, onRowClick, onEditClick, onDeleteLead, canDelete = true }: LeadTableProps) {
  const { updateLead, deleteLead } = useCRM()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const allSelected = leads.length > 0 && leads.every((l) => selectedIds.has(l.id))
  const someSelected = selectedIds.size > 0

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(leads.map((l) => l.id)))
    }
  }

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!window.confirm(`Delete ${selectedIds.size} selected lead${selectedIds.size > 1 ? 's' : ''}? This cannot be undone.`)) return
    setBulkDeleting(true)
    for (const id of selectedIds) {
      await deleteLead(id)
    }
    setSelectedIds(new Set())
    setBulkDeleting(false)
  }

  const handleToggleFollowupStatus = (leadId: string, status: 'Ongoing' | 'Completed') => {
    updateLead(leadId, { followup_status: status })
  }

  return (
    <div className="space-y-2">
      {/* Bulk action bar — appears when any row is selected */}
      {someSelected && canDelete && (
        <div className="flex items-center justify-between bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
          <span className="text-sm font-medium text-red-700">
            {selectedIds.size} lead{selectedIds.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              Clear selection
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {bulkDeleting ? 'Deleting...' : `Delete ${selectedIds.size} Lead${selectedIds.size > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {/* Checkbox column */}
                {canDelete && (
                  <th className="px-4 py-3 w-10" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="w-4 h-4 accent-green-600 cursor-pointer"
                      title={allSelected ? 'Deselect all' : 'Select all'}
                    />
                  </th>
                )}
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700 select-none whitespace-nowrap"
                    onClick={() => col.sortKey && onSort(col.sortKey)}
                  >
                    <div className="flex items-center gap-1.5">
                      {col.label}
                      <SortIcon column={col.sortKey} sort={sort} />
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  Follow-up Status
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (canDelete ? 3 : 2)} className="px-4 py-12 text-center text-sm text-gray-400">
                    No leads found
                  </td>
                </tr>
              ) : (
                leads.map((lead, idx) => (
                  <tr
                    key={lead.id}
                    className={`group cursor-pointer transition-colors hover:bg-gray-50 ${
                      selectedIds.has(lead.id) ? 'bg-green-50/40' : idx % 2 === 1 ? 'bg-gray-50/50' : ''
                    }`}
                    onClick={() => onRowClick(lead.id)}
                  >
                    {/* Checkbox cell */}
                    {canDelete && (
                      <td className="px-4 py-3 w-10" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(lead.id)}
                          onChange={() => toggleOne(lead.id)}
                          className="w-4 h-4 accent-green-600 cursor-pointer"
                        />
                      </td>
                    )}
                    <LeadRow
                      lead={lead}
                      onEditClick={onEditClick}
                      onDelete={onDeleteLead}
                      onToggleFollowupStatus={handleToggleFollowupStatus}
                      canDelete={canDelete}
                    />
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
