import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MaterialIcon } from '@healtho/ui'
import { supabase } from '../lib/supabase'

/**
 * AuthCallback — landing page after Google OAuth redirect.
 *
 * Supabase (detectSessionInUrl: true) automatically parses the session from
 * the URL hash and fires onAuthStateChange with SIGNED_IN.
 *
 * Flow:
 *   New user    → seed profile with Google name/email → /register?google=1
 *   Returning   → /dashboard
 *   Error       → friendly error + back-to-login link
 */
export default function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event !== 'SIGNED_IN' || !session) return

        try {
          const user = session.user

          // Check if user has already completed onboarding
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_onboarded')
            .eq('id', user.id)
            .maybeSingle()

          if (profile?.is_onboarded) {
            navigate('/dashboard', { replace: true })
          } else {
            // New Google user — seed basic profile from their Google account data
            await supabase.from('profiles').upsert(
              {
                id:        user.id,
                full_name: user.user_metadata?.full_name ?? '',
                email:     user.email ?? '',
              },
              { onConflict: 'id' }
            )
            navigate('/register?google=1', { replace: true })
          }
        } catch (err) {
          console.error('[AuthCallback]', err)
          setError('Something went wrong signing you in. Please try again.')
        } finally {
          subscription.unsubscribe()
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [navigate])

  // ── Error state ──────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-dark px-4">
        <div className="text-center space-y-4">
          <MaterialIcon name="error" size={48} className="text-red-400" />
          <p className="text-red-400 font-semibold">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="text-primary text-sm font-semibold hover:underline"
          >
            Back to login
          </button>
        </div>
      </div>
    )
  }

  // ── Loading spinner ──────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen items-center justify-center bg-background-dark">
      <div className="flex flex-col items-center gap-4">
        <MaterialIcon name="progress_activity" size={36} className="animate-spin text-primary" />
        <p className="text-slate-500 text-sm font-semibold">Signing you in…</p>
      </div>
    </div>
  )
}
