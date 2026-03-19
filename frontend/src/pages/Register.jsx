import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'

const STEPS = {
  1: { label: '1', pct: '33%', width: '33%', hint: "Let's start with your account details..." },
  2: { label: '2', pct: '66%', width: '66%', hint: 'Your personalised plan is taking shape...' },
  3: { label: '3', pct: '99%', width: '99%', hint: 'Almost done — just one more thing!' },
}

const ACTIVITY_OPTIONS = [
  { value: 'sedentary',   emoji: '🪑', label: 'Sedentary',        sub: 'Little or no exercise, desk job' },
  { value: 'light',       emoji: '🚶', label: 'Lightly Active',   sub: 'Light exercise 1–3 days/week' },
  { value: 'moderate',    emoji: '🏃', label: 'Moderately Active',sub: 'Moderate exercise 3–5 days/week' },
  { value: 'active',      emoji: '💪', label: 'Very Active',      sub: 'Hard exercise 6–7 days/week' },
  { value: 'very_active', emoji: '🏋️', label: 'Athlete',          sub: 'Very hard exercise, physical job' },
]

// ── Validation ────────────────────────────────────────────────────────────────
function validateStep1({ name, email, password }) {
  const errors = {}
  if (!name.trim())
    errors.name = 'Full name is required'
  else if (name.trim().length < 2)
    errors.name = 'Name must be at least 2 characters'

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

function validateStep2({ age, height, weight }) {
  const errors = {}
  const a = parseInt(age)
  const h = parseFloat(height)
  const w = parseFloat(weight)

  if (!age)
    errors.age = 'Age is required'
  else if (isNaN(a) || a < 13 || a > 120)
    errors.age = 'Enter a valid age between 13 and 120'

  if (!height)
    errors.height = 'Height is required'
  else if (isNaN(h) || h < 50 || h > 300)
    errors.height = 'Enter a valid height (50–300 cm)'

  if (!weight)
    errors.weight = 'Weight is required'
  else if (isNaN(w) || w < 20 || w > 500)
    errors.weight = 'Enter a valid weight (20–500 kg)'

  return errors
}

function validateStep3({ activity }) {
  const errors = {}
  if (!activity)
    errors.activity = 'Please select your activity level'
  return errors
}

// ── Reusable error message ────────────────────────────────────────────────────
function FieldError({ message }) {
  if (!message) return null
  return (
    <p className="flex items-center gap-1.5 text-red-400 text-xs font-semibold mt-1">
      <span className="material-symbols-outlined text-sm">error</span>
      {message}
    </p>
  )
}

// ── BMI helpers ───────────────────────────────────────────────────────────────
function calcBMI(weight, height) {
  if (!weight || !height || height < 50 || weight < 20) return null
  return (weight / Math.pow(height / 100, 2)).toFixed(1)
}

function getBmiInfo(bmi) {
  const b = parseFloat(bmi)
  if (b < 18.5) return { label: 'Underweight — BMI below 18.5',     color: 'bg-blue-400',   text: 'text-blue-400',   pct: 20 }
  if (b < 25)   return { label: 'Healthy weight — BMI 18.5–24.9 ✓', color: 'bg-green-400',  text: 'text-green-400',  pct: 50 }
  if (b < 30)   return { label: 'Overweight — BMI 25–29.9',         color: 'bg-yellow-400', text: 'text-yellow-400', pct: 70 }
  return             { label: 'Obese range — BMI 30+',             color: 'bg-red-400',    text: 'text-red-400',    pct: 90 }
}

// ── Input class helpers ───────────────────────────────────────────────────────
function inputClass(errors, field, extra = '') {
  return `w-full bg-slate-900 border rounded-xl h-14 px-4 text-base text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 transition-all ${extra} ${
    errors[field]
      ? 'border-red-500/70 focus:border-red-500 focus:ring-red-500/20'
      : 'border-slate-800 focus:border-primary focus:ring-primary/20'
  }`
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Register() {
  const navigate = useNavigate()
  const [step, setStep]       = useState(1)
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors]   = useState({})
  const [serverError, setServerError] = useState('')
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    age: '', height: '', weight: '',
    activity: '',
  })

  const set = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }))
    if (errors[field]) setErrors(er => ({ ...er, [field]: '' }))
  }

  const bmi     = calcBMI(parseFloat(form.weight), parseFloat(form.height))
  const bmiInfo = bmi ? getBmiInfo(bmi) : null

  const goTo = (n) => {
    setErrors({})
    setStep(n)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const nextStep = (targetStep, validator) => {
    const errs = validator(form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    goTo(targetStep)
  }

  const submit = async () => {
    const errs = validateStep3(form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setLoading(true)
    setServerError('')
    try {
      // TODO: replace with → await signUp({ email, password, name, age, weight_kg, height_cm, activity_level })
      // import { signUp } from '../lib/supabase'
      await new Promise(r => setTimeout(r, 900)) // simulate network
      const params = new URLSearchParams({
        name:     form.name,
        email:    form.email,
        age:      form.age,
        height:   form.height,
        weight:   form.weight,
        activity: form.activity,
      })
      navigate('/profile?' + params.toString())
    } catch (err) {
      setServerError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const s = STEPS[step]

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-[520px]">

          {/* Progress indicator */}
          <div className="flex flex-col gap-3 mb-10">
            <div className="flex items-center justify-between">
              <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Step {s.label} of 3</p>
              <p className="text-primary text-sm font-bold">{s.pct}</p>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: s.width }} />
            </div>
            <p className="text-slate-500 text-sm font-medium italic">{s.hint}</p>
          </div>

          {/* ── STEP 1: Account Details ── */}
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
                {/* Name */}
                <div className="flex flex-col gap-1">
                  <label className="text-slate-300 text-sm font-semibold flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-primary text-xl">person</span>
                    Full Name
                  </label>
                  <input
                    type="text" value={form.name} onChange={set('name')}
                    onKeyDown={e => e.key === 'Enter' && nextStep(2, validateStep1)}
                    placeholder="e.g. Ayush Sharma"
                    className={inputClass(errors, 'name')}
                  />
                  <FieldError message={errors.name} />
                </div>

                {/* Email */}
                <div className="flex flex-col gap-1">
                  <label className="text-slate-300 text-sm font-semibold flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-primary text-xl">mail</span>
                    Email
                  </label>
                  <input
                    type="email" value={form.email} onChange={set('email')}
                    onKeyDown={e => e.key === 'Enter' && nextStep(2, validateStep1)}
                    placeholder="example@email.com"
                    className={inputClass(errors, 'email')}
                  />
                  <FieldError message={errors.email} />
                </div>

                {/* Password */}
                <div className="flex flex-col gap-1">
                  <label className="text-slate-300 text-sm font-semibold flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-primary text-xl">lock</span>
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'} value={form.password} onChange={set('password')}
                      onKeyDown={e => e.key === 'Enter' && nextStep(2, validateStep1)}
                      placeholder="Minimum 8 characters"
                      className={inputClass(errors, 'password', 'pr-12')}
                    />
                    <button
                      type="button" onClick={() => setShowPwd(v => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      <span className="material-symbols-outlined">{showPwd ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                  <FieldError message={errors.password} />
                </div>
              </div>

              {/* Divider */}
              <div className="relative py-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background-dark px-4 text-slate-500 font-medium">Or sign up with</span>
                </div>
              </div>

              {/* Social */}
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

              <button
                onClick={() => nextStep(2, validateStep1)}
                className="w-full h-14 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold text-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 group"
              >
                Continue
                <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span>
              </button>

              <p className="text-center text-slate-500 text-xs mt-6">
                By continuing, you agree to our{' '}
                <a href="#" className="text-primary hover:underline">Terms</a> and{' '}
                <a href="#" className="text-primary hover:underline">Privacy Policy</a>
              </p>
            </div>
          )}

          {/* ── STEP 2: Body Metrics ── */}
          {step === 2 && (
            <div>
              <div className="mb-8">
                <h1 className="text-white text-4xl font-extrabold leading-tight tracking-tight">Your body metrics</h1>
                <p className="text-slate-400 text-lg mt-2">Used to calculate your BMI and personalised daily calorie goal.</p>
              </div>

              {/* Unit toggle */}
              <div className="flex mb-8">
                <div className="flex h-12 w-full items-center rounded-xl bg-slate-800/50 p-1.5">
                  {['Metric (kg, cm)', 'Imperial (lb, ft)'].map((label, i) => (
                    <label key={i} className="flex cursor-pointer h-full grow items-center justify-center rounded-lg px-4 transition-all has-[:checked]:bg-slate-700 has-[:checked]:text-primary text-slate-400 text-base font-semibold">
                      <span>{label}</span>
                      <input defaultChecked={i === 0} className="hidden" name="unit-toggle" type="radio"/>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-5">
                {/* Age */}
                <div className="flex flex-col gap-1">
                  <label className="text-slate-300 text-base font-semibold flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-primary text-xl">calendar_today</span>
                    Age
                  </label>
                  <input
                    type="number" min="13" max="120" value={form.age} onChange={set('age')}
                    placeholder="e.g. 27"
                    className={inputClass(errors, 'age')}
                  />
                  <FieldError message={errors.age} />
                </div>

                {/* Height + Weight */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-300 text-base font-semibold flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-primary text-xl">height</span>
                      Height
                    </label>
                    <div className="relative">
                      <input
                        type="number" value={form.height} onChange={set('height')}
                        placeholder="175"
                        className={inputClass(errors, 'height', 'pr-12')}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">cm</span>
                    </div>
                    <FieldError message={errors.height} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-300 text-base font-semibold flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-primary text-xl">monitor_weight</span>
                      Weight
                    </label>
                    <div className="relative">
                      <input
                        type="number" value={form.weight} onChange={set('weight')}
                        placeholder="70"
                        className={inputClass(errors, 'weight', 'pr-12')}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">kg</span>
                    </div>
                    <FieldError message={errors.weight} />
                  </div>
                </div>
              </div>

              {/* Live BMI */}
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
                <button
                  onClick={() => nextStep(3, validateStep2)}
                  className="w-full h-14 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold text-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 group"
                >
                  Continue
                  <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span>
                </button>
                <button onClick={() => goTo(1)} className="w-full h-12 text-slate-400 rounded-xl font-semibold text-base hover:bg-slate-800 transition-colors">Back</button>
              </div>

              <div className="mt-6 p-4 bg-slate-900 border border-slate-800 rounded-xl flex gap-3">
                <span className="material-symbols-outlined text-primary flex-shrink-0">info</span>
                <p className="text-sm text-slate-400 leading-relaxed">Your data is stored securely and only used to personalise your nutrition and health goals.</p>
              </div>
            </div>
          )}

          {/* ── STEP 3: Activity Level ── */}
          {step === 3 && (
            <div>
              <div className="mb-8">
                <h1 className="text-white text-4xl font-extrabold leading-tight tracking-tight">How active are you?</h1>
                <p className="text-slate-400 text-lg mt-2">This fine-tunes your daily calorie target to match your lifestyle.</p>
              </div>

              <div className="flex flex-col gap-3">
                {ACTIVITY_OPTIONS.map(opt => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      form.activity === opt.value
                        ? 'border-primary bg-primary/10'
                        : errors.activity
                          ? 'border-red-500/50 bg-slate-900 hover:border-red-500/70'
                          : 'border-slate-800 bg-slate-900 hover:border-primary/50'
                    }`}
                    onClick={() => {
                      setForm(f => ({ ...f, activity: opt.value }))
                      if (errors.activity) setErrors(er => ({ ...er, activity: '' }))
                    }}
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-xl flex-shrink-0">{opt.emoji}</div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-100">{opt.label}</p>
                      <p className="text-slate-500 text-sm">{opt.sub}</p>
                    </div>
                    <span className={`material-symbols-outlined text-primary transition-opacity ${form.activity === opt.value ? 'opacity-100' : 'opacity-0'}`}>
                      check_circle
                    </span>
                  </label>
                ))}
              </div>

              {/* Activity error */}
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
                <button
                  onClick={submit}
                  disabled={loading}
                  className="w-full h-14 bg-primary hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
                      Creating your account…
                    </>
                  ) : (
                    'Create My Account 🎉'
                  )}
                </button>
                <button onClick={() => goTo(2)} className="w-full h-12 text-slate-400 rounded-xl font-semibold text-base hover:bg-slate-800 transition-colors">Back</button>
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
