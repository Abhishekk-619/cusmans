import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCRMStore } from '../store/useCRMStore'
import { applyFiltersAndSort } from '../store/selectors'
import { LeadFilters } from '../components/leads/LeadFilters'
import { LeadTable } from '../components/leads/LeadTable'
import { AddLeadModal } from '../components/leads/AddLeadModal'
import type { LeadFilters as LeadFiltersType, SortConfig, LeadStatus } from '../types'

const defaultFilters: LeadFiltersType = {
  searchTerm: '',
  status: '',
  source: '',
  assignedTo: '',
  followupDate: '',
}

const defaultSort: SortConfig = {
  column: 'created_at',
  direction: 'desc',
}

export function LeadsPage() {
  const leads = useCRMStore((s) => s.leads)
  const deleteLead = useCRMStore((s) => s.deleteLead)
  const openDrawer = useCRMStore((s) => s.openDrawer)

  const [searchParams] = useSearchParams()

  const [filters, setFilters] = useState<LeadFiltersType>(() => ({
    ...defaultFilters,
    status: (searchParams.get('status') as LeadStatus | null) ?? '',
  }))
  const [sort, setSort] = useState<SortConfig>(defaultSort)
  const [addLeadOpen, setAddLeadOpen] = useState(false)

  // Sync filter when URL param changes (e.g. navigating from dashboard)
  useEffect(() => {
    const statusParam = searchParams.get('status') as LeadStatus | null
    if (statusParam) {
      setFilters((prev) => ({ ...prev, status: statusParam }))
    }
  }, [searchParams])

  const filteredLeads = applyFiltersAndSort(leads, filters, sort)

  const handleDelete = (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId)
    if (!lead) return
    if (window.confirm(`Delete lead "${lead.full_name}"? This cannot be undone.`)) {
      deleteLead(leadId)
    }
  }

  const handleSort = (column: SortConfig['column']) => {
    setSort((prev) =>
      prev.column === column
        ? { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { column, direction: 'asc' }
    )
  }

  return (
    <div className="max-w-screen-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-1 rounded-full">
            {filteredLeads.length}
          </span>
        </div>
        <button
          onClick={() => setAddLeadOpen(true)}
          className="bg-green-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-green-700 transition-colors"
        >
          + Add Lead
        </button>
      </div>

      {/* Filters */}
      <LeadFilters filters={filters} onChange={setFilters} />

      {/* Table */}
      <LeadTable
        leads={filteredLeads}
        sort={sort}
        onSort={handleSort}
        onRowClick={(id) => openDrawer(id)}
        onDeleteLead={handleDelete}
      />

      <AddLeadModal isOpen={addLeadOpen} onClose={() => setAddLeadOpen(false)} />
    </div>
  )
}
