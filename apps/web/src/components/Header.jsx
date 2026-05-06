import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useProfile } from '../contexts/ProfileContext'
import { MaterialIcon } from '@healtho/ui'

// Header — top app bar shared across landing, auth, and authenticated routes.
//
// Visual spec: project/ui_kits/app/Primitives.jsx (`AppHeader`) + SKILL.md
// web-nav rule ("top bar 72px, hover underlines"). The design-system
// component file is byte-identical to this one; the visual change comes
// from token adoption (--nav-height, --page-gutter, --tap-ring) and
// MaterialIcon primitive swaps.
//
// Behavioral preservation: every prop and the supabase auth-state listener
// preserved verbatim. This component renders on every route — a regression
// here breaks the whole app.
export default function Header({
  rightLabel,
  rightTo,
  rightIcon = 'arrow_forward',
  showLogout = false,
}) {
  const [logoTo, setLogoTo] = useState('/register')
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
    <header
      className="flex items-center justify-between border-b border-slate-800 bg-background-dark px-[var(--page-gutter)]"
      style={{ minHeight: 'var(--nav-height)' }}
    >
      <Link to={logoTo} className="flex items-center gap-2.5 flex-shrink-0">
        <img src="/healtho-icon.svg" alt="" className="w-9 h-9 rounded-xl" />
        <h2 className="text-xl font-extrabold tracking-[-0.015em] text-brand-gradient whitespace-nowrap font-display">
          Healtho
        </h2>
      </Link>

      <div className="flex items-center gap-4">
        {/* Optional right nav link e.g. "My Profile" — hover underline per SKILL.md web nav */}
        {rightLabel && rightTo && (
          <Link
            to={rightTo}
            className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline underline-offset-4 decoration-primary/60 font-display focus-visible:outline-none focus-visible:shadow-[var(--tap-ring)] rounded px-1 py-0.5"
          >
            {rightLabel}
            <MaterialIcon name={rightIcon} size={16} />
          </Link>
        )}

        {/* Profile avatar — links to profile page. 36×36 keeps the touch target
            comfortable on web (32 px floor) and mobile (48 px target — covered by
            the surrounding link's hit area). */}
        {profile && (
          <Link
            to="/profile"
            className="flex-shrink-0 rounded-full focus-visible:outline-none focus-visible:shadow-[var(--tap-ring)]"
            aria-label="My profile"
            title="My profile"
          >
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="w-9 h-9 rounded-full object-cover border border-slate-800 hover:border-primary/60 transition-colors"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-xs font-bold text-primary hover:bg-primary/30 transition-colors font-display">
                {(profile.full_name || '?')
                  .split(' ')
                  .map((w) => w[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
            )}
          </Link>
        )}

        {/* Logout — only on protected pages. Icon-only on mobile, icon+text on sm+. */}
        {showLogout && (
          <button
            type="button"
            onClick={handleLogout}
            disabled={signingOut}
            aria-label={signingOut ? 'Signing out' : 'Sign out'}
            title="Sign out"
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-red-400 transition-colors disabled:opacity-50 font-display focus-visible:outline-none focus-visible:shadow-[var(--tap-ring)] rounded px-1 py-0.5"
          >
            {signingOut ? (
              <MaterialIcon name="progress_activity" size={18} className="animate-spin" />
            ) : (
              <MaterialIcon name="logout" size={18} />
            )}
            <span className="hidden sm:inline">{signingOut ? 'Signing out…' : 'Sign out'}</span>
          </button>
        )}
      </div>
    </header>
  )
}
