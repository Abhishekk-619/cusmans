import { useState, useEffect, useRef } from 'react'
import { useCRM } from '../../firebase/CRMContext'
import { searchLeads } from '../../store/selectors'
import { StatusBadge } from '../ui/StatusBadge'

export function GlobalSearch() {
  const { leads, openDrawer } = useCRM()

  const [inputValue, setInputValue] = useState('')
  const [debouncedTerm, setDebouncedTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(inputValue)
    }, 300)
    return () => clearTimeout(timer)
  }, [inputValue])

  // Show dropdown when we have a term
  useEffect(() => {
    setIsOpen(debouncedTerm.length >= 2)
  }, [debouncedTerm])

  // Outside click to dismiss
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const results = debouncedTerm.length >= 2 ? searchLeads(leads, debouncedTerm) : []

  const handleSelect = (leadId: string) => {
    openDrawer(leadId)
    setInputValue('')
    setDebouncedTerm('')
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
      setInputValue('')
      inputRef.current?.blur()
    }
  }

  return (
    <div ref={containerRef} className="relative w-72">
      {/* Input */}
      <div className="relative">
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
          ref={inputRef}
          type="text"
          placeholder="Search leads..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (debouncedTerm.length >= 2) setIsOpen(true)
          }}
          onBlur={() => {
            // Small delay so click on result fires first
            setTimeout(() => setIsOpen(false), 150)
          }}
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none bg-white"
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-100 z-50 max-h-64 overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400 text-center">No results found</div>
          ) : (
            <ul>
              {results.map((lead) => (
                <li key={lead.id}>
                  <button
                    onMouseDown={(e) => e.preventDefault()} // prevent blur before click
                    onClick={() => handleSelect(lead.id)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{lead.full_name}</p>
                      {lead.company && (
                        <p className="text-xs text-gray-500 truncate">{lead.company}</p>
                      )}
                    </div>
                    <div className="ml-3 flex-shrink-0">
                      <StatusBadge status={lead.status} size="sm" />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
