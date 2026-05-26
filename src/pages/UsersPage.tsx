import { useState } from 'react'
import { doc, setDoc, deleteDoc } from 'firebase/firestore'
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth'
import { db, secondaryAuth } from '../firebase/config'
import { useRole } from '../firebase/useRole'
import { useUsers } from '../firebase/useUsers'
import { useNavigate } from 'react-router-dom'
import type { UserRole } from '../firebase/AuthContext'
import { isAllowedEmailDomain, ALLOWED_DOMAINS_DISPLAY } from '../utils/emailValidation'
import { getAuthErrorMessage } from '../utils/authErrors'

export function UsersPage() {
  const { isAdmin } = useRole()
  const navigate = useNavigate()
  const { users, teamLeads, getEmployeesUnderTeamLead, loading } = useUsers()

  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '', email: '', password: '',
    role: 'employee' as UserRole,
    team_lead_id: '',
  })
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  if (!isAdmin) { navigate('/dashboard'); return null }

  const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none'

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')
    setFormLoading(true)
    try {
      // Domain validation
      if (!isAllowedEmailDomain(formData.email)) {
        setFormError(`Only company emails are allowed (${ALLOWED_DOMAINS_DISPLAY})`)
        setFormLoading(false)
        return
      }

      const cred = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password)

      // Send verification email before signing out of secondary auth
      try {
        await sendEmailVerification(cred.user)
      } catch {
        // Rate-limited or already sent — ignore
      }
      await secondaryAuth.signOut()

      const userData: Record<string, unknown> = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
      }
      if (formData.role === 'employee' && formData.team_lead_id) {
        userData.team_lead_id = formData.team_lead_id
      }
      await setDoc(doc(db, 'users', cred.user.uid), userData)
      setFormData({ name: '', email: '', password: '', role: 'employee', team_lead_id: '' })
      setFormSuccess(`User created! A verification email has been sent to ${formData.email}. They must verify before they can sign in.`)
      setShowAddForm(false)
    } catch (err: unknown) {
      setFormError(getAuthErrorMessage(err))
    } finally {
      setFormLoading(false)
    }
  }

  const handleAssignTeamLead = async (employeeUid: string, teamLeadId: string) => {
    await setDoc(doc(db, 'users', employeeUid), { team_lead_id: teamLeadId || null }, { merge: true })
  }

  const handleRoleChange = async (uid: string, newRole: UserRole) => {
    await setDoc(doc(db, 'users', uid), { role: newRole }, { merge: true })
  }

  const handleDeleteUser = async (uid: string, name: string) => {
    if (!window.confirm(`Remove "${name}"? They will no longer be able to log in.`)) return
    await deleteDoc(doc(db, 'users', uid))
  }

  const roleBadge = (role: UserRole) => ({
    admin: 'bg-purple-100 text-purple-700',
    team_lead: 'bg-blue-100 text-blue-700',
    employee: 'bg-gray-100 text-gray-700',
  }[role] ?? 'bg-gray-100 text-gray-700')

  const adminUsers = users.filter((u) => u.role === 'admin')
  const employees = users.filter((u) => u.role === 'employee')

  return (
    <div className="max-w-screen-lg mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage team members, roles and assignments</p>
        </div>
        <button onClick={() => setShowAddForm(true)}
          className="bg-green-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-green-700 transition-colors">
          + Add User
        </button>
      </div>

      {/* Success message */}
      {formSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800 flex items-start gap-2">
          <span className="mt-0.5">✅</span>
          <span>{formSuccess}</span>
        </div>
      )}

      {/* Add User Form */}
      {showAddForm && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Add New User</h2>
          <p className="text-xs text-gray-500 mb-4">Only <strong>{ALLOWED_DOMAINS_DISPLAY}</strong> email addresses are allowed. A verification email will be sent automatically.</p>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
                <input type="text" required value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Smith" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input type="email" required value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@beyondsure.com" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
                <input type="password" required minLength={6} value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Min 6 characters" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                <select value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole, team_lead_id: '' })}
                  className={inputClass}>
                  <option value="employee">Employee</option>
                  <option value="team_lead">Team Lead</option>
                </select>
              </div>
              {formData.role === 'employee' && (
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Assign to Team Lead</label>
                  <select value={formData.team_lead_id}
                    onChange={(e) => setFormData({ ...formData, team_lead_id: e.target.value })}
                    className={inputClass}>
                    <option value="">— No Team Lead —</option>
                    {teamLeads.map((tl) => (
                      <option key={tl.uid} value={tl.uid}>{tl.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            {formError && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{formError}</p>
            )}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => { setShowAddForm(false); setFormError('') }}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={formLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
                {formLoading ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center text-sm text-gray-400 py-8">Loading users...</div>
      ) : (
        <>
          {/* Admin section */}
          {adminUsers.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Admin</h2>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminUsers.map((u) => (
                      <tr key={u.uid} className="border-t border-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadge(u.role)}`}>
                            Admin
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Team Leads + their employees */}
          {teamLeads.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Teams</h2>
              <div className="space-y-4">
                {teamLeads.map((tl) => {
                  const teamEmployees = getEmployeesUnderTeamLead(tl.uid)
                  return (
                    <div key={tl.uid} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                      {/* Team Lead row */}
                      <div className="flex items-center justify-between px-4 py-3 bg-blue-50/50 border-b border-blue-100">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">
                            Team Lead
                          </span>
                          <span className="text-sm font-semibold text-gray-900">{tl.name}</span>
                          <span className="text-xs text-gray-500">{tl.email}</span>
                        </div>
                        <button onClick={() => handleDeleteUser(tl.uid, tl.name)}
                          className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors">
                          Remove
                        </button>
                      </div>
                      {/* Employees under this team lead */}
                      {teamEmployees.length === 0 ? (
                        <div className="px-4 py-3 text-xs text-gray-400 italic">No employees assigned yet</div>
                      ) : (
                        <table className="w-full text-left">
                          <tbody>
                            {teamEmployees.map((emp) => (
                              <tr key={emp.uid} className="border-t border-gray-50 hover:bg-gray-50">
                                <td className="px-8 py-2.5 text-sm text-gray-900">{emp.name}</td>
                                <td className="px-4 py-2.5 text-sm text-gray-500">{emp.email}</td>
                                <td className="px-4 py-2.5">
                                  <select value={emp.team_lead_id ?? ''}
                                    onChange={(e) => handleAssignTeamLead(emp.uid, e.target.value)}
                                    className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-700 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none">
                                    <option value="">— Unassign —</option>
                                    {teamLeads.map((t) => (
                                      <option key={t.uid} value={t.uid}>{t.name}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-4 py-2.5">
                                  <button onClick={() => handleDeleteUser(emp.uid, emp.name)}
                                    className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors">
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Unassigned employees */}
          {employees.filter((e) => !e.team_lead_id).length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Unassigned Employees</h2>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <tbody>
                    {employees.filter((e) => !e.team_lead_id).map((emp) => (
                      <tr key={emp.uid} className="border-t border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{emp.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{emp.email}</td>
                        <td className="px-4 py-3">
                          <select value={emp.team_lead_id ?? ''}
                            onChange={(e) => handleAssignTeamLead(emp.uid, e.target.value)}
                            className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-700 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none">
                            <option value="">— Assign to Team Lead —</option>
                            {teamLeads.map((t) => (
                              <option key={t.uid} value={t.uid}>{t.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => handleDeleteUser(emp.uid, emp.name)}
                            className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors">
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
