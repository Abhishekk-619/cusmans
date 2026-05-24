import { useEffect, useState } from 'react'
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from 'firebase/firestore'
import { db } from './config'
import type { Lead, Activity } from '../types'
import type { AppUser } from './AuthContext'

// ─── Leads ────────────────────────────────────────────────────────────────────

export function useLeads(currentUser: AppUser | null, teamMemberNames: string[] = [], teamMemberUids: string[] = []) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser) {
      setLeads([])
      setLoading(false)
      return
    }

    const q = query(collection(db, 'leads'), orderBy('created_at', 'desc'))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let data: Lead[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Lead, 'id'>),
      }))

      if (currentUser.role === 'employee') {
        // Show only leads currently assigned to the employee
        data = data.filter((l) => {
          return (
            l.assigned_to_uid === currentUser.uid ||
            l.assigned_to === currentUser.name ||
            l.assigned_to === currentUser.uid  // fallback: some old leads stored UID in assigned_to
          )
        })
      } else if (currentUser.role === 'team_lead') {
        const allowedUids = new Set([currentUser.uid, ...teamMemberUids])
        const allowedNames = new Set([currentUser.name, ...teamMemberNames])
        data = data.filter(
          (l) => {
            const byUid = l.assigned_to_uid && allowedUids.has(l.assigned_to_uid)
            const byName = allowedNames.has(l.assigned_to)
            return byUid || byName
          }
        )
      }
      // Admin sees all

      setLeads(data)
      setLoading(false)
    }, (error) => {
      console.error('Leads query error:', error)
      setLeads([])
      setLoading(false)
    })

    return unsubscribe
  }, [currentUser?.uid, currentUser?.role, currentUser?.name, teamMemberUids.join(',')])

  return { leads, loading }
}

export async function addLead(
  data: Omit<Lead, 'id' | 'created_at'>,
  existingLeads: Lead[] = [],
  createdByUid?: string
): Promise<{ success: boolean; error?: string }> {
  if (!data.full_name || !data.full_name.trim()) {
    return { success: false, error: 'Full name is required' }
  }

  // Duplicate phone check
  if (data.phone) {
    const dupPhone = existingLeads.find((l) => l.phone && l.phone === data.phone)
    if (dupPhone) {
      return {
        success: false,
        error: `Phone ${data.phone} already exists for lead "${dupPhone.full_name}"`,
      }
    }
  }

  // Duplicate email check
  if (data.email) {
    const dupEmail = existingLeads.find(
      (l) => l.email && l.email.toLowerCase() === data.email.toLowerCase()
    )
    if (dupEmail) {
      return {
        success: false,
        error: `Email ${data.email} already exists for lead "${dupEmail.full_name}"`,
      }
    }
  }

  await addDoc(collection(db, 'leads'), {
    ...data,
    status: data.status ?? 'New Lead',
    created_at: new Date().toISOString(),
    created_by_uid: createdByUid ?? '',
  })
  return { success: true }
}

export async function updateLead(
  id: string,
  updates: Partial<Lead>,
  prevLead?: Lead,
  actor?: AppUser | null
): Promise<void> {
  const ref = doc(db, 'leads', id)
  await updateDoc(ref, { ...updates })

  if (prevLead) {
    if (updates.status && updates.status !== prevLead.status) {
      await addActivity({
        lead_id: id,
        activity_type: 'Status Update',
        description: `Status changed from "${prevLead.status}" to "${updates.status}"`,
        performed_by_uid: actor?.uid,
        performed_by_name: actor?.name,
        performed_by_role: actor?.role,
      })
    }
    if ('followup_date' in updates && updates.followup_date !== prevLead.followup_date) {
      await addActivity({
        lead_id: id,
        activity_type: 'Follow-up Update',
        description: updates.followup_date
          ? `Follow-up scheduled for ${updates.followup_date}`
          : 'Follow-up date cleared',
        performed_by_uid: actor?.uid,
        performed_by_name: actor?.name,
        performed_by_role: actor?.role,
      })
    }
  }
}

export async function deleteLead(id: string): Promise<void> {
  await deleteDoc(doc(db, 'leads', id))
}

// ─── Activities ───────────────────────────────────────────────────────────────

export function useActivities() {
  const [activities, setActivities] = useState<Activity[]>([])

  useEffect(() => {
    const q = query(collection(db, 'activities'), orderBy('created_at', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Activity[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Activity, 'id'>),
      }))
      setActivities(data)
    })
    return unsubscribe
  }, [])

  return { activities }
}

export async function addActivity(
  data: Omit<Activity, 'id' | 'created_at'>
): Promise<void> {
  await addDoc(collection(db, 'activities'), {
    ...data,
    created_at: new Date().toISOString(),
  })
}
