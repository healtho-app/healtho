import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
    <p className="flex items-center gap-1.5 text-red-400 text-xs font-semibold mt-1">
      <span className="material-symbols-outlined text-sm">error</span>
      {message}
    </p>
  )
}

export default function Login() {
  const navigate  = useNavigate()
  const [showPwd, setShowPwd]           = useState(false)
  const [form, setForm]                 = useState({ email: '', password: '' })
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

  const inputClass = (field) =>
    `w-full bg-slate-900 border rounded-xl h-14 px-4 text-base text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 transition-all ${
      errors[field]
        ? 'border-red-500/70 focus:border-red-500 focus:ring-red-500/20'
        : 'border-slate-800 focus:border-primary focus:ring-primary/20'
    }`

  return (
    <div className="flex flex-col min-h-screen">
      <Header rightLabel="Create account" rightTo="/register" rightIcon="person_add" />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[520px]">

          {/* Heading */}
          <div className="mb-10">
            <h1 className="text-white text-4xl font-extrabold leading-tight tracking-tight">
              Welcome back 👋
            </h1>
            <p className="text-slate-400 text-lg mt-2">
              Log in to continue your health journey.
            </p>
          </div>

          {/* Server error banner */}
          {serverError && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl mb-6">
              <span className="material-symbols-outlined text-red-400">warning</span>
              <p className="text-red-400 text-sm font-semibold">{serverError}</p>
            </div>
          )}

          {/* Form */}
          <div className="space-y-5">

            {/* Email */}
            <div className="flex flex-col gap-1">
              <label className="text-slate-300 text-sm font-semibold flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-primary text-xl">mail</span>
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                onKeyDown={e => e.key === 'Enter' && submit()}
                placeholder="example@email.com"
                className={inputClass('email')}
              />
              <FieldError message={errors.email} />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 text-sm font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">lock</span>
                  Password
                </label>
                <a href="#" className="text-primary text-xs font-semibold hover:underline">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  onKeyDown={e => e.key === 'Enter' && submit()}
                  placeholder="Enter your password"
                  className={`${inputClass('password')} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <span className="material-symbols-outlined">
                    {showPwd ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              <FieldError message={errors.password} />
            </div>

            {/* Submit */}
            <button
              onClick={submit}
              disabled={loading}
              className="w-full h-14 bg-primary hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
                  Signing in…
                </>
              ) : (
                <>
                  Continue
                  <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span>
                </>
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="relative py-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background-dark px-4 text-slate-500 font-medium">Or continue with</span>
            </div>
          </div>

          {/* Social */}
          <button
            onClick={signInWithGoogle}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 h-12 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {googleLoading ? (
              <span className="material-symbols-outlined animate-spin text-slate-400 text-xl">progress_activity</span>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            <span className="text-sm font-semibold text-slate-200">
              {googleLoading ? 'Redirecting…' : 'Continue with Google'}
            </span>
          </button>

          <p className="text-center text-slate-500 text-sm mt-8">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary font-bold hover:underline">
              Sign up for free
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
