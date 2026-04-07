import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useProfile } from '../contexts/ProfileContext'

export default function Header({ rightLabel, rightTo, rightIcon = 'arrow_forward', showLogout = false }) {
  const [logoTo, setLogoTo]       = useState('/register')
  const [signingOut, setSigningOut] = useState(false)
  const navigate = useNavigate()
  const { profile } = useProfile()

  useEffect(() => {
    // Check session on mount to decide where the logo links
    supabase.auth.getSession().then(({ data }) => {
      setLogoTo(data?.session ? '/dashboard' : '/login')
    })

    // Update instantly if the user logs in or out in this tab
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setLogoTo(session ? '/dashboard' : '/login')
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
      <Link to={logoTo} className="flex items-center gap-2.5 flex-shrink-0">
        <img src="/healtho-icon.svg" alt="Healtho" className="w-9 h-9 rounded-xl" />
        <h2 className="text-xl font-bold tracking-tight text-brand-gradient whitespace-nowrap">Healtho</h2>
      </Link>

      <div className="flex items-center gap-4">
        {/* Optional right nav link e.g. "My Profile" */}
        {rightLabel && rightTo && (
          <Link to={rightTo} className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
            {rightLabel}
            <span className="material-symbols-outlined text-base">{rightIcon}</span>
          </Link>
        )}

        {/* Profile avatar — links to profile page */}
        {profile && (
          <Link to="/profile" className="flex-shrink-0" title="My Profile">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name || 'Avatar'}
                className="w-8 h-8 rounded-full object-cover border border-slate-700 hover:border-primary/60 transition-colors"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-xs font-bold text-primary hover:bg-primary/30 transition-colors">
                {(profile.full_name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
              </div>
            )}
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
