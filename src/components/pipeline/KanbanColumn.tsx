import { useDroppable } from '@dnd-kit/core'
import { LeadCard } from './LeadCard'
import type { Lead, LeadStatus } from '../../types'

interface KanbanColumnProps {
  status: LeadStatus
  leads: Lead[]
  onCardClick: (leadId: string) => void
}

export function KanbanColumn({ status, leads, onCardClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div className="min-w-[240px] max-w-[280px] flex flex-col">
      {/* Column header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs font-semibold text-gray-600 truncate">{status}</span>
        <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full ml-2 flex-shrink-0">
          {leads.length}
        </span>
      </div>

      {/* Column body */}
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-xl p-3 space-y-2 min-h-[200px] transition-colors ${
          isOver
            ? 'bg-green-50/60 ring-2 ring-green-200'
            : 'bg-gray-50/50'
        }`}
      >
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onClick={() => onCardClick(lead.id)}
          />
        ))}
        {leads.length === 0 && (
          <div className="flex items-center justify-center h-16 text-xs text-gray-300">
            Drop here
          </div>
        )}
      </div>
    </div>
  )
}
