import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Landing         from './pages/Landing'
import Dashboard       from './pages/Dashboard'
import Login           from './pages/Login'
import Register        from './pages/Register'
import Profile         from './pages/Profile'
import NotFound        from './pages/NotFound'
import AuthCallback    from './pages/AuthCallback'
import ForgotPassword  from './pages/ForgotPassword'
import ResetPassword   from './pages/ResetPassword'
import Terms           from './pages/Terms'
import Privacy         from './pages/Privacy'
import ProtectedRoute  from './components/ProtectedRoute'

// _design-preview is gated to dev + Vercel preview URLs only. Lazy-loaded
// so production users don't pull in the chunk eagerly. The route still
// renders NotFound on production hostnames (healtho-kohl.vercel.app etc.)
// even if someone discovers the path.
const DesignPreview = lazy(() => import('./pages/_design-preview'))

function isDesignPreviewAllowed() {
  if (import.meta.env.DEV) return true
  if (typeof window === 'undefined') return false
  // Vercel preview branches deploy to healtho-git-{branch}-...vercel.app
  // Production uses healtho-kohl.vercel.app + any future custom domain.
  return window.location.hostname.startsWith('healtho-git-')
}

export default function App() {
  return (
    <Routes>
      {/* Landing page — "/" and section routes all render the same page */}
      <Route path="/"          element={<Landing />} />
      <Route path="/features"  element={<Landing />} />
      <Route path="/benefits"  element={<Landing />} />
      <Route path="/pricing"   element={<Landing />} />

      {/* Auth routes */}
      <Route path="/login"            element={<Login />} />
      <Route path="/register"         element={<Register />} />
      <Route path="/auth/callback"    element={<AuthCallback />} />
      <Route path="/forgot-password"  element={<ForgotPassword />} />
      <Route path="/reset-password"   element={<ResetPassword />} />

      {/* Legal */}
      <Route path="/terms"   element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />

      {/* Profile — unprotected until Supabase auth is live (reads from URL params for now) */}
      <Route path="/profile" element={<Profile />} />

      {/* Protected routes — require a valid session */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

      {/* @healtho/ui primitives preview — dev + Vercel preview branches only */}
      <Route
        path="/_design-preview"
        element={
          isDesignPreviewAllowed()
            ? <Suspense fallback={null}><DesignPreview /></Suspense>
            : <NotFound />
        }
      />

      {/* Fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
