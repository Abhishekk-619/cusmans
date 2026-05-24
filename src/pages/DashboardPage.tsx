import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCRM } from '../firebase/CRMContext'
import { useAuth } from '../firebase/AuthContext'
import { useUsers } from '../firebase/useUsers'
import { categorizeFollowups, getLeadFollowupTimestamp, isLeadFollowupOverdue, getTodayString } from '../store/selectors'
import { StatusBadge } from '../components/ui/StatusBadge'
import { LEAD_STATUSES, STATUS_COLORS, type LeadStatus } from '../types'
import { parseFollowupParts } from '../utils/formatDateTime'
import type { Lead } from '../types'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function DashboardPage() {
  const { leads, updateLead, openEditModal } = useCRM()
  const { currentUser } = useAuth()
  const { teamLeads, getEmployeesUnderTeamLead, users } = useUsers()
  const navigate = useNavigate()

  const role = currentUser?.role ?? 'employee'
  const isAdmin = role === 'admin'
  const isTeamLead = role === 'team_lead'

  // Filter state
  const [selectedTeamLeadId, setSelectedTeamLeadId] = useState<string>('')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')

  // Reassign modal state
  const [reassignLead, setReassignLead] = useState<Lead | null>(null)
  const [reassignTarget, setReassignTarget] = useState<string>('')

  const today = getTodayString()

  // Determine which employees are available for the employee dropdown
  const availableEmployees = isAdmin && selectedTeamLeadId
    ? getEmployeesUnderTeamLead(selectedTeamLeadId)
    : isTeamLead
    ? getEmployeesUnderTeamLead(currentUser!.uid)
    : []

  // Determine which leads to show based on filters
  const filteredLeads = (() => {
    if (isAdmin) {
      if (selectedEmployeeId) {
        const emp = users.find((u) => u.uid === selectedEmployeeId)
        return leads.filter((l) => l.assigned_to === emp?.name || l.assigned_to === selectedEmployeeId)
      }
      if (selectedTeamLeadId) {
        const teamEmps = getEmployeesUnderTeamLead(selectedTeamLeadId)
        const empNames = teamEmps.map((e) => e.name)
        const tl = users.find((u) => u.uid === selectedTeamLeadId)
        return leads.filter((l) => empNames.includes(l.assigned_to) || l.assigned_to === tl?.name)
      }
      return leads // admin sees all
    }
    if (isTeamLead) {
      if (selectedEmployeeId) {
        const emp = users.find((u) => u.uid === selectedEmployeeId)
        return leads.filter((l) => l.assigned_to === emp?.name || l.assigned_to === selectedEmployeeId)
      }
      // Team lead sees their own team's leads
      const teamEmps = getEmployeesUnderTeamLead(currentUser!.uid)
      const empNames = teamEmps.map((e) => e.name)
      return leads.filter((l) => empNames.includes(l.assigned_to) || l.assigned_to === currentUser?.name)
    }
    // Employee sees only their own leads
    return leads.filter((l) => l.assigned_to === currentUser?.name || l.assigned_to === currentUser?.uid)
  })()

  const { today: todayLeads, overdue } = categorizeFollowups(filteredLeads, today)

  const followupLeads = [...todayLeads, ...overdue].sort((a, b) =>
    (getLeadFollowupTimestamp(a) ?? Number.MAX_SAFE_INTEGER) - (getLeadFollowupTimestamp(b) ?? Number.MAX_SAFE_INTEGER)
  )

  const stageCards = LEAD_STATUSES.map((status) => ({
    status,
    count: filteredLeads.filter((l) => l.status === status).length,
  }))

  const handleStageClick = (status: LeadStatus) => {
    navigate(`/leads?status=${encodeURIComponent(status)}`)
  }

  // Reassign lead
  const handleReassignConfirm = async () => {
    if (!reassignLead || !reassignTarget) return
    const targetUser = users.find((u) => u.uid === reassignTarget)
    if (targetUser) {
      await updateLead(reassignLead.id, {
        assigned_to: targetUser.name,
        assigned_to_uid: targetUser.uid,
      })
    }
    setReassignLead(null)
    setReassignTarget('')
  }

  // Employees available for reassignment
  const reassignableEmployees = isAdmin
    ? users.filter((u) => u.role === 'employee')
    : isTeamLead
    ? getEmployeesUnderTeamLead(currentUser!.uid)
    : []

  const filterLabel = (() => {
    if (selectedEmployeeId) {
      const emp = users.find((u) => u.uid === selectedEmployeeId)
      return `${emp?.name ?? 'Employee'}'s Pipeline`
    }
    if (selectedTeamLeadId) {
      const tl = users.find((u) => u.uid === selectedTeamLeadId)
      return `${tl?.name ?? 'Team Lead'}'s Team Pipeline`
    }
    return isTeamLead ? 'My Team Pipeline' : 'Organisation Pipeline'
  })()

  return (
    <div className="max-w-screen-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">{getGreeting()} — {filterLabel}</p>
        </div>

        {/* Filters — Admin & Team Lead only */}
        {(isAdmin || isTeamLead) && (
          <div className="flex items-center gap-3 flex-wrap">
            {/* Team Lead filter — Admin only */}
            {isAdmin && (
              <select
                value={selectedTeamLeadId}
                onChange={(e) => { setSelectedTeamLeadId(e.target.value); setSelectedEmployeeId('') }}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none bg-white"
              >
                <option value="">All Teams</option>
                {teamLeads.map((tl) => (
                  <option key={tl.uid} value={tl.uid}>{tl.name}</option>
                ))}
              </select>
            )}

            {/* Employee filter — shown when a team lead is selected (admin) or always for team lead */}
            {(isTeamLead || (isAdmin && selectedTeamLeadId)) && availableEmployees.length > 0 && (
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none bg-white"
              >
                <option value="">All Employees</option>
                {availableEmployees.map((emp) => (
                  <option key={emp.uid} value={emp.uid}>{emp.name}</option>
                ))}
              </select>
            )}

            {(selectedTeamLeadId || selectedEmployeeId) && (
              <button
                onClick={() => { setSelectedTeamLeadId(''); setSelectedEmployeeId('') }}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => navigate('/leads')}
          className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-left hover:shadow-md hover:border-green-200 transition-all">
          <p className="text-sm text-gray-500 font-medium">Total Leads</p>
          <p className="text-3xl font-bold mt-1 text-gray-900">{filteredLeads.length}</p>
        </button>
        <button onClick={() => navigate('/followups')}
          className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-left hover:shadow-md hover:border-amber-200 transition-all">
          <p className="text-sm text-gray-500 font-medium">Follow-ups Today</p>
          <p className={`text-3xl font-bold mt-1 ${todayLeads.length > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
            {todayLeads.length}
          </p>
        </button>
      </div>

      {/* Stage cards */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Lead Stages</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {stageCards.map(({ status, count }) => {
            const colors = STATUS_COLORS[status]
            return (
              <button key={status} onClick={() => handleStageClick(status)}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-left hover:shadow-md hover:border-green-200 transition-all group">
                <div className="flex items-center justify-between mb-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}>
                    {status}
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">{count}</p>
                <p className="text-xs text-gray-400 mt-0.5">leads</p>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Follow-ups Due */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Follow-ups Due
            {followupLeads.length > 0 && (
              <span className="ml-2 bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full">
                {followupLeads.length}
              </span>
            )}
          </h2>
          {followupLeads.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No follow-ups due</p>
          ) : (
            <ul className="space-y-2">
              {followupLeads.map((lead) => {
                const isOverdue = isLeadFollowupOverdue(lead)
                return (
                <li key={lead.id}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors ${
                    isOverdue
                      ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100'
                  }`}
                  onClick={() => openEditModal(lead.id)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{lead.full_name}</p>
                    <div className="text-xs text-gray-500">
                      {(() => {
                        const { date, time } = parseFollowupParts(lead.followup_date, lead.followup_time)
                        return (
                          <>
                            <p>{date}</p>
                            {time && <p className="text-gray-400">{time}</p>}
                            {isOverdue && (
                              <p className="text-amber-600 font-medium">Overdue</p>
                            )}
                          </>
                        )
                      })()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <StatusBadge status={lead.status} size="sm" />
                    {(isAdmin || isTeamLead) && reassignableEmployees.length > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setReassignLead(lead); setReassignTarget('') }}                        className="text-xs text-gray-400 hover:text-green-600 transition-colors px-1.5 py-0.5 rounded border border-gray-200 hover:border-green-300"
                        title="Reassign lead"
                      >
                        Reassign
                      </button>
                    )}
                  </div>
                </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Reassign Modal */}
      {reassignLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Reassign Lead</h2>
            <p className="text-sm text-gray-500 mb-4">
              Reassign <span className="font-medium text-gray-700">{reassignLead.full_name}</span> to:
            </p>
            <select
              value={reassignTarget}
              onChange={(e) => setReassignTarget(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none mb-4"
            >
              <option value="">— Select Employee —</option>
              {reassignableEmployees.map((emp) => (
                <option key={emp.uid} value={emp.uid}>{emp.name}</option>
              ))}
            </select>
            <div className="flex justify-end gap-3">
              <button onClick={() => setReassignLead(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleReassignConfirm} disabled={!reassignTarget}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
                Reassign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
