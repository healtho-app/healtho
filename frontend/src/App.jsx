import { Routes, Route, Navigate } from 'react-router-dom'
import Dashboard      from './pages/Dashboard'
import Login          from './pages/Login'
import Register       from './pages/Register'
import Profile        from './pages/Profile'
import NotFound       from './pages/NotFound'
import AuthCallback    from './pages/AuthCallback'
import ForgotPassword  from './pages/ForgotPassword'
import ResetPassword   from './pages/ResetPassword'
import Terms           from './pages/Terms'
import Privacy         from './pages/Privacy'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/"              element={<Navigate to="/login" replace />} />
      <Route path="/login"         element={<Login />} />
      <Route path="/register"      element={<Register />} />
      <Route path="/auth/callback"    element={<AuthCallback />} />
      <Route path="/forgot-password"  element={<ForgotPassword />} />
      <Route path="/reset-password"   element={<ResetPassword />} />
      <Route path="/terms"            element={<Terms />} />
      <Route path="/privacy"          element={<Privacy />} />

      {/* Profile — unprotected until Supabase auth is live (reads from URL params for now) */}
      <Route path="/profile"   element={<Profile />} />

      {/* Protected routes — require a valid session */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
