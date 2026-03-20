import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Header({ rightLabel, rightTo, rightIcon = 'arrow_forward' }) {
  const [logoTo, setLogoTo] = useState('/register')

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

  return (
    <header className="flex items-center justify-between border-b border-slate-800 px-6 py-4 lg:px-10">
      <Link to={logoTo} className="flex items-center gap-2">
        <span className="text-2xl">🍎</span>
        <h2 className="text-white text-xl font-bold tracking-tight">Healtho</h2>
      </Link>
      {rightLabel && rightTo && (
        <Link to={rightTo} className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
          {rightLabel}
          <span className="material-symbols-outlined text-base">{rightIcon}</span>
        </Link>
      )}
    </header>
  )
}
