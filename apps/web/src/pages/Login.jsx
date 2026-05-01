import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Button, Input, MaterialIcon } from '@healtho/ui'
import Header from '../components/Header'
import { supabase } from '../lib/supabase'

// ── Validation rules ──────────────────────────────────────────
function validate({ email, password }) {
  const errors = {}
  if (!email.trim())
    errors.email = 'Email is required'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.email = 'Enter a valid email address'

  if (!password)
    errors.password = 'Password is required'
  else if (password.length < 8)
    errors.password = 'Password must be at least 8 characters'

  return errors
}

// ── Reusable error message component ─────────────────────────
function FieldError({ message }) {
  if (!message) return null
  return (
    <p className="flex items-center gap-1.5 text-red-400 text-xs font-semibold mt-1 font-display">
      <MaterialIcon name="error" size={14} />
      {message}
    </p>
  )
}

export default function Login() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const prefill   = location.state?.prefillEmail ?? ''
  const [showPwd, setShowPwd]           = useState(false)
  const [form, setForm]                 = useState({ email: prefill, password: '' })
  const [errors, setErrors]             = useState({})
  const [loading, setLoading]           = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [serverError, setServerError]   = useState('')

  const signInWithGoogle = async () => {
    setGoogleLoading(true)
    setServerError('')
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) throw error
      // Browser redirects to Google — no need to reset loading state
    } catch {
      setServerError('Could not connect to Google. Please try again.')
      setGoogleLoading(false)
    }
  }

  const set = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }))
    // Clear error on change
    if (errors[field]) setErrors(e => ({ ...e, [field]: '' }))
  }

  const submit = async () => {
    setServerError('')
    const errs = validate(form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      })
      if (error) throw error
      navigate('/dashboard')
    } catch {
      // Never expose raw Supabase error messages — they can reveal whether
      // an email exists in the system (e.g. "Email not confirmed")
      setServerError('Invalid email or password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const onEnter = (e) => { if (e.key === 'Enter') submit() }

  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden">
      <Header />

      {/* Decorative auth-page glow blobs (per AuthScreens.jsx spec) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -left-16 w-[260px] h-[260px] rounded-full"
        style={{ background: 'rgba(232,121,249,0.10)', filter: 'blur(60px)' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -right-20 w-[280px] h-[280px] rounded-full"
        style={{ background: 'rgba(34,211,238,0.08)', filter: 'blur(60px)' }}
      />

      <main className="flex-1 flex items-center justify-center px-4 py-12 relative">
        <div className="w-full max-w-[520px]">

          {/* Heading */}
          <div className="mb-10">
            <h1 className="text-3xl font-extrabold leading-tight tracking-[-0.02em] text-white font-display">
              Welcome back 👋
            </h1>
            <p className="mt-2 text-base text-slate-400 font-display">
              Log in to continue your health journey.
            </p>
          </div>

          {/* Server error banner */}
          {serverError && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl mb-6">
              <MaterialIcon name="warning" size={20} className="text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm font-semibold font-display">{serverError}</p>
            </div>
          )}

          {/* Form */}
          <div className="space-y-5">

            {/* Email */}
            <div>
              <Input
                label="Email"
                icon="mail"
                type="email"
                value={form.email}
                onChange={set('email')}
                onKeyDown={onEnter}
                placeholder="example@email.com"
                autoComplete="email"
              />
              <FieldError message={errors.email} />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-2 text-[13px] font-semibold text-slate-300 font-display">
                  <MaterialIcon name="lock" size={18} className="text-primary" />
                  Password
                </span>
                <Link
                  to="/forgot-password"
                  className="text-primary text-xs font-semibold font-display hover:underline underline-offset-4 decoration-primary/60 focus-visible:outline-none focus-visible:shadow-[var(--tap-ring)] rounded px-1 py-0.5"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                type={showPwd ? 'text' : 'password'}
                value={form.password}
                onChange={set('password')}
                onKeyDown={onEnter}
                placeholder="Enter your password"
                autoComplete="current-password"
                right={
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    aria-label={showPwd ? 'Hide password' : 'Show password'}
                    className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded focus-visible:outline-none focus-visible:shadow-[var(--tap-ring)]"
                  >
                    <MaterialIcon name={showPwd ? 'visibility_off' : 'visibility'} size={18} />
                  </button>
                }
              />
              <FieldError message={errors.password} />
            </div>

            {/* Submit */}
            <Button
              variant="primary"
              size="lg"
              onClick={submit}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <MaterialIcon name="progress_activity" size={20} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Continue
                  <MaterialIcon name="arrow_forward" size={20} />
                </>
              )}
            </Button>
          </div>

          {/* Divider */}
          <div className="relative py-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background-dark px-4 text-slate-500 font-medium font-display tracking-wider">
                Or continue with
              </span>
            </div>
          </div>

          {/* Social */}
          <Button
            variant="secondary"
            size="md"
            onClick={signInWithGoogle}
            disabled={googleLoading}
            className="w-full"
          >
            {googleLoading ? (
              <MaterialIcon name="progress_activity" size={20} className="animate-spin text-slate-400" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            <span className="text-sm font-semibold">
              {googleLoading ? 'Redirecting…' : 'Continue with Google'}
            </span>
          </Button>

          <p className="text-center text-slate-500 text-sm mt-8 font-display">
            Don&apos;t have an account?{' '}
            <Link
              to="/register"
              className="text-primary font-bold hover:underline underline-offset-4 decoration-primary/60 focus-visible:outline-none focus-visible:shadow-[var(--tap-ring)] rounded px-1 py-0.5"
            >
              Sign up for free
            </Link>
          </p>

        </div>
      </main>

      <footer className="py-6 px-6 text-center relative">
        <p className="text-slate-700 text-xs font-display">
          © {new Date().getFullYear()} Healtho. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
