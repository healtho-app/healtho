import { useState } from 'react'
import { Link } from 'react-router-dom'
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

export default function ForgotPassword() {
  const [email,   setEmail]   = useState('')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)

  const submit = async () => {
    setError('')
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) { setError('Email is required'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { setError('Enter a valid email address'); return }

    setLoading(true)
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      // Never reveal whether the email exists — always show success
      if (err) console.error('[ForgotPassword] reset error:', err.message)
      setSent(true)
    } catch {
      setSent(true) // still show success to avoid email enumeration
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[520px]">

          {sent ? (
            /* ── Success state ── */
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-primary text-3xl">mark_email_read</span>
              </div>
              <h1 className="text-white text-3xl font-extrabold mb-3">Check your inbox</h1>
              <p className="text-slate-400 text-base mb-2">
                If <span className="text-slate-200 font-semibold">{email.trim().toLowerCase()}</span> is registered,
                you'll receive a password reset link shortly.
              </p>
              <p className="text-slate-600 text-sm mb-10">
                Didn't get it? Check your spam folder or try again.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => { setSent(false); setEmail('') }}
                  className="w-full h-12 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold text-sm transition-colors"
                >
                  Try a different email
                </button>
                <Link
                  to="/login"
                  className="w-full h-12 flex items-center justify-center gap-2 text-primary text-sm font-semibold hover:underline"
                >
                  <span className="material-symbols-outlined text-base">arrow_back</span>
                  Back to login
                </Link>
              </div>
            </div>
          ) : (
            /* ── Form state ── */
            <>
              <div className="mb-10">
                <h1 className="text-white text-4xl font-extrabold leading-tight tracking-tight">
                  Forgot password? 🔑
                </h1>
                <p className="text-slate-400 text-lg mt-2">
                  Enter your email and we'll send you a reset link.
                </p>
              </div>

              <div className="space-y-5">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-300 text-sm font-semibold flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-primary text-xl">mail</span>
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError('') }}
                    onKeyDown={e => e.key === 'Enter' && submit()}
                    placeholder="example@email.com"
                    className={`w-full bg-slate-900 border rounded-xl h-14 px-4 text-base text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 transition-all ${
                      error
                        ? 'border-red-500/70 focus:border-red-500 focus:ring-red-500/20'
                        : 'border-slate-800 focus:border-primary focus:ring-primary/20'
                    }`}
                  />
                  <FieldError message={error} />
                </div>

                <button
                  onClick={submit}
                  disabled={loading}
                  className="w-full h-14 bg-primary hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 group"
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
                      Sending…
                    </>
                  ) : (
                    <>
                      Send reset link
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
            </>
          )}

        </div>
      </main>

      <footer className="py-6 px-6 text-center">
        <p className="text-slate-700 text-xs">© 2025 Healtho. All rights reserved.</p>
      </footer>
    </div>
  )
}
