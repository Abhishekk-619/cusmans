import { useState } from 'react'
import { doc, setDoc, deleteDoc } from 'firebase/firestore'
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth'
import { db, secondaryAuth } from '../firebase/config'
import { useAuth } from '../firebase/AuthContext'
import { useUsers } from '../firebase/useUsers'
import { useRole } from '../firebase/useRole'
import { useNavigate } from 'react-router-dom'
import { isAllowedEmailDomain, ALLOWED_DOMAINS_DISPLAY } from '../utils/emailValidation'
import { getAuthErrorMessage } from '../utils/authErrors'

export function MyTeamPage() {
  const { currentUser } = useAuth()
  const { isTeamLead, isAdmin } = useRole()
  const { getEmployeesUnderTeamLead, loading } = useUsers()
  const navigate = useNavigate()

  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', password: '' })
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  if (!isTeamLead && !isAdmin) { navigate('/dashboard'); return null }

  const myEmployees = currentUser ? getEmployeesUnderTeamLead(currentUser.uid) : []

  const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none'

  const handleAddEmployee = async (e: React.FormEvent) => {
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

      await setDoc(doc(db, 'users', cred.user.uid), {
        name: formData.name,
        email: formData.email,
        role: 'employee',
        team_lead_id: currentUser!.uid,
      })
      setFormData({ name: '', email: '', password: '' })
      setFormSuccess(`Employee created! A verification email has been sent to ${formData.email}. They must verify before they can sign in.`)
      setShowAddForm(false)
    } catch (err: unknown) {
      setFormError(getAuthErrorMessage(err))
    } finally {
      setFormLoading(false)
    }
  }

  const handleRemoveEmployee = async (uid: string, name: string) => {
    if (!window.confirm(`Remove "${name}" from your team? They will no longer be able to log in.`)) return
    await deleteDoc(doc(db, 'users', uid))
  }

  return (
    <div className="max-w-screen-md mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Team</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage employees in your team
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-green-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-green-700 transition-colors"
        >
          + Add Employee
        </button>
      </div>

      {/* Success message */}
      {formSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800 flex items-start gap-2">
          <span className="mt-0.5">✅</span>
          <span>{formSuccess}</span>
        </div>
      )}

      {/* Add Employee Form */}
      {showAddForm && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Add New Employee</h2>
          <p className="text-xs text-gray-500 mb-4">Only <strong>{ALLOWED_DOMAINS_DISPLAY}</strong> email addresses are allowed. A verification email will be sent automatically.</p>
          <form onSubmit={handleAddEmployee} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
                <input
                  type="text" required value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Jane Smith" className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input
                  type="email" required value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="jane@beyondsure.com" className={inputClass}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
                <input
                  type="password" required minLength={6} value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Min 6 characters" className={inputClass}
                />
              </div>
            </div>
            {formError && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{formError}</p>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setFormError('') }}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit" disabled={formLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {formLoading ? 'Creating...' : 'Add Employee'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Team Members Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading team...</div>
        ) : myEmployees.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            No employees in your team yet. Add one to get started.
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {myEmployees.map((emp) => (
                <tr key={emp.uid} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{emp.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{emp.email}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleRemoveEmployee(emp.uid, emp.name)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
