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
 * TODO: swap supabase.auth.getSession() stub for real call once Supabase keys are connected.
 */
export default function ProtectedRoute({ children }) {
  // undefined = still checking | null = no session | object = valid session
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    // Check current session on mount
    supabase.auth.getSession().then(({ data }) => {
      setSession(data?.session ?? null)
    })

    // Keep in sync if the user logs out in another tab
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
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
