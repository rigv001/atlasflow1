import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import AdminDashboard from './pages/AdminDashboard'
import AdminClientsPage from './pages/AdminClientsPage'
import AdminOperationsPage from './pages/AdminOperationsPage'
import AdminCompliancePage from './pages/AdminCompliancePage'
import AdminSettingsPage from './pages/AdminSettingsPage'
import NetworkMapPage from './pages/NetworkMapPage'
import SimulationsPage from './pages/SimulationsPage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'
import { supabase } from './supabase/client'
import { loadCurrentUserRole } from './utils/profile'

type Role = 'client' | 'admin' | null

function AppRoutes() {
  const [userRole, setUserRole] = useState<Role>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUserRole(null)
    navigate('/login', { replace: true })
  }

  useEffect(() => {
    const applySession = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        setUserRole(null)
        return null
      }

      const nextRole = await loadCurrentUserRole()
      setUserRole(nextRole)
      return nextRole
    }

    const checkSession = async () => {
      await applySession()
      setIsLoading(false)
    }

    void checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      void (async () => {
        const nextRole = await applySession()
        const isAuthEntryRoute = location.pathname === '/login' || location.pathname === '/signup'

        if (event === 'SIGNED_IN' && nextRole && isAuthEntryRoute) {
          navigate(nextRole === 'admin' ? '/admin' : '/', { replace: true })
        }

        if (event === 'SIGNED_OUT') {
          navigate('/login', { replace: true })
        }
      })()
    })

    return () => subscription.unsubscribe()
  }, [location.pathname, navigate])

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center bg-[#050608] text-white">Loading...</div>
  }

  const isAdmin = userRole === 'admin'
  const isClient = userRole === 'client'
  const isAuthenticated = isClient || isAdmin
  const homePath = isAdmin ? '/admin' : '/'
  const settingsPath = '/settings'

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated
            ? <Navigate to={homePath} replace />
            : <Login onLogin={setUserRole} onSwitchToSignup={() => navigate('/signup')} />
        }
      />
      <Route
        path="/signup"
        element={
          isAuthenticated
            ? <Navigate to={homePath} replace />
            : <Signup onSignup={setUserRole} onSwitchToLogin={() => navigate('/login')} />
        }
      />
      <Route
        path="/"
        element={isClient ? <Dashboard onLogout={handleLogout} settingsPath={settingsPath} /> : <Navigate to={isAdmin ? '/admin' : '/login'} replace />}
      />
      <Route
        path="/network-map"
        element={isClient ? <NetworkMapPage onLogout={handleLogout} settingsPath={settingsPath} /> : <Navigate to={isAdmin ? '/admin' : '/login'} replace />}
      />
      <Route
        path="/simulations"
        element={isClient ? <SimulationsPage onLogout={handleLogout} settingsPath={settingsPath} /> : <Navigate to={isAdmin ? '/admin' : '/login'} replace />}
      />
      <Route
        path="/reports"
        element={isClient ? <ReportsPage onLogout={handleLogout} settingsPath={settingsPath} /> : <Navigate to={isAdmin ? '/admin' : '/login'} replace />}
      />
      <Route
        path="/settings"
        element={isClient ? <SettingsPage onLogout={handleLogout} settingsPath={settingsPath} /> : <Navigate to={isAdmin ? '/admin/settings' : '/login'} replace />}
      />
      <Route
        path="/admin"
        element={isAdmin ? <AdminDashboard onLogout={handleLogout} /> : <Navigate to={isClient ? '/' : '/login'} replace />}
      />
      <Route
        path="/admin/clients"
        element={isAdmin ? <AdminClientsPage onLogout={handleLogout} /> : <Navigate to={isClient ? '/' : '/login'} replace />}
      />
      <Route
        path="/admin/operations"
        element={isAdmin ? <AdminOperationsPage onLogout={handleLogout} /> : <Navigate to={isClient ? '/' : '/login'} replace />}
      />
      <Route
        path="/admin/compliance"
        element={isAdmin ? <AdminCompliancePage onLogout={handleLogout} /> : <Navigate to={isClient ? '/' : '/login'} replace />}
      />
      <Route
        path="/admin/settings"
        element={isAdmin ? <AdminSettingsPage onLogout={handleLogout} /> : <Navigate to={isClient ? '/' : '/login'} replace />}
      />
      <Route path="*" element={<Navigate to={isAuthenticated ? homePath : '/login'} replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
