import { createContext, useContext, useState, type ReactNode } from 'react'
import { useLeads, useActivities, addLead, updateLead, deleteLead, addActivity } from './useLeads'
import { useAuth } from './AuthContext'
import { useUsers } from './useUsers'
import { doc, updateDoc, arrayUnion } from 'firebase/firestore'
import { db } from './config'
import type { Lead, Activity, FollowupNote } from '../types'

interface CRMContextValue {
  leads: Lead[]
  activities: Activity[]
  leadsLoading: boolean
  openDrawerLeadId: string | null
  openDrawerInEditMode: boolean
  openDrawer: (leadId: string, editMode?: boolean) => void
  closeDrawer: () => void
  // Global edit modal — used everywhere a lead is clicked
  editModalLeadId: string | null
  openEditModal: (leadId: string) => void
  closeEditModal: () => void
  addLead: (data: Omit<Lead, 'id' | 'created_at'>) => Promise<void>
  updateLead: (id: string, updates: Partial<Lead>) => Promise<void>
  deleteLead: (id: string) => Promise<void>
  addActivity: (data: Omit<Activity, 'id' | 'created_at'>) => Promise<void>
  addFollowupNote: (leadId: string, note: Omit<FollowupNote, 'id' | 'created_at' | 'added_by_uid' | 'added_by_name'>) => Promise<void>
}

const CRMContext = createContext<CRMContextValue | null>(null)

export function CRMProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth()
  const { getEmployeesUnderTeamLead } = useUsers()

  // For team leads, get the names of their team members so we can filter leads
  const teamMemberNames =
    currentUser?.role === 'team_lead'
      ? getEmployeesUnderTeamLead(currentUser.uid).map((e) => e.name)
      : []

  const teamMemberUids =
    currentUser?.role === 'team_lead'
      ? getEmployeesUnderTeamLead(currentUser.uid).map((e) => e.uid)
      : []

  const { leads, loading: leadsLoading } = useLeads(currentUser, teamMemberNames, teamMemberUids)
  const { activities } = useActivities()
  const [openDrawerLeadId, setOpenDrawerLeadId] = useState<string | null>(null)
  const [openDrawerInEditMode, setOpenDrawerInEditMode] = useState(false)
  const [editModalLeadId, setEditModalLeadId] = useState<string | null>(null)

  const handleUpdateLead = async (id: string, updates: Partial<Lead>) => {
    const prev = leads.find((l) => l.id === id)
    await updateLead(id, updates, prev, currentUser)
  }

  return (
    <CRMContext.Provider
      value={{
        leads,
        activities,
        leadsLoading,
        openDrawerLeadId,
        openDrawerInEditMode,
        openDrawer: (id, editMode = false) => {
          setOpenDrawerLeadId(id)
          setOpenDrawerInEditMode(editMode)
        },
        closeDrawer: () => {
          setOpenDrawerLeadId(null)
          setOpenDrawerInEditMode(false)
        },
        editModalLeadId,
        openEditModal: (id) => setEditModalLeadId(id),
        closeEditModal: () => setEditModalLeadId(null),
        addLead: async (data) => {
          // For employees, always assign to themselves — override any form value
          const enrichedData = currentUser?.role === 'employee'
            ? { ...data, assigned_to: currentUser.name, assigned_to_uid: currentUser.uid }
            : data
          const result = await addLead(enrichedData, leads, currentUser?.uid)
          if (!result.success) throw new Error(result.error)
        },
        updateLead: handleUpdateLead,
        deleteLead: async (id) => { await deleteLead(id) },
        addActivity: async (data) => {
          await addActivity({
            ...data,
            performed_by_uid: currentUser?.uid,
            performed_by_name: currentUser?.name,
            performed_by_role: currentUser?.role,
          })
        },
        addFollowupNote: async (leadId, noteData) => {
          if (!currentUser) return
          const entry: FollowupNote = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
            note: noteData.note,
            date: noteData.date,
            time: noteData.time,
            added_by_uid: currentUser.uid,
            added_by_name: currentUser.name,
            created_at: new Date().toISOString(),
          }
          const ref = doc(db, 'leads', leadId)
          await updateDoc(ref, { followup_notes: arrayUnion(entry) })
          // Log as activity
          await addActivity({
            lead_id: leadId,
            activity_type: 'Follow-up Update',
            description: `Follow-up note added: "${noteData.note.slice(0, 80)}${noteData.note.length > 80 ? '...' : ''}"`,
            performed_by_uid: currentUser.uid,
            performed_by_name: currentUser.name,
            performed_by_role: currentUser.role,
          })
        },
      }}
    >
      {children}
    </CRMContext.Provider>
  )
}

export function useCRM() {
  const ctx = useContext(CRMContext)
  if (!ctx) throw new Error('useCRM must be used within CRMProvider')
  return ctx
}
