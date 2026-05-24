import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from './config'
import type { AppUser } from './AuthContext'

export function useUsers() {
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const data: AppUser[] = snapshot.docs.map((d) => ({
        uid: d.id,
        ...(d.data() as Omit<AppUser, 'uid'>),
      }))
      setUsers(data)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const teamLeads = users.filter((u) => u.role === 'team_lead')
  const employees = users.filter((u) => u.role === 'employee')

  const getEmployeesUnderTeamLead = (teamLeadId: string) =>
    employees.filter((u) => u.team_lead_id === teamLeadId)

  return { users, teamLeads, employees, getEmployeesUnderTeamLead, loading }
}
