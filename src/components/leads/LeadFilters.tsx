import { useEffect, useRef, useState } from 'react'
import { LEAD_STATUSES, LEAD_SOURCES, type LeadFilters as LeadFiltersType } from '../../types'

interface LeadFiltersProps {
  filters: LeadFiltersType
  onChange: (filters: LeadFiltersType) => void
  showAssignedFilter?: boolean
  employeeOptions?: Array<{ uid: string; name: string }>
}

const selectClass =
  'rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none bg-white'

export function LeadFilters({
  filters,
  onChange,
  showAssignedFilter = true,
  employeeOptions = [],
}: LeadFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.searchTerm)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onChange({ ...filters, searchTerm: searchInput })
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchInput]) // eslint-disable-line react-hooks/exhaustive-deps

  const hasActiveFilters =
    filters.searchTerm ||
    filters.status ||
    filters.source ||
    filters.assignedTo ||
    filters.followupDate

  const clearFilters = () => {
    setSearchInput('')
    onChange({ searchTerm: '', status: '', source: '', assignedTo: '', followupDate: '' })
  }

  return (
    <div className="flex flex-wrap items-center gap-2 bg-white rounded-lg border border-gray-100 shadow-sm p-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search leads..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
        />
      </div>

      {/* Status filter */}
      <select
        value={filters.status}
        onChange={(e) => onChange({ ...filters, status: e.target.value as LeadFiltersType['status'] })}
        className={selectClass}
      >
        <option value="">All Statuses</option>
        {LEAD_STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      {/* Type filter */}
      <select
        value={filters.source}
        onChange={(e) => onChange({ ...filters, source: e.target.value as LeadFiltersType['source'] })}
        className={selectClass}
      >
        <option value="">All Types</option>
        {LEAD_SOURCES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      {/* Assigned To */}
      {showAssignedFilter && (
        <select
          value={filters.assignedTo}
          onChange={(e) => onChange({ ...filters, assignedTo: e.target.value })}
          className={`${selectClass} min-w-[160px]`}
        >
          <option value="">All Employees</option>
          {employeeOptions.map((employee) => (
            <option key={employee.uid} value={employee.name}>{employee.name}</option>
          ))}
        </select>
      )}

      {/* Follow-up Date */}
      <input
        type="date"
        value={filters.followupDate}
        onChange={(e) => onChange({ ...filters, followupDate: e.target.value })}
        className={selectClass}
      />

      {/* Clear */}
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="text-sm text-green-600 hover:text-green-800 font-medium px-2 py-1 rounded transition-colors"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
