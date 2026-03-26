import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { supabase } from '../lib/supabase'

function FieldError({ message }) {
  if (!message) return null
  return (
    <p className="flex items-center gap-1.5 text-red-400 text-xs font-semibold mt-1">
      <span className="material-symbols-outlined text-sm">error</span>
      {message}
    </p>
  )
}

export default function ResetPassword() {
  const navigate = useNavigate()

  const [ready,    setReady]    = useState(false)   // true once Supabase fires PASSWORD_RECOVERY
  const [invalid,  setInvalid]  = useState(false)   // true if link is missing / expired
  const readyRef = useRef(false)                     // ref copy — avoids stale closure in setTimeout
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [errors,   setErrors]   = useState({})
  const [loading,  setLoading]  = useState(false)
  const [done,     setDone]     = useState(false)

  // Supabase fires PASSWORD_RECOVERY when it detects a recovery token in the URL hash
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        readyRef.current = true   // update ref first (no stale closure risk)
        setReady(true)
      }
    })

    // If no event fires within 5 seconds, the link is missing or expired.
    // Use readyRef (not the `ready` state) to avoid stale closure — the timeout
    // callback captures ready=false at creation time and never sees the update.
    const timer = setTimeout(() => {
      if (!readyRef.current) setInvalid(true)
    }, 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  const validate = () => {
    const e = {}
    if (!password)                                          e.password = 'Password is required'
    else if (password.length < 8)                          e.password = 'Password must be at least 8 characters'
    else if (!/(?=.*[0-9!@#$%^&*])/.test(password))       e.password = 'Include at least one number or symbol'
    if (!confirm)                                          e.confirm  = 'Please confirm your password'
    else if (confirm !== password)                         e.confirm  = 'Passwords do not match'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setDone(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      setErrors({ general: err.message || 'Could not update password. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (done) return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[520px] text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-green-400 text-3xl">check_circle</span>
          </div>
          <h1 className="text-white text-3xl font-extrabold mb-3">Password updated!</h1>
          <p className="text-slate-400 text-base mb-8">
            You're all set. Redirecting you to login…
          </p>
          <Link to="/login" className="text-primary font-bold hover:underline text-sm">
            Go to login now
          </Link>
        </div>
      </main>
    </div>
  )

  // ── Invalid / expired link ─────────────────────────────────────────────────
  if (invalid && !ready) return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[520px] text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-red-400 text-3xl">link_off</span>
          </div>
          <h1 className="text-white text-3xl font-extrabold mb-3">Link expired</h1>
          <p className="text-slate-400 text-base mb-8">
            This reset link is invalid or has expired. Request a new one below.
          </p>
          <Link
            to="/forgot-password"
            className="inline-flex items-center gap-2 h-12 px-6 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold text-sm transition-colors"
          >
            <span className="material-symbols-outlined text-base">send</span>
            Request new link
          </Link>
        </div>
      </main>
    </div>
  )

  // ── Loading while waiting for Supabase event ───────────────────────────────
  if (!ready) return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4">
          <span className="material-symbols-outlined text-primary text-4xl animate-spin">progress_activity</span>
          <p className="text-slate-400 text-sm">Verifying reset link…</p>
        </div>
      </main>
    </div>
  )

  // ── Reset form ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[520px]">

          <div className="mb-10">
            <h1 className="text-white text-4xl font-extrabold leading-tight tracking-tight">
              Set new password 🔒
            </h1>
            <p className="text-slate-400 text-lg mt-2">
              Choose a strong password for your account.
            </p>
          </div>

          <div className="space-y-5">

            {/* New password */}
            <div className="flex flex-col gap-1">
              <label className="text-slate-300 text-sm font-semibold flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-primary text-xl">lock</span>
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setErrors(v => ({ ...v, password: '' })) }}
                  onKeyDown={e => e.key === 'Enter' && submit()}
                  placeholder="Min. 8 chars with a number or symbol"
                  className={`w-full bg-slate-900 border rounded-xl h-14 px-4 pr-12 text-base text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 transition-all ${
                    errors.password
                      ? 'border-red-500/70 focus:border-red-500 focus:ring-red-500/20'
                      : 'border-slate-800 focus:border-primary focus:ring-primary/20'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">{showPw ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
              <FieldError message={errors.password} />
            </div>

            {/* Confirm password */}
            <div className="flex flex-col gap-1">
              <label className="text-slate-300 text-sm font-semibold flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-primary text-xl">lock_reset</span>
                Confirm Password
              </label>
              <input
                type={showPw ? 'text' : 'password'}
                value={confirm}
                onChange={e => { setConfirm(e.target.value); setErrors(v => ({ ...v, confirm: '' })) }}
                onKeyDown={e => e.key === 'Enter' && submit()}
                placeholder="Re-enter your new password"
                className={`w-full bg-slate-900 border rounded-xl h-14 px-4 text-base text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 transition-all ${
                  errors.confirm
                    ? 'border-red-500/70 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-slate-800 focus:border-primary focus:ring-primary/20'
                }`}
              />
              <FieldError message={errors.confirm} />
            </div>

            {/* General error */}
            {errors.general && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                <span className="material-symbols-outlined text-red-400 text-base">warning</span>
                <p className="text-red-400 text-sm font-semibold">{errors.general}</p>
              </div>
            )}

            <button
              onClick={submit}
              disabled={loading}
              className="w-full h-14 bg-primary hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
                  Updating…
                </>
              ) : (
                <>
                  Update password
                  <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span>
                </>
              )}
            </button>
          </div>

          <p className="text-center text-slate-500 text-sm mt-8">
            Remember your password?{' '}
            <Link to="/login" className="text-primary font-bold hover:underline">
              Back to login
            </Link>
          </p>

        </div>
      </main>

      <footer className="py-6 px-6 text-center">
        <p className="text-slate-700 text-xs">© 2025 Healtho. All rights reserved.</p>
      </footer>
    </div>
  )
}
