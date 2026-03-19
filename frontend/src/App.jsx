import { Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Login     from './pages/Login'
import Register  from './pages/Register'
import Profile   from './pages/Profile'
import NotFound  from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route path="/"          element={<Navigate to="/login" replace />} />
      <Route path="/login"     element={<Login />} />
      <Route path="/register"  element={<Register />} />
      <Route path="/profile"   element={<Profile />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="*"          element={<NotFound />} />
    </Routes>
  )
}
