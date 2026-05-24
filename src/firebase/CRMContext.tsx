import { createContext, useContext, useState, type ReactNode } from 'react'
import { useLeads, useActivities, addLead, updateLead, deleteLead, addActivity } from './useLeads'
import { useAuth } from './AuthContext'
import { useUsers } from './useUsers'
import type { Lead, Activity } from '../types'

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
