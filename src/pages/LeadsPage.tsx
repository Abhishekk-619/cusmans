import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCRM } from '../firebase/CRMContext'
import { useRole } from '../firebase/useRole'
import { useAuth } from '../firebase/AuthContext'
import { useUsers } from '../firebase/useUsers'
import { applyFiltersAndSort } from '../store/selectors'
import { LeadFilters } from '../components/leads/LeadFilters'
import { LeadTable } from '../components/leads/LeadTable'
import { AddLeadModal } from '../components/leads/AddLeadModal'
import { EditLeadModal } from '../components/leads/EditLeadModal'
import * as XLSX from 'xlsx'
import type { LeadFilters as LeadFiltersType, SortConfig, LeadStatus, Lead } from '../types'

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
  const { leads, deleteLead } = useCRM()
  const { canDeleteLeads, isAdmin, isTeamLead } = useRole()
  const { currentUser } = useAuth()
  const { employees, getEmployeesUnderTeamLead } = useUsers()

  const [searchParams] = useSearchParams()
  const [filters, setFilters] = useState<LeadFiltersType>(() => ({
    ...defaultFilters,
    status: (searchParams.get('status') as LeadStatus | null) ?? '',
  }))
  const [sort, setSort] = useState<SortConfig>(defaultSort)
  const [addLeadOpen, setAddLeadOpen] = useState(false)
  const [editLead, setEditLead] = useState<Lead | null>(null)

  useEffect(() => {
    const statusParam = searchParams.get('status') as LeadStatus | null
    if (statusParam) {
      setFilters((prev) => ({ ...prev, status: statusParam }))
    }
  }, [searchParams])

  const filteredLeads = applyFiltersAndSort(leads, filters, sort)
  const canExportLeads = isAdmin || isTeamLead

  const assignableEmployees = isAdmin
    ? employees
    : isTeamLead && currentUser
    ? getEmployeesUnderTeamLead(currentUser.uid)
    : []

  const handleDelete = (leadId: string) => {
    if (!canDeleteLeads) return
    const lead = leads.find((l) => l.id === leadId)
    if (!lead) return
    if (window.confirm(`Delete lead "${lead.full_name}"? This cannot be undone.`)) {
      deleteLead(leadId)
    }
  }

  const handleEditClick = (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId)
    if (lead) setEditLead(lead)
  }

  const handleSort = (column: SortConfig['column']) => {
    setSort((prev) =>
      prev.column === column
        ? { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { column, direction: 'asc' }
    )
  }

  const handleExport = () => {
    try {
      const leadsToExport = filteredLeads.length > 0 ? filteredLeads : leads

      const rows = leadsToExport.map((lead) => ({
        'Lead Name': lead.full_name,
        Phone: lead.phone,
        Email: lead.email,
        Company: lead.company,
        'Type of Business': lead.business_type ?? '',
        'Lead Source': lead.lead_source,
        Status: lead.status,
        'Assigned To': lead.assigned_to,
        'Follow-up Date': lead.followup_date ?? '',
        'Follow-up Time': lead.followup_time ?? '',
        'Follow-up Status': lead.followup_status ?? '',
        'Website Link': lead.website_link ?? '',
        Notes: lead.notes,
        'Created At': lead.created_at,
      }))

      if (rows.length === 0) {
        alert('No leads to export.')
        return
      }

      const worksheet = XLSX.utils.json_to_sheet(rows)

      // Auto-size columns based on header + data widths
      const colKeys = Object.keys(rows[0])
      worksheet['!cols'] = colKeys.map((key) => {
        const maxLen = Math.max(
          key.length,
          ...rows.map((r) => String((r as Record<string, string>)[key] ?? '').length)
        )
        return { wch: Math.min(maxLen + 2, 40) }
      })

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads')

      XLSX.writeFile(workbook, `leads-export-${new Date().toISOString().slice(0, 10)}.xlsx`)
    } catch (err) {
      console.error('Export failed:', err)
      alert('Export failed. Please try again.')
    }
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
        <div className="flex items-center gap-3">
          {canExportLeads && (
            <button
              onClick={handleExport}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Export
            </button>
          )}
          <button
            onClick={() => setAddLeadOpen(true)}
            className="bg-green-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-green-700 transition-colors"
          >
            + Add Lead
          </button>
        </div>
      </div>

      {/* Filters */}
      <LeadFilters
        filters={filters}
        onChange={setFilters}
        showAssignedFilter={isAdmin || isTeamLead}
        employeeOptions={assignableEmployees}
      />

      {/* Table */}
      <LeadTable
        leads={filteredLeads}
        sort={sort}
        onSort={handleSort}
        onRowClick={handleEditClick}
        onEditClick={handleEditClick}
        onDeleteLead={handleDelete}
        canDelete={canDeleteLeads}
      />

      <AddLeadModal isOpen={addLeadOpen} onClose={() => setAddLeadOpen(false)} />
      <EditLeadModal lead={editLead} onClose={() => setEditLead(null)} />
    </div>
  )
}
