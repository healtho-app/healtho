import { Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Register  from './pages/Register'
import Profile   from './pages/Profile'

export default function App() {
  return (
    <Routes>
      <Route path="/"          element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/register"  element={<Register />} />
      <Route path="/profile"   element={<Profile />} />
    </Routes>
  )
}
