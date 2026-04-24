import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

/**
 * ProtectedRoute — wraps any page that requires a logged-in session.
 *
 * Usage in App.jsx:
 *   <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
 *
 * Behaviour:
 *   - Loading  → shows a full-screen spinner while Supabase checks the session
 *   - No session → redirects to /login
 *   - Has session → renders children normally
 *
 * Session detection strategy:
 *   onAuthStateChange is the authoritative source — it fires after Supabase
 *   finishes parsing the OAuth hash from the URL (Google login). getSession()
 *   is used as a fallback after 500ms for non-OAuth flows (direct navigation,
 *   page refresh) where onAuthStateChange might not fire at all.
 *
 *   This prevents the race condition where getSession() resolves null during
 *   an OAuth redirect because the session hasn't been persisted yet.
 */
export default function ProtectedRoute({ children }) {
  // undefined = still checking | null = no session | object = valid session
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    let authResolved = false

    // Listen for auth state changes first — authoritative for OAuth redirects
    // where the session arrives via URL hash, not localStorage.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      authResolved = true
      setSession(session)
    })

    // Fallback: if onAuthStateChange hasn't fired within 500ms (non-OAuth
    // flows like direct navigation or page refresh), check getSession().
    const fallbackTimer = setTimeout(() => {
      if (!authResolved) {
        supabase.auth.getSession().then(({ data }) => {
          if (!authResolved) setSession(data?.session ?? null)
        })
      }
    }, 500)

    return () => {
      subscription.unsubscribe()
      clearTimeout(fallbackTimer)
    }
  }, [])

  // ── Still checking ──────────────────────────────────────────────────────────
  if (session === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-dark">
        <div className="flex flex-col items-center gap-4">
          <span className="material-symbols-outlined animate-spin text-primary text-4xl">
            progress_activity
          </span>
          <p className="text-slate-500 text-sm font-semibold">Checking session…</p>
        </div>
      </div>
    )
  }

  // ── No session — bounce to login ────────────────────────────────────────────
  if (!session) {
    return <Navigate to="/login" replace />
  }

  // ── Authenticated — render the page ────────────────────────────────────────
  return children
}
