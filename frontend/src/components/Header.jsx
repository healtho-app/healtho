import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Header({ rightLabel, rightTo, rightIcon = 'arrow_forward', showLogout = false }) {
  const [logoTo, setLogoTo]       = useState('/register')
  const [signingOut, setSigningOut] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Check session on mount to decide where the logo links
    supabase.auth.getSession().then(({ data }) => {
      setLogoTo(data?.session ? '/dashboard' : '/register')
    })

    // Update instantly if the user logs in or out in this tab
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setLogoTo(session ? '/dashboard' : '/register')
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    setSigningOut(true)
    try {
      await supabase.auth.signOut()
    } finally {
      setSigningOut(false)
      navigate('/login', { replace: true })
    }
  }

  return (
    <header className="flex items-center justify-between border-b border-slate-800 px-6 py-4 lg:px-10">
      <Link to={logoTo} className="flex items-center gap-2">
        <span className="text-2xl">🍎</span>
        <h2 className="text-white text-xl font-bold tracking-tight">Healtho</h2>
      </Link>

      <div className="flex items-center gap-4">
        {/* Optional right nav link e.g. "My Profile" */}
        {rightLabel && rightTo && (
          <Link to={rightTo} className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
            {rightLabel}
            <span className="material-symbols-outlined text-base">{rightIcon}</span>
          </Link>
        )}

        {/* Logout button — only shown on protected pages */}
        {showLogout && (
          <button
            onClick={handleLogout}
            disabled={signingOut}
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-red-400 transition-colors disabled:opacity-50"
            title="Sign out"
          >
            {signingOut ? (
              <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined text-base">logout</span>
            )}
            <span className="hidden sm:inline">{signingOut ? 'Signing out…' : 'Sign out'}</span>
          </button>
        )}
      </div>
    </header>
  )
}
