import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { AddLeadModal } from '../leads/AddLeadModal'
import { EditLeadModal } from '../leads/EditLeadModal'
import { useCRM } from '../../firebase/CRMContext'
import { useAuth } from '../../firebase/AuthContext'

export function AppLayout() {
  const [addLeadOpen, setAddLeadOpen] = useState(false)
  const [sidebarHidden, setSidebarHidden] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const { editModalLeadId, closeEditModal, leads } = useCRM()
  const { logout } = useAuth()

  const editLead = editModalLeadId ? leads.find((l) => l.id === editModalLeadId) ?? null : null

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Sidebar
        isHidden={sidebarHidden}
        onToggle={() => setSidebarHidden((prev) => !prev)}
        onSignOutClick={() => setShowLogoutConfirm(true)}
      />

      <main className={`min-h-screen overflow-y-auto transition-all duration-200 ${sidebarHidden ? 'ml-0' : 'ml-56'}`}>
        <div className="p-6">
          {sidebarHidden && (
            <button
              onClick={() => setSidebarHidden(false)}
              className="mb-4 inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Show Sidebar
            </button>
          )}
          <Outlet />
        </div>
      </main>

      <AddLeadModal
        isOpen={addLeadOpen}
        onClose={() => setAddLeadOpen(false)}
      />

      <EditLeadModal lead={editLead} onClose={closeEditModal} />

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/30 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="text-base font-semibold text-gray-900">BeyondSure CRM</h2>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-5 py-5 text-center">
              <p className="text-sm text-gray-600">Are you sure you want to sign out?</p>
            </div>

            <div className="flex justify-center gap-3 border-t border-gray-100 px-5 py-4">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await logout()
                }}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
