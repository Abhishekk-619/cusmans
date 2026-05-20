import { LeadRow } from './LeadRow'
import { useCRMStore } from '../../store/useCRMStore'
import type { Lead, SortConfig } from '../../types'

interface LeadTableProps {
  leads: Lead[]
  sort: SortConfig
  onSort: (column: SortConfig['column']) => void
  onRowClick: (leadId: string) => void
  onDeleteLead: (leadId: string) => void
}

const columns: { key: SortConfig['column']; label: string }[] = [
  { key: 'created_at', label: 'Created Date' },
  { key: 'created_at', label: 'Created Time' },
  { key: 'full_name', label: 'Lead Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'company', label: 'Company' },
  { key: 'lead_source', label: 'Type of Business' },
  { key: 'status', label: 'Status' },
  { key: 'assigned_to', label: 'Assigned To' },
  { key: 'followup_date', label: 'Follow-up Date' },
]

function SortIcon({ column, sort }: { column: SortConfig['column']; sort: SortConfig }) {
  if (sort.column !== column) {
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

export function LeadTable({ leads, sort, onSort, onRowClick, onDeleteLead }: LeadTableProps) {
  const updateLead = useCRMStore((s) => s.updateLead)

  const handleToggleFollowupStatus = (leadId: string, status: 'Ongoing' | 'Completed') => {
    updateLead(leadId, { followup_status: status })
  }
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700 select-none whitespace-nowrap"
                  onClick={() => onSort(col.key)}
                >
                  <div className="flex items-center gap-1.5">
                    {col.label}
                    <SortIcon column={col.key} sort={sort} />
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
                <td colSpan={columns.length + 2} className="px-4 py-12 text-center text-sm text-gray-400">
                  No leads found
                </td>
              </tr>
            ) : (
              leads.map((lead, idx) => (
                <tr
                  key={lead.id}
                  className={`group cursor-pointer transition-colors hover:bg-gray-50 ${idx % 2 === 1 ? 'bg-gray-50/50' : ''}`}
                  onClick={() => onRowClick(lead.id)}
                >
                  <LeadRow
                    lead={lead}
                    onRowClick={onRowClick}
                    onDelete={onDeleteLead}
                    onToggleFollowupStatus={handleToggleFollowupStatus}
                  />
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
