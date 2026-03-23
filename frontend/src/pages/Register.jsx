import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { supabase } from '../lib/supabase'

// ── API base URL (Ishaan's Express backend) ────────────────────────────────────
const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

async function apiPost(path, body, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  let res
  try {
    res = await fetch(`${API}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
  } catch {
    // Network error — backend is unreachable (not deployed yet, or no internet)
    throw new Error('__backend_offline__')
  }

  const json = await res.json()
  if (!res.ok) {
    // Surface Joi validation array or single message
    const msg = Array.isArray(json.errors)
      ? json.errors[0]
      : json.message || 'Something went wrong. Please try again.'
    throw new Error(msg)
  }
  return json
}

// ── Step config ─────────────────────────────────────────────────────────────────
const STEPS = {
  1: { label: '1', pct: '25%',  width: '25%',  hint: "Let's start with your account details..." },
  2: { label: '2', pct: '50%',  width: '50%',  hint: 'Your personalised plan is taking shape...' },
  3: { label: '3', pct: '75%',  width: '75%',  hint: 'Almost done — just one more thing!' },
  4: { label: '4', pct: '100%', width: '100%', hint: 'Check your inbox for a 6-digit code.' },
}

// ── Activity options — values MUST match Ishaan's backend validator ────────────
const ACTIVITY_OPTIONS = [
  { value: 'sedentary',         emoji: '🪑', label: 'Sedentary',         sub: 'Little or no exercise, desk job' },
  { value: 'lightly_active',    emoji: '🚶', label: 'Lightly Active',    sub: 'Light exercise 1–3 days/week' },
  { value: 'moderately_active', emoji: '🏃', label: 'Moderately Active', sub: 'Moderate exercise 3–5 days/week' },
  { value: 'very_active',       emoji: '💪', label: 'Very Active',       sub: 'Hard exercise 6–7 days/week' },
  { value: 'athlete',           emoji: '🏋️', label: 'Athlete',           sub: 'Very hard exercise, physical job' },
]

const OTP_LENGTH     = 6
const RESEND_SECONDS = 30

// ── Validation ──────────────────────────────────────────────────────────────────
function validateStep1({ name, username, email, password }) {
  const errors = {}
  if (!name.trim())                errors.name     = 'Full name is required'
  else if (name.trim().length < 2) errors.name     = 'Name must be at least 2 characters'
  if (!username.trim())                        errors.username = 'Username is required'
  else if (username.length < 3)                errors.username = 'Username must be at least 3 characters'
  else if (username.length > 20)               errors.username = 'Username must be 20 characters or less'
  else if (!/^[a-z0-9_]+$/.test(username))     errors.username = 'Only letters, numbers, and underscores allowed'
  if (!email.trim())               errors.email    = 'Email is required'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address'
  if (!password)                   errors.password = 'Password is required'
  else if (password.length < 8)    errors.password = 'Password must be at least 8 characters'
  else if (!/(?=.*[0-9!@#$%^&*])/.test(password)) errors.password = 'Include at least one number or symbol'
  return errors
}

function validateStep2({ age, height, weight }) {
  const errors = {}
  const a = parseInt(age), h = parseFloat(height), w = parseFloat(weight)
  if (!age    || isNaN(a) || a < 10 || a > 120)  errors.age    = 'Enter a valid age between 10 and 120'
  if (!height || isNaN(h) || h < 50 || h > 300)  errors.height = 'Enter a valid height (50–300 cm)'
  if (!weight || isNaN(w) || w < 20 || w > 500)  errors.weight = 'Enter a valid weight (20–500 kg)'
  return errors
}

function validateStep3({ activity }) {
  return activity ? {} : { activity: 'Please select your activity level' }
}

// ── Shared components ───────────────────────────────────────────────────────────
function FieldError({ message }) {
  if (!message) return null
  return (
    <p className="flex items-center gap-1.5 text-red-400 text-xs font-semibold mt-1">
      <span className="material-symbols-outlined text-sm">error</span>
      {message}
    </p>
  )
}

function inputClass(errors, field, extra = '') {
  return `w-full bg-slate-900 border rounded-xl h-14 px-4 text-base text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 transition-all ${extra} ${
    errors[field]
      ? 'border-red-500/70 focus:border-red-500 focus:ring-red-500/20'
      : 'border-slate-800 focus:border-primary focus:ring-primary/20'
  }`
}

// ── BMI helpers ─────────────────────────────────────────────────────────────────
function calcBMI(weight, height) {
  if (!weight || !height || height < 50 || weight < 20) return null
  return (weight / Math.pow(height / 100, 2)).toFixed(1)
}

function getBmiInfo(bmi) {
  const b = parseFloat(bmi)
  if (b < 18.5) return { label: 'Underweight — BMI below 18.5',     color: 'bg-blue-400',   text: 'text-blue-400',   pct: 20 }
  if (b < 25)   return { label: 'Healthy weight — BMI 18.5–24.9 ✓', color: 'bg-green-400',  text: 'text-green-400',  pct: 50 }
  if (b < 30)   return { label: 'Overweight — BMI 25–29.9',         color: 'bg-yellow-400', text: 'text-yellow-400', pct: 70 }
  return             { label: 'Obese range — BMI 30+',              color: 'bg-red-400',    text: 'text-red-400',    pct: 90 }
}

// ── OTP input component ─────────────────────────────────────────────────────────
function OtpInput({ digits, onChange, hasError }) {
  const refs = useRef([])
  const focus = (i) => refs.current[i]?.focus()

  const handleKey = (i, e) => {
    if (e.key === 'Backspace') {
      if (digits[i]) {
        const next = [...digits]; next[i] = ''; onChange(next)
      } else if (i > 0) {
        const next = [...digits]; next[i - 1] = ''; onChange(next); focus(i - 1)
      }
      e.preventDefault()
    } else if (e.key === 'ArrowLeft'  && i > 0)              focus(i - 1)
      else if (e.key === 'ArrowRight' && i < OTP_LENGTH - 1) focus(i + 1)
  }

  const handleInput = (i, e) => {
    const val = e.target.value.replace(/\D/g, '').slice(-1)
    if (!val) return
    const next = [...digits]; next[i] = val; onChange(next)
    if (i < OTP_LENGTH - 1) focus(i + 1)
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!pasted) return
    const next = Array(OTP_LENGTH).fill('')
    pasted.split('').forEach((c, i) => { next[i] = c })
    onChange(next)
    focus(Math.min(pasted.length, OTP_LENGTH - 1))
  }

  return (
    <div className="flex gap-3 justify-center" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => refs.current[i] = el}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={e => handleInput(i, e)}
          onKeyDown={e => handleKey(i, e)}
          className={`w-12 h-14 text-center text-2xl font-extrabold font-mono rounded-xl border-2 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 transition-all ${
            d
              ? 'border-primary text-primary'
              : hasError
                ? 'border-red-500/70 focus:border-red-500 focus:ring-red-500/20'
                : 'border-slate-700 focus:border-primary focus:ring-primary/20'
          }`}
        />
      ))}
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────────
export default function Register() {
  const navigate = useNavigate()
  const [step,        setStep]        = useState(1)
  const [showPwd,     setShowPwd]     = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [errors,      setErrors]      = useState({})
  const [serverError, setServerError] = useState('')
  const [otpDigits,   setOtpDigits]   = useState(Array(OTP_LENGTH).fill(''))
  const [otpError,    setOtpError]    = useState('')
  const [resendTimer, setResendTimer] = useState(0)
  const [resending,   setResending]   = useState(false)

  // JWT stored after step 1 sign-in — needed for steps 2 & 3 Bearer auth
  const [authToken, setAuthToken] = useState(null)

  const [form, setForm] = useState({
    name: '', username: '', email: '', password: '',
    unit_system: 'metric',
    age: '', height: '', weight: '',
    activity: '',
  })

  const set = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }))
    if (errors[field]) setErrors(er => ({ ...er, [field]: '' }))
  }

  // Username: auto-lowercase, strip invalid chars as the user types
  const setUsername = (e) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
    setForm(f => ({ ...f, username: val }))
    if (errors.username) setErrors(er => ({ ...er, username: '' }))
  }

  const bmi     = calcBMI(parseFloat(form.weight), parseFloat(form.height))
  const bmiInfo = bmi ? getBmiInfo(bmi) : null

  const goTo = (n) => {
    setErrors({})
    setServerError('')
    setStep(n)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Resend countdown timer ───────────────────────────────────────────────────
  useEffect(() => {
    if (resendTimer <= 0) return
    const t = setTimeout(() => setResendTimer(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendTimer])

  // ── Step 1: Create account directly via Supabase Auth ───────────────────────
  // NOTE: Ishaan's Express backend (/api/auth/register) does the same thing but
  // requires a deployed server. We call Supabase directly for now and will
  // migrate back to the full API flow once the backend is deployed.
  const submitStep1 = async () => {
    const errs = validateStep1(form)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setLoading(true)
    setServerError('')
    try {
      const { data, error } = await supabase.auth.signUp({
        email:    form.email.trim().toLowerCase(),
        password: form.password,
        options:  { data: { full_name: form.name.trim() } },
      })
      if (error) throw error

      if (data.session) {
        // Email confirmation disabled — session returned immediately
        setAuthToken(data.session.access_token)
        // Seed the profiles row with basic info
        const { error: profileError } = await supabase.from('profiles').upsert({
          id:                data.user.id,
          full_name:         form.name.trim(),
          username:          form.username.toLowerCase(),
          email:             form.email.trim().toLowerCase(),
          registration_step: 1,
          created_at:        new Date().toISOString(),
        })
        if (profileError?.code === '23505') {
          // UNIQUE constraint — username already taken
          await supabase.auth.admin?.deleteUser?.(data.user.id).catch(() => {})
          setErrors(er => ({ ...er, username: 'Username already taken — try another' }))
          goTo(1)
          return
        }
        goTo(2)
      } else {
        // Email confirmation enabled — show OTP step
        goTo(4)
      }
    } catch (err) {
      const msg = err.message?.toLowerCase() ?? ''
      if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('user already registered')) {
        setServerError('An account with this email already exists. Try logging in instead.')
      } else {
        setServerError(err.message || 'Could not create account. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: Save body metrics directly to Supabase ──────────────────────────
  const submitStep2 = async () => {
    const errs = validateStep2(form)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setLoading(true)
    setServerError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Session expired. Please go back to step 1.')

      // Convert to metric for storage (matches Ishaan's backend logic)
      const isImperial = form.unit_system === 'imperial'
      const weight_kg  = isImperial ? parseFloat((parseFloat(form.weight) * 0.453592).toFixed(2)) : parseFloat(form.weight)
      const height_cm  = isImperial ? parseFloat((parseFloat(form.height) * 2.54).toFixed(2))    : parseFloat(form.height)
      const bmi        = parseFloat((weight_kg / Math.pow(height_cm / 100, 2)).toFixed(1))

      const { error } = await supabase.from('profiles').update({
        unit_system:       form.unit_system,
        age:               parseInt(form.age),
        height_cm,
        weight_kg,
        bmi,
        registration_step: 2,
      }).eq('id', user.id)

      if (error) throw error
      goTo(3)
    } catch (err) {
      setServerError(err.message || 'Could not save your metrics. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 3: Save activity level — registration complete ──────────────────────
  const submitStep3 = async () => {
    const errs = validateStep3(form)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setLoading(true)
    setServerError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Session expired. Please go back to step 1.')

      // Calculate TDEE client-side — same Mifflin-St Jeor formula as Ishaan's backend
      const isImperial   = form.unit_system === 'imperial'
      const weight_kg    = isImperial ? parseFloat(form.weight) * 0.453592 : parseFloat(form.weight)
      const height_cm    = isImperial ? parseFloat(form.height) * 2.54     : parseFloat(form.height)
      const bmr          = 10 * weight_kg + 6.25 * height_cm - 5 * parseInt(form.age)
      const multipliers  = { sedentary: 1.2, lightly_active: 1.375, moderately_active: 1.55, very_active: 1.725, athlete: 1.9 }
      const tdee         = Math.round(bmr * multipliers[form.activity])

      const { error } = await supabase.from('profiles').update({
        activity_level:      form.activity,
        daily_calorie_goal:  tdee,
        registration_step:   3,
        is_onboarded:        true,
        is_profile_complete: true,
        // Auto-detect browser timezone — e.g. 'America/Phoenix' or 'Asia/Kolkata'
        timezone:            Intl.DateTimeFormat().resolvedOptions().timeZone,
      }).eq('id', user.id)

      if (error) throw error

      const params = new URLSearchParams({
        name:               form.name,
        username:           form.username,
        email:              form.email,
        age:                form.age,
        height:             form.height,
        weight:             form.weight,
        activity:           form.activity,
        daily_calorie_goal: tdee,
      })
      navigate('/profile?' + params.toString())
    } catch (err) {
      setServerError(err.message || 'Could not complete registration. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 4: Verify OTP (used if Ishaan sets email_confirm: false) ─────────────
  const verifyOtp = async () => {
    const code = otpDigits.join('')
    if (code.length < OTP_LENGTH) {
      setOtpError('Enter the full 6-digit code from your email')
      return
    }
    setLoading(true)
    setOtpError('')
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: form.email,
        token: code,
        type:  'signup',
      })
      if (error) throw error

      // Email confirmed — seed profile row then continue to collect metrics
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('profiles').upsert({
          id:                user.id,
          full_name:         form.name.trim(),
          username:          form.username.toLowerCase(),
          email:             form.email.trim().toLowerCase(),
          registration_step: 1,
          created_at:        new Date().toISOString(),
        })
      }
      goTo(2)
    } catch (err) {
      setOtpError(err.message || 'Invalid or expired code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Resend OTP ───────────────────────────────────────────────────────────────
  const resendCode = async () => {
    setResending(true)
    setOtpError('')
    setOtpDigits(Array(OTP_LENGTH).fill(''))
    try {
      await supabase.auth.resend({ type: 'signup', email: form.email })
      setResendTimer(RESEND_SECONDS)
    } catch (err) {
      setOtpError(err.message || 'Could not resend code.')
    } finally {
      setResending(false)
    }
  }

  const s = STEPS[step]

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-[520px]">

          {/* Progress bar */}
          <div className="flex flex-col gap-3 mb-10">
            <div className="flex items-center justify-between">
              <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider">
                Step {s.label} of 4
              </p>
              <p className="text-primary text-sm font-bold">{s.pct}</p>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: s.width }} />
            </div>
            <p className="text-slate-500 text-sm font-medium italic">{s.hint}</p>
          </div>

          {/* ── STEP 1: Account Details ──────────────────────────────────────── */}
          {step === 1 && (
            <div>
              <div className="mb-8">
                <h1 className="text-white text-4xl font-extrabold leading-tight tracking-tight">Create your account</h1>
                <p className="text-slate-400 text-lg mt-2">Start your health journey with Healtho.</p>
              </div>

              {serverError && (
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl mb-6">
                  <span className="material-symbols-outlined text-red-400">warning</span>
                  <p className="text-red-400 text-sm font-semibold">{serverError}</p>
                </div>
              )}

              <div className="space-y-5">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-300 text-sm font-semibold flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-primary text-xl">person</span>Full Name
                  </label>
                  <input type="text" value={form.name} onChange={set('name')}
                    onKeyDown={e => e.key === 'Enter' && submitStep1()}
                    placeholder="e.g. Ayush Sharma" className={inputClass(errors, 'name')} />
                  <FieldError message={errors.name} />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-slate-300 text-sm font-semibold flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-primary text-xl">alternate_email</span>Username
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-base select-none">@</span>
                    <input type="text" value={form.username} onChange={setUsername}
                      onKeyDown={e => e.key === 'Enter' && submitStep1()}
                      placeholder="yourname" maxLength={20}
                      className={`${inputClass(errors, 'username')} pl-8`} />
                  </div>
                  <p className="text-slate-600 text-xs mt-0.5">Letters, numbers and underscores only. e.g. <span className="text-slate-500">@ayush_k</span></p>
                  <FieldError message={errors.username} />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-slate-300 text-sm font-semibold flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-primary text-xl">mail</span>Email
                  </label>
                  <input type="email" value={form.email} onChange={set('email')}
                    onKeyDown={e => e.key === 'Enter' && submitStep1()}
                    placeholder="example@email.com" className={inputClass(errors, 'email')} />
                  <FieldError message={errors.email} />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-slate-300 text-sm font-semibold flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-primary text-xl">lock</span>Password
                  </label>
                  <div className="relative">
                    <input type={showPwd ? 'text' : 'password'} value={form.password} onChange={set('password')}
                      onKeyDown={e => e.key === 'Enter' && submitStep1()}
                      placeholder="Min 8 chars, include a number or symbol" className={inputClass(errors, 'password', 'pr-12')} />
                    <button type="button" onClick={() => setShowPwd(v => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                      <span className="material-symbols-outlined">{showPwd ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                  <FieldError message={errors.password} />
                </div>
              </div>

              <div className="relative py-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background-dark px-4 text-slate-500 font-medium">Or sign up with</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <button className="flex items-center justify-center gap-2 h-12 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 transition-colors">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="text-sm font-semibold text-slate-200">Google</span>
                </button>
                <button className="flex items-center justify-center gap-2 h-12 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 transition-colors">
                  <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                  <span className="text-sm font-semibold text-slate-200">Apple</span>
                </button>
              </div>

              <button onClick={submitStep1} disabled={loading}
                className="w-full h-14 bg-primary hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 group">
                {loading ? (
                  <><span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>Creating account…</>
                ) : (
                  <>Continue<span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span></>
                )}
              </button>
              <p className="text-center text-slate-500 text-xs mt-6">
                By continuing, you agree to our{' '}
                <a href="#" className="text-primary hover:underline">Terms</a> and{' '}
                <a href="#" className="text-primary hover:underline">Privacy Policy</a>
              </p>
            </div>
          )}

          {/* ── STEP 2: Body Metrics ─────────────────────────────────────────── */}
          {step === 2 && (
            <div>
              <div className="mb-8">
                <h1 className="text-white text-4xl font-extrabold leading-tight tracking-tight">Your body metrics</h1>
                <p className="text-slate-400 text-lg mt-2">Used to calculate your BMI and personalised daily calorie goal.</p>
              </div>

              {serverError && (
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl mb-6">
                  <span className="material-symbols-outlined text-red-400">warning</span>
                  <p className="text-red-400 text-sm font-semibold">{serverError}</p>
                </div>
              )}

              {/* Unit toggle — wired to form.unit_system */}
              <div className="flex mb-8">
                <div className="flex h-12 w-full items-center rounded-xl bg-slate-800/50 p-1.5">
                  {[
                    { value: 'metric',   label: 'Metric (kg, cm)' },
                    { value: 'imperial', label: 'Imperial (lb, ft)' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, unit_system: opt.value }))}
                      className={`flex cursor-pointer h-full grow items-center justify-center rounded-lg px-4 transition-all text-base font-semibold ${
                        form.unit_system === opt.value
                          ? 'bg-slate-700 text-primary'
                          : 'text-slate-400 hover:text-slate-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-5">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-300 text-base font-semibold flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-primary text-xl">calendar_today</span>Age
                  </label>
                  <input type="number" min="10" max="120" value={form.age} onChange={set('age')}
                    placeholder="e.g. 27" className={inputClass(errors, 'age')} />
                  <FieldError message={errors.age} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-300 text-base font-semibold flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-primary text-xl">height</span>Height
                    </label>
                    <div className="relative">
                      <input type="number" value={form.height} onChange={set('height')}
                        placeholder={form.unit_system === 'metric' ? '175' : '69'}
                        className={inputClass(errors, 'height', 'pr-14')} />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">
                        {form.unit_system === 'metric' ? 'cm' : 'in'}
                      </span>
                    </div>
                    <FieldError message={errors.height} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-300 text-base font-semibold flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-primary text-xl">monitor_weight</span>Weight
                    </label>
                    <div className="relative">
                      <input type="number" value={form.weight} onChange={set('weight')}
                        placeholder={form.unit_system === 'metric' ? '70' : '154'}
                        className={inputClass(errors, 'weight', 'pr-14')} />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">
                        {form.unit_system === 'metric' ? 'kg' : 'lb'}
                      </span>
                    </div>
                    <FieldError message={errors.weight} />
                  </div>
                </div>
              </div>

              {bmi && bmiInfo && (
                <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">calculate</span>
                      <span className="text-slate-300 text-sm font-semibold">Estimated BMI</span>
                    </div>
                    <span className={`text-xl font-extrabold font-mono ${bmiInfo.text}`}>{bmi}</span>
                  </div>
                  <div className="mt-2 w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${bmiInfo.color}`} style={{ width: `${bmiInfo.pct}%` }} />
                  </div>
                  <p className="text-slate-500 text-xs mt-1.5">{bmiInfo.label}</p>
                </div>
              )}

              <div className="mt-10 flex flex-col gap-3">
                <button onClick={submitStep2} disabled={loading}
                  className="w-full h-14 bg-primary hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 group">
                  {loading ? (
                    <><span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>Saving…</>
                  ) : (
                    <>Continue<span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span></>
                  )}
                </button>
                <button onClick={() => goTo(1)} className="w-full h-12 text-slate-400 rounded-xl font-semibold text-base hover:bg-slate-800 transition-colors">Back</button>
              </div>
              <div className="mt-6 p-4 bg-slate-900 border border-slate-800 rounded-xl flex gap-3">
                <span className="material-symbols-outlined text-primary flex-shrink-0">info</span>
                <p className="text-sm text-slate-400 leading-relaxed">Your data is stored securely and only used to personalise your nutrition and health goals.</p>
              </div>
            </div>
          )}

          {/* ── STEP 3: Activity Level ───────────────────────────────────────── */}
          {step === 3 && (
            <div>
              <div className="mb-8">
                <h1 className="text-white text-4xl font-extrabold leading-tight tracking-tight">How active are you?</h1>
                <p className="text-slate-400 text-lg mt-2">This fine-tunes your daily calorie target to match your lifestyle.</p>
              </div>

              <div className="flex flex-col gap-3">
                {ACTIVITY_OPTIONS.map(opt => (
                  <label key={opt.value}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      form.activity === opt.value
                        ? 'border-primary bg-primary/10'
                        : errors.activity
                          ? 'border-red-500/50 bg-slate-900 hover:border-red-500/70'
                          : 'border-slate-800 bg-slate-900 hover:border-primary/50'
                    }`}
                    onClick={() => { setForm(f => ({ ...f, activity: opt.value })); if (errors.activity) setErrors(er => ({ ...er, activity: '' })) }}>
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-xl flex-shrink-0">{opt.emoji}</div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-100">{opt.label}</p>
                      <p className="text-slate-500 text-sm">{opt.sub}</p>
                    </div>
                    <span className={`material-symbols-outlined text-primary transition-opacity ${form.activity === opt.value ? 'opacity-100' : 'opacity-0'}`}>check_circle</span>
                  </label>
                ))}
              </div>

              {errors.activity && (
                <div className="flex items-center gap-1.5 mt-3">
                  <span className="material-symbols-outlined text-red-400 text-sm">error</span>
                  <p className="text-red-400 text-xs font-semibold">{errors.activity}</p>
                </div>
              )}

              {serverError && (
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl mt-6">
                  <span className="material-symbols-outlined text-red-400">warning</span>
                  <p className="text-red-400 text-sm font-semibold">{serverError}</p>
                </div>
              )}

              <div className="mt-10 flex flex-col gap-3">
                <button onClick={submitStep3} disabled={loading}
                  className="w-full h-14 bg-primary hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2">
                  {loading ? (
                    <><span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>Finishing up…</>
                  ) : 'Create My Account 🎉'}
                </button>
                <button onClick={() => goTo(2)} className="w-full h-12 text-slate-400 rounded-xl font-semibold text-base hover:bg-slate-800 transition-colors">Back</button>
              </div>
            </div>
          )}

          {/* ── STEP 4: Email OTP (active when Ishaan sets email_confirm: false) */}
          {step === 4 && (
            <div>
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-4xl">mark_email_unread</span>
                </div>
              </div>

              <div className="mb-8 text-center">
                <h1 className="text-white text-4xl font-extrabold leading-tight tracking-tight">Check your email</h1>
                <p className="text-slate-400 text-base mt-3 leading-relaxed">We sent a 6-digit verification code to</p>
                <p className="text-primary font-bold text-base mt-1">{form.email}</p>
              </div>

              <div className="mb-4">
                <OtpInput digits={otpDigits} onChange={d => { setOtpDigits(d); setOtpError('') }} hasError={!!otpError} />
                {otpError && (
                  <p className="flex items-center justify-center gap-1.5 text-red-400 text-xs font-semibold mt-3">
                    <span className="material-symbols-outlined text-sm">error</span>
                    {otpError}
                  </p>
                )}
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex gap-3 mb-8">
                <span className="material-symbols-outlined text-primary flex-shrink-0 text-base mt-0.5">info</span>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Can't find it? Check your <span className="text-slate-300 font-semibold">spam folder</span>. The code expires in <span className="text-slate-300 font-semibold">10 minutes</span>.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button onClick={verifyOtp} disabled={loading || otpDigits.join('').length < OTP_LENGTH}
                  className="w-full h-14 bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2">
                  {loading ? (
                    <><span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>Verifying…</>
                  ) : (
                    <><span className="material-symbols-outlined">verified</span>Verify Email</>
                  )}
                </button>

                <div className="flex items-center justify-center gap-2 py-2">
                  {resendTimer > 0 ? (
                    <p className="text-slate-500 text-sm">
                      Resend code in <span className="text-slate-300 font-bold font-mono">{resendTimer}s</span>
                    </p>
                  ) : (
                    <button onClick={resendCode} disabled={resending}
                      className="flex items-center gap-1.5 text-primary text-sm font-semibold hover:underline disabled:opacity-50">
                      {resending
                        ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>Resending…</>
                        : <><span className="material-symbols-outlined text-sm">refresh</span>Resend code</>
                      }
                    </button>
                  )}
                </div>

                <button onClick={() => goTo(1)}
                  className="w-full h-12 text-slate-500 rounded-xl font-semibold text-sm hover:bg-slate-900 transition-colors flex items-center justify-center gap-1.5">
                  <span className="material-symbols-outlined text-base">edit</span>
                  Wrong email? Start over
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

      <footer className="py-6 px-6 text-center">
        <p className="text-slate-700 text-xs">© 2025 Healtho. All rights reserved.</p>
      </footer>
    </div>
  )
}
