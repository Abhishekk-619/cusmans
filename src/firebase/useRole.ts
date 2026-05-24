import { useAuth } from './AuthContext'

export function useRole() {
  const { currentUser } = useAuth()
  const role = currentUser?.role ?? 'employee'

  return {
    role,
    isAdmin: role === 'admin',
    isTeamLead: role === 'team_lead',
    isEmployee: role === 'employee',
    isTeamLeadOrAbove: role === 'admin' || role === 'team_lead',
    canDeleteLeads: role === 'admin' || role === 'team_lead',
    canEditAnyLead: role === 'admin' || role === 'team_lead',
    canAddLeads: true, // all roles can add leads
    canManageUsers: role === 'admin',
  }
}
