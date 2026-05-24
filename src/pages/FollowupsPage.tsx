import { useCRM } from '../firebase/CRMContext'
import { categorizeFollowups, getTodayString } from '../store/selectors'
import { FollowupSection } from '../components/followups/FollowupSection'

export function FollowupsPage() {
  const { leads, updateLead, addActivity, openEditModal } = useCRM()

  const today = getTodayString()
  const { today: todayLeads, upcoming, overdue } = categorizeFollowups(leads, today)

  const handleMarkComplete = (leadId: string) => {
    updateLead(leadId, { followup_date: null, followup_status: 'Completed' })
    addActivity({
      lead_id: leadId,
      activity_type: 'Follow-up Update',
      description: 'Follow-up marked as complete',
    })
  }

  const handleReschedule = (leadId: string, newDate: string) => {
    updateLead(leadId, { followup_date: newDate })
  }

  return (
    <div className="max-w-screen-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Follow-ups</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track and manage your scheduled follow-ups</p>
      </div>

      <FollowupSection
        title="Today"
        leads={todayLeads}
        isOverdue={false}
        onMarkComplete={handleMarkComplete}
        onReschedule={handleReschedule}
        onLeadClick={(id) => openEditModal(id)}
      />

      <FollowupSection
        title="Overdue"
        leads={overdue}
        isOverdue={true}
        onMarkComplete={handleMarkComplete}
        onReschedule={handleReschedule}
        onLeadClick={(id) => openEditModal(id)}
      />

      <FollowupSection
        title="Upcoming"
        leads={upcoming}
        isOverdue={false}
        onMarkComplete={handleMarkComplete}
        onReschedule={handleReschedule}
        onLeadClick={(id) => openEditModal(id)}
      />
    </div>
  )
}
