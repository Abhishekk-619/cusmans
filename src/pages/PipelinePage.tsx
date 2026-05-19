import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useCRMStore } from '../store/useCRMStore'
import { getLeadsByStatus } from '../store/selectors'
import { KanbanColumn } from '../components/pipeline/KanbanColumn'
import { LeadCard } from '../components/pipeline/LeadCard'
import { LEAD_STATUSES, LOST_REASONS, type LeadStatus, type LostReason } from '../types'

export function PipelinePage() {
  const leads = useCRMStore((s) => s.leads)
  const updateLead = useCRMStore((s) => s.updateLead)
  const openDrawer = useCRMStore((s) => s.openDrawer)

  const [activeLeadId, setActiveLeadId] = useState<string | null>(null)

  // Lost reason modal state
  const [lostModal, setLostModal] = useState<{ leadId: string } | null>(null)
  const [lostReason, setLostReason] = useState<LostReason>('Not Eligible')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const activeLead = activeLeadId ? leads.find((l) => l.id === activeLeadId) : null

  const handleDragStart = (event: DragStartEvent) => {
    setActiveLeadId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveLeadId(null)
    if (!over) return

    const leadId = active.id as string
    const newStatus = over.id as LeadStatus
    const lead = leads.find((l) => l.id === leadId)
    if (!lead || lead.status === newStatus || !LEAD_STATUSES.includes(newStatus)) return

    if (newStatus === 'Lost') {
      // Show reason modal before committing the status change
      setLostReason('Not Eligible')
      setLostModal({ leadId })
    } else {
      updateLead(leadId, { status: newStatus })
    }
  }

  const confirmLost = () => {
    if (!lostModal) return
    updateLead(lostModal.leadId, { status: 'Lost', lost_reason: lostReason })
    setLostModal(null)
  }

  const cancelLost = () => setLostModal(null)

  return (
    <div className="max-w-screen-2xl mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Progress Board</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track lead movement and progress</p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-row gap-4 overflow-x-auto pb-4">
          {LEAD_STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              leads={getLeadsByStatus(leads, status)}
              onCardClick={(id) => openDrawer(id)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeLead ? (
            <LeadCard lead={activeLead} onClick={() => {}} isDragging />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Lost Reason Modal */}
      {lostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Mark as Lost</h2>
            <p className="text-sm text-gray-500 mb-4">Select a reason for losing this lead.</p>

            <label className="block text-xs font-medium text-gray-600 mb-1">Reason</label>
            <select
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value as LostReason)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
            >
              {LOST_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={cancelLost}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmLost}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
              >
                Confirm Lost
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
