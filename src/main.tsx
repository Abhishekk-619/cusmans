import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import { AuthProvider, useAuth } from './firebase/AuthContext'
import { CRMProvider } from './firebase/CRMContext'
import { AppLayout } from './components/layout/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { LeadsPage } from './pages/LeadsPage'
import { PipelinePage } from './pages/PipelinePage'
import { FollowupsPage } from './pages/FollowupsPage'
import { UsersPage } from './pages/UsersPage'
import { MyTeamPage } from './pages/MyTeamPage'
import { ActivitiesPage } from './pages/ActivitiesPage'
import { ImportLeadsPage } from './pages/ImportLeadsPage'

function AppRoutes() {
  const { currentUser, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="text-sm text-gray-400">Loading...</div>
      </div>
    )
  }

  if (!currentUser) {
    return <LoginPage />
  }

  return (
    <CRMProvider>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route path="pipeline" element={<PipelinePage />} />
          <Route path="followups" element={<FollowupsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="my-team" element={<MyTeamPage />} />
          <Route path="activities" element={<ActivitiesPage />} />
          <Route path="import" element={<ImportLeadsPage />} />
        </Route>
      </Routes>
    </CRMProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
