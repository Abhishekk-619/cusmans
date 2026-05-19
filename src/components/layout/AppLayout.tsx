import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { AddLeadModal } from '../leads/AddLeadModal'
import { LeadDrawer } from '../leads/LeadDrawer'

export function AppLayout() {
  const [addLeadOpen, setAddLeadOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Sidebar />

      {/* Main content */}
      <main className="ml-56 min-h-screen overflow-y-auto">
        <div className="p-6">
          <Outlet />
        </div>
      </main>

      <AddLeadModal
        isOpen={addLeadOpen}
        onClose={() => setAddLeadOpen(false)}
      />

      <LeadDrawer />
    </div>
  )
}
