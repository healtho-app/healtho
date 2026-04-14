import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Header from '../components/Header'
import { supabase } from '../lib/supabase'

// ── Countries (US + India pinned, then alphabetical) ─────────────────────────
const COUNTRIES = [
  'United States', 'India',
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda',
  'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan',
  'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize',
  'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil',
  'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi',
  'Cabo Verde', 'Cambodia', 'Cameroon', 'Canada', 'Central African Republic', 'Chad',
  'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica', 'Croatia', 'Cuba',
  'Cyprus', 'Czech Republic',
  'Democratic Republic of the Congo', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic',
  'East Timor', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea',
  'Estonia', 'Eswatini', 'Ethiopia',
  'Fiji', 'Finland', 'France',
  'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala',
  'Guinea', 'Guinea-Bissau', 'Guyana',
  'Haiti', 'Honduras', 'Hungary',
  'Iceland', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy',
  'Ivory Coast', 'Jamaica', 'Japan', 'Jordan',
  'Kazakhstan', 'Kenya', 'Kiribati', 'Kosovo', 'Kuwait', 'Kyrgyzstan',
  'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein',
  'Lithuania', 'Luxembourg',
  'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands',
  'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia',
  'Montenegro', 'Morocco', 'Mozambique', 'Myanmar',
  'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger',
  'Nigeria', 'North Korea', 'North Macedonia', 'Norway',
  'Oman',
  'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru',
  'Philippines', 'Poland', 'Portugal',
  'Qatar',
  'Romania', 'Russia', 'Rwanda',
  'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa',
  'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia',
  'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands',
  'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka',
  'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria',
  'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Togo', 'Tonga',
  'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu',
  'UAE', 'Uganda', 'Ukraine', 'United Kingdom', 'Uruguay', 'Uzbekistan',
  'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam',
  'Yemen',
  'Zambia', 'Zimbabwe',
]

// ── Phone validation ─────────────────────────────────────────────────────────
function validatePhone(phone) {
  if (!phone) return '' // optional
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 7) return 'Phone number too short (min 7 digits)'
  if (digits.length > 15) return 'Phone number too long (max 15 digits)'
  if (!/^[+\d\s().-]+$/.test(phone)) return 'Phone contains invalid characters'
  return ''
}

// ── Step config — 4 visible steps: details → metrics → goal → activity ───────
// [OTP-REMOVED] Step 2 (email OTP verification) bypassed for pre-MVP testing.
// Re-enable: turn "Confirm email" back ON in Supabase Auth settings. Step 2 UI
// and verifyEmail/resendEmailCode functions are preserved below, just unreachable.
const STEPS = {
  1: { label: '1', pct: '25%',  width: '25%',  hint: "Let's start with your account details..." },
  2: { label: '2', pct: '50%',  width: '50%',  hint: 'Check your inbox — enter the 8-digit code.' }, // [OTP-REMOVED] unreachable
  3: { label: '2', pct: '50%',  width: '50%',  hint: 'Your personalised plan is taking shape...' },
  5: { label: '3', pct: '75%',  width: '75%',  hint: 'Set your goal — we\u2019ll personalise your plan.' },
  6: { label: '4', pct: '100%', width: '100%', hint: 'Almost done — just one more thing!' },
}

const GOAL_OPTIONS = [
  { value: 'lose',     emoji: '🏋️', label: 'Lose Weight',     sub: 'Burn more than you eat to shed fat' },
  { value: 'maintain', emoji: '⚖️', label: 'Maintain Weight', sub: 'Stay at your current weight' },
  { value: 'gain',     emoji: '💪', label: 'Gain Weight',     sub: 'Build mass with a calorie surplus' },
]

const RATE_OPTIONS_KG = [
  { value: '0.25', label: '0.25 kg/week', sub: 'Gentle' },
  { value: '0.5',  label: '0.5 kg/week',  sub: 'Recommended' },
  { value: '0.75', label: '0.75 kg/week', sub: 'Moderate' },
  { value: '1',    label: '1 kg/week',    sub: 'Aggressive' },
]

const RATE_OPTIONS_LB = [
  { value: '0.25', label: '0.5 lb/week',  sub: 'Gentle' },
  { value: '0.5',  label: '1 lb/week',    sub: 'Recommended' },
  { value: '0.75', label: '1.5 lb/week',  sub: 'Moderate' },
  { value: '1',    label: '2 lb/week',    sub: 'Aggressive' },
]

const ACTIVITY_OPTIONS = [
  { value: 'sedentary',         emoji: '🪑', label: 'Sedentary',         sub: 'Little or no exercise, desk job' },
  { value: 'lightly_active',    emoji: '🚶', label: 'Lightly Active',    sub: 'Light exercise 1–3 days/week' },
  { value: 'moderately_active', emoji: '🏃', label: 'Moderately Active', sub: 'Moderate exercise 3–5 days/week' },
  { value: 'very_active',       emoji: '💪', label: 'Very Active',       sub: 'Hard exercise 6–7 days/week' },
  { value: 'athlete',           emoji: '🏋️', label: 'Athlete',           sub: 'Very hard exercise, physical job' },
]

const OTP_LENGTH     = 8
const RESEND_SECONDS = 30

// ── Allowed email domains ─────────────────────────────────────────────────────
// [OTP-REMOVED] Domain whitelist disabled for pre-MVP testing — testers may use
// company or custom domains. Re-enable at MVP by uncommenting the Set below and
// restoring the domain check in validateStep1.
// const ALLOWED_DOMAINS = new Set([
//   'gmail.com', 'googlemail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
//   'live.com', 'icloud.com', 'me.com', 'protonmail.com', 'proton.me', ...
// ])

// ── Validation ────────────────────────────────────────────────────────────────
function validateStep1({ name, username, email, password }) {
  const errors = {}
  if (!name.trim())                errors.name     = 'Full name is required'
  else if (name.trim().length < 2) errors.name     = 'Name must be at least 2 characters'
  if (!username.trim())                        errors.username = 'Username is required'
  else if (username.length < 3)                errors.username = 'Username must be at least 3 characters'
  else if (username.length > 20)               errors.username = 'Username must be 20 characters or less'
  else if (!/^[a-z0-9_]+$/.test(username))     errors.username = 'Only letters, numbers, and underscores allowed'
  if (!email.trim()) {
    errors.email = 'Email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter a valid email address'
  }
  // [OTP-REMOVED] Domain whitelist check removed for pre-MVP testing.
  if (!password)                   errors.password = 'Password is required'
  else if (password.length < 8)    errors.password = 'Password must be at least 8 characters'
  else if (!/(?=.*[0-9!@#$%^&*])/.test(password)) errors.password = 'Include at least one number or symbol'
  return errors
}

// Compute total inches from separate ft + in fields
function totalInchesFromFtIn(ft, inches) {
  return (parseInt(ft) || 0) * 12 + (parseInt(inches) || 0)
}

function validateStep3({ gender, age, height, heightFt, heightIn, weight, unit_system }) {
  const errors = {}
  if (!gender) errors.gender = 'Please select your gender'
  const a = parseInt(age), w = parseFloat(weight)
  const imperial = unit_system === 'imperial'
  if (!age || isNaN(a) || a < 10 || a > 120) errors.age = 'Enter a valid age between 10 and 120'

  if (imperial) {
    const ft = parseInt(heightFt)
    const totalIn = totalInchesFromFtIn(heightFt, heightIn)
    if (!heightFt || isNaN(ft) || ft < 0) {
      errors.height = 'Enter a valid height'
    } else if (totalIn < 20 || totalIn > 108) {
      errors.height = 'Height must be between 1\'8″ and 9\'0″'
    }
  } else {
    const h = parseFloat(height)
    if (!height || isNaN(h) || h <= 0) {
      errors.height = 'Enter a valid height'
    } else if (h < 50 || h > 300) {
      errors.height = 'Enter a valid height (50–300 cm)'
    }
  }

  if (!weight || isNaN(w) || w <= 0) {
    errors.weight = 'Enter a valid weight'
  } else if (imperial ? (w < 44 || w > 1100) : (w < 20 || w > 500)) {
    errors.weight = imperial ? 'Enter a valid weight (44–1100 lb)' : 'Enter a valid weight (20–500 kg)'
  }
  return errors
}

function validateStep5({ fitness_goal, weekly_rate_kg, goal_weight, weight, height, heightFt, heightIn, unit_system }) {
  const errors = {}
  if (!fitness_goal) errors.fitness_goal = 'Please select your fitness goal'
  if (fitness_goal && fitness_goal !== 'maintain') {
    const rate = parseFloat(weekly_rate_kg)
    if (!weekly_rate_kg || isNaN(rate) || rate < 0.25 || rate > 1) errors.weekly_rate_kg = 'Please select a weekly rate'

    // Goal weight validation
    const gw = parseFloat(goal_weight)
    const imperial = unit_system === 'imperial'
    if (!goal_weight || isNaN(gw) || gw <= 0) {
      errors.goal_weight = 'Enter your goal weight'
    } else if (imperial ? (gw < 66 || gw > 660) : (gw < 30 || gw > 300)) {
      errors.goal_weight = imperial ? 'Enter a valid weight (66–660 lb)' : 'Enter a valid weight (30–300 kg)'
    } else {
      // Convert to metric for BMI + direction checks
      const goalKg    = imperial ? gw * 0.453592 : gw
      const currentKg = imperial ? parseFloat(weight) * 0.453592 : parseFloat(weight)
      const heightCm  = imperial ? totalInchesFromFtIn(heightFt, heightIn) * 2.54 : parseFloat(height)

      // Direction check
      if (fitness_goal === 'lose' && goalKg >= currentKg) {
        errors.goal_weight = 'Goal weight must be less than your current weight for a weight loss goal'
      } else if (fitness_goal === 'gain' && goalKg <= currentKg) {
        errors.goal_weight = 'Goal weight must be more than your current weight for a weight gain goal'
      }

      // BMI floor/ceiling safety check
      if (!errors.goal_weight && heightCm > 0) {
        const goalBmi = goalKg / Math.pow(heightCm / 100, 2)
        if (goalBmi < 18.5) {
          errors.goal_weight = `This goal weight would put your BMI at ${goalBmi.toFixed(1)} (underweight). Please choose a higher target.`
        } else if (goalBmi > 40) {
          errors.goal_weight = `This goal weight would put your BMI at ${goalBmi.toFixed(1)}. Please choose a lower target.`
        }
      }
    }
  }
  return errors
}

function validateStep4({ activity }) {
  return activity ? {} : { activity: 'Please select your activity level' }
}

// ── Shared UI ─────────────────────────────────────────────────────────────────
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

// ── BMI helpers ───────────────────────────────────────────────────────────────
function calcBMI(weight, height, unit_system) {
  if (!weight || !height || weight <= 0 || height <= 0) return null
  const imperial = unit_system === 'imperial'
  const w = imperial ? weight * 0.453592 : weight
  const h = imperial ? height * 2.54     : height
  if (h < 50 || w < 20) return null
  return (w / Math.pow(h / 100, 2)).toFixed(1)
}

function getBmiInfo(bmi) {
  const b = parseFloat(bmi)
  if (b < 18.5) return { label: 'Underweight — BMI below 18.5',     color: 'bg-blue-400',   text: 'text-blue-400',   pct: 20 }
  if (b < 25)   return { label: 'Healthy weight — BMI 18.5–24.9 ✓', color: 'bg-green-400',  text: 'text-green-400',  pct: 50 }
  if (b < 30)   return { label: 'Overweight — BMI 25–29.9',         color: 'bg-yellow-400', text: 'text-yellow-400', pct: 70 }
  return             { label: 'Obese range — BMI 30+',              color: 'bg-red-400',    text: 'text-red-400',    pct: 90 }
}

// ── OTP input ─────────────────────────────────────────────────────────────────
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
    <div className="flex gap-1.5 sm:gap-3 justify-center" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => refs.current[i] = el}
          type="text" inputMode="numeric" maxLength={1}
          value={d}
          onChange={e => handleInput(i, e)}
          onKeyDown={e => handleKey(i, e)}
          className={`w-8 h-10 sm:w-12 sm:h-14 text-center text-lg sm:text-2xl font-extrabold font-mono rounded-lg sm:rounded-xl border-2 bg-slate-900 text-slate-100 focus:outline-none focus:ring-2 transition-all ${
            d ? 'border-primary text-primary'
              : hasError
                ? 'border-red-500/70 focus:border-red-500 focus:ring-red-500/20'
                : 'border-slate-700 focus:border-primary focus:ring-primary/20'
          }`}
        />
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Register() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [step,        setStep]       = useState(1)
  const [showPwd,     setShowPwd]    = useState(false)
  const [loading,       setLoading]       = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [errors,        setErrors]        = useState({})
  const [serverError,   setServerError]   = useState('')
  const [isDuplicate,   setIsDuplicate]   = useState(false)  // true when email already exists

  // Email OTP state
  const [otpDigits,   setOtpDigits]  = useState(Array(OTP_LENGTH).fill(''))
  const [otpError,    setOtpError]   = useState('')
  const [resendTimer, setResendTimer] = useState(0)
  const [resending,   setResending]  = useState(false)

  const [form, setForm] = useState({
    name: '', username: '', email: '', password: '',
    unit_system: 'metric',
    gender: '',
    age: '', height: '', heightFt: '', heightIn: '', weight: '',
    fitness_goal: '', weekly_rate_kg: '0.5', goal_weight: '',
    activity: '',
    country: '', phone: '',
  })
  const [countrySearch, setCountrySearch] = useState('')
  const [countryOpen,   setCountryOpen]   = useState(false)
  const [countryIdx,    setCountryIdx]    = useState(-1)
  const countryRef = useRef(null)
  const countryListRef = useRef(null)

  const set = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }))
    if (errors[field]) setErrors(er => ({ ...er, [field]: '' }))
    if (field === 'email') setIsDuplicate(false)
  }

  // Height/weight: strip negatives on change (covers paste), block keys (covers typing)
  const setPositiveNum = (field) => (e) => {
    const val = e.target.value.replace(/-/g, '')
    setForm(f => ({ ...f, [field]: val }))
    // heightFt/heightIn share the 'height' error key
    const errorField = (field === 'heightFt' || field === 'heightIn') ? 'height' : field
    if (errors[errorField]) setErrors(er => ({ ...er, [errorField]: '' }))
  }

  // Unit system toggle — converts height/weight between metric ↔ imperial
  const switchUnitSystem = (newSystem) => {
    if (newSystem === form.unit_system) return
    const updated = { ...form, unit_system: newSystem }
    if (newSystem === 'imperial' && form.unit_system === 'metric') {
      const cm = parseFloat(form.height)
      if (!isNaN(cm) && cm > 0) {
        const totalIn = cm / 2.54
        updated.heightFt = String(Math.floor(totalIn / 12))
        updated.heightIn = String(Math.round(totalIn % 12))
        updated.height = ''
      }
      const kg = parseFloat(form.weight)
      if (!isNaN(kg) && kg > 0) updated.weight = String(parseFloat((kg / 0.453592).toFixed(1)))
    } else if (newSystem === 'metric' && form.unit_system === 'imperial') {
      const totalIn = totalInchesFromFtIn(form.heightFt, form.heightIn)
      if (totalIn > 0) {
        updated.height = String(parseFloat((totalIn * 2.54).toFixed(1)))
        updated.heightFt = ''
        updated.heightIn = ''
      }
      const lb = parseFloat(form.weight)
      if (!isNaN(lb) && lb > 0) updated.weight = String(parseFloat((lb * 0.453592).toFixed(1)))
    }
    setForm(updated)
    if (errors.height || errors.weight) setErrors(er => ({ ...er, height: '', weight: '' }))
  }
  const blockNegativeKeys = (e) => {
    if (['-', 'e', 'E', '+'].includes(e.key)) e.preventDefault()
  }

  // Username: auto-lowercase, strip invalid chars
  const setUsername = (e) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
    setForm(f => ({ ...f, username: val }))
    if (errors.username) setErrors(er => ({ ...er, username: '' }))
  }

  const signInWithGoogle = async () => {
    setGoogleLoading(true)
    setServerError('')
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) throw error
    } catch {
      setServerError('Could not connect to Google. Please try again.')
      setGoogleLoading(false)
    }
  }

  // Google OAuth users land here at ?google=1 — skip account + OTP steps
  useEffect(() => {
    if (searchParams.get('google') === '1') setStep(3)
  }, [searchParams])

  const imperialHeight = form.unit_system === 'imperial' ? totalInchesFromFtIn(form.heightFt, form.heightIn) : 0
  const bmi     = calcBMI(parseFloat(form.weight), form.unit_system === 'imperial' ? imperialHeight : parseFloat(form.height), form.unit_system)
  const bmiInfo = bmi ? getBmiInfo(bmi) : null

  const goTo = (n) => {
    setErrors({})
    setServerError('')
    setStep(n)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return
    const t = setTimeout(() => setResendTimer(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendTimer])

  // Close country dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (countryRef.current && !countryRef.current.contains(e.target)) setCountryOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Scroll active country into view on keyboard nav
  useEffect(() => {
    if (countryIdx >= 0 && countryListRef.current) {
      const item = countryListRef.current.children[countryIdx]
      if (item) item.scrollIntoView({ block: 'nearest' })
    }
  }, [countryIdx])

  const filteredCountries = countrySearch
    ? COUNTRIES.filter(c => c.toLowerCase().includes(countrySearch.toLowerCase()))
    : COUNTRIES

  // ── Helper: seed profile (upsert → fallback to update) ───────────────────
  const seedProfile = async (userId, payload) => {
    const { error: upsertError } = await supabase.from('profiles').upsert(
      { id: userId, ...payload },
      { onConflict: 'id' }
    )
    if (upsertError?.code === '23505') throw upsertError   // username taken — let caller handle
    if (upsertError) {
      // RLS may block INSERT half of upsert — row likely exists from DB trigger, try UPDATE
      console.error('[seedProfile] upsert failed, trying update fallback:', upsertError)
      const { error: updateError } = await supabase.from('profiles').update(payload).eq('id', userId)
      if (updateError?.code === '23505') throw updateError
      if (updateError) console.error('[seedProfile] update fallback also failed:', updateError)
    }
  }

  // ── Step 1: Create account ────────────────────────────────────────────────
  const submitStep1 = async () => {
    const errs = validateStep1(form)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    const normalizedEmail = form.email.trim().toLowerCase()

    setLoading(true)
    setServerError('')
    setIsDuplicate(false)
    try {
      const { data, error } = await supabase.auth.signUp({
        email:    normalizedEmail,
        password: form.password,
        options:  { data: { full_name: form.name.trim() } },
      })
      if (error) throw error

      // When email confirmation is ON, Supabase returns a fake user object with an
      // empty identities array for duplicate emails (prevents enumeration on their end).
      // Older Supabase versions return { user: null } — both cases handled here.
      if (!data.user || data.user.identities?.length === 0) {
        setIsDuplicate(true)
        return
      }

      if (data.session) {
        // Confirm email is OFF — session returned immediately, seed profile and skip OTP
        const profilePayload = {
          full_name:         form.name.trim(),
          username:          form.username.toLowerCase(),
          email:             normalizedEmail,
          registration_step: 1,
        }
        try {
          await seedProfile(data.user.id, profilePayload)
        } catch (profileErr) {
          if (profileErr?.code === '23505') {
            setErrors(er => ({ ...er, username: 'Username already taken — try another' }))
            return
          }
        }
        goTo(3) // skip email OTP, go straight to metrics
      } else {
        // Confirm email is ON — go to email OTP step
        goTo(2)
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

  // ── Step 2: Verify email OTP ──────────────────────────────────────────────
  const verifyEmail = async () => {
    const code = otpDigits.join('')
    if (code.length < OTP_LENGTH) { setOtpError('Enter the full 8-digit code from your email'); return }

    setLoading(true)
    setOtpError('')
    try {
      // verifyOtp returns the user directly — use it to avoid a separate getUser() call
      const { data: otpData, error } = await supabase.auth.verifyOtp({ email: form.email, token: code, type: 'signup' })
      if (error) throw error

      // Seed profile now that email is confirmed
      const userId = otpData?.user?.id
      if (userId) {
        const profilePayload = {
          full_name:         form.name.trim(),
          username:          form.username.toLowerCase(),
          email:             form.email.trim().toLowerCase(),
          registration_step: 1,
        }
        try {
          await seedProfile(userId, profilePayload)
        } catch (profileErr) {
          if (profileErr?.code === '23505') {
            setOtpError('Username already taken — go back and choose another.')
            return
          }
        }
      } else {
        console.error('[verifyEmail] verifyOtp succeeded but returned no user:', otpData)
      }

      goTo(3) // proceed to body metrics
    } catch (err) {
      setOtpError(err.message || 'Invalid or expired code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Resend email code ─────────────────────────────────────────────────────
  const resendEmailCode = async () => {
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

  // ── Step 3: Body metrics ──────────────────────────────────────────────────
  const submitMetrics = async () => {
    const errs = validateStep3(form)
    // Phone validation (optional field)
    const phoneErr = validatePhone(form.phone)
    if (phoneErr) errs.phone = phoneErr
    // Country validation (optional but must be from list if provided)
    if (form.country && !COUNTRIES.includes(form.country)) errs.country = 'Please select a country from the list'
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setLoading(true)
    setServerError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Session expired. Please start over.')

      const isImperial = form.unit_system === 'imperial'
      const weight_kg  = isImperial ? parseFloat((parseFloat(form.weight) * 0.453592).toFixed(2)) : parseFloat(form.weight)
      const totalIn    = isImperial ? totalInchesFromFtIn(form.heightFt, form.heightIn) : 0
      const height_cm  = isImperial ? parseFloat((totalIn * 2.54).toFixed(2)) : parseFloat(form.height)
      const bmiVal     = parseFloat((weight_kg / Math.pow(height_cm / 100, 2)).toFixed(1))

      const { error } = await supabase.from('profiles').upsert({
        id:                user.id,
        unit_system:       form.unit_system,
        gender:            form.gender || null,
        age:               parseInt(form.age),
        height_cm,
        weight_kg,
        bmi:               bmiVal,
        country:           form.country.trim() || null,
        phone_number:      form.phone.trim()   || null,
        registration_step: 2,
      }, { onConflict: 'id' })

      if (error) throw error
      goTo(5)
    } catch (err) {
      setServerError(err.message || 'Could not save your metrics. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 5: Fitness goal ───────────────────────────────────────────────────
  const submitFitnessGoal = async () => {
    const errs = validateStep5(form)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setLoading(true)
    setServerError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Session expired. Please start over.')

      const isImperialGoal = form.unit_system === 'imperial'
      const goalWeightKg   = form.fitness_goal === 'maintain' ? null
        : isImperialGoal ? parseFloat((parseFloat(form.goal_weight) * 0.453592).toFixed(2))
        : parseFloat(form.goal_weight)

      const { error } = await supabase.from('profiles').upsert({
        id:              user.id,
        fitness_goal:    form.fitness_goal,
        weekly_rate_kg:  form.fitness_goal === 'maintain' ? null : parseFloat(form.weekly_rate_kg),
        goal_weight_kg:  goalWeightKg,
      }, { onConflict: 'id' })

      if (error) throw error
      goTo(6)
    } catch (err) {
      setServerError(err.message || 'Could not save your goal. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 6: Activity level — registration complete ────────────────────────
  const submitActivity = async () => {
    const errs = validateStep4(form)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setLoading(true)
    setServerError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Session expired. Please start over.')

      const isImperial  = form.unit_system === 'imperial'
      const weight_kg   = isImperial ? parseFloat(form.weight) * 0.453592 : parseFloat(form.weight)
      const totalIn4    = isImperial ? totalInchesFromFtIn(form.heightFt, form.heightIn) : 0
      const height_cm   = isImperial ? totalIn4 * 2.54 : parseFloat(form.height)
      const genderOffset = form.gender === 'M' ? 5 : form.gender === 'F' ? -161 : -78
      const bmr         = 10 * weight_kg + 6.25 * height_cm - 5 * parseInt(form.age) + genderOffset
      const multipliers = { sedentary: 1.2, lightly_active: 1.375, moderately_active: 1.55, very_active: 1.725, athlete: 1.9 }
      const tdee        = Math.round(bmr * multipliers[form.activity])

      // Adjust calorie goal based on fitness goal:
      // 1 kg body fat ≈ 7,700 kcal → per week ÷ 7 = 1,100 kcal/day per kg/week
      // Lose: deficit (subtract), Gain: surplus (add), Maintain: no change
      const rateKg  = form.fitness_goal === 'maintain' ? 0 : (parseFloat(form.weekly_rate_kg) || 0.5)
      const goalAdj = form.fitness_goal === 'lose' ? -1 : form.fitness_goal === 'gain' ? 1 : 0
      const adjustedGoal = Math.max(1200, Math.round(tdee + goalAdj * rateKg * 1100))

      const { error } = await supabase.from('profiles').upsert({
        id:                  user.id,
        full_name:           form.name.trim() || user.user_metadata?.full_name || '',
        email:               form.email.trim() || user.email || '',
        activity_level:      form.activity,
        fitness_goal:        form.fitness_goal || null,
        weekly_rate_kg:      form.fitness_goal === 'maintain' ? null : parseFloat(form.weekly_rate_kg) || null,
        daily_calorie_goal:  adjustedGoal,
        registration_step:   3,
        is_onboarded:        true,
        is_profile_complete: true,
        timezone:            Intl.DateTimeFormat().resolvedOptions().timeZone,
      }, { onConflict: 'id' })

      if (error) throw error

      // For Google OAuth users form.name/email may be empty — fall back to Google metadata
      const displayName = form.name.trim() || user.user_metadata?.full_name || ''
      const displayEmail = form.email.trim() || user.email || ''

      const params = new URLSearchParams({
        name: displayName, username: form.username, email: displayEmail,
        age: form.age,
        height: form.unit_system === 'imperial' ? String(totalInchesFromFtIn(form.heightFt, form.heightIn)) : form.height,
        weight: form.weight,
        activity: form.activity, daily_calorie_goal: adjustedGoal,
      })
      navigate('/profile?' + params.toString())
    } catch (err) {
      setServerError(err.message || 'Could not complete registration. Please try again.')
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

              {isDuplicate ? (
                <div role="alert" className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-6">
                  <span className="material-symbols-outlined text-amber-400 mt-0.5">person_check</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-amber-300 text-sm font-bold">This email is already registered.</p>
                    <p className="text-amber-400/80 text-xs mt-0.5">An account with this email already exists.</p>
                    <button
                      onClick={() => navigate('/login', { state: { prefillEmail: form.email.trim().toLowerCase() } })}
                      className="mt-2 text-xs font-bold text-amber-300 hover:text-white bg-amber-500/20 hover:bg-amber-500/40 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-sm">login</span>
                      Log in instead
                    </button>
                  </div>
                </div>
              ) : serverError ? (
                <div role="alert" className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl mb-6">
                  <span className="material-symbols-outlined text-red-400">warning</span>
                  <p className="text-red-400 text-sm font-semibold">{serverError}</p>
                </div>
              ) : null}

              <div className="space-y-5">
                {/* Full Name */}
                <div className="flex flex-col gap-1">
                  <label className="text-slate-300 text-sm font-semibold flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-primary text-xl">person</span>Full Name
                  </label>
                  <input type="text" value={form.name} onChange={set('name')}
                    onKeyDown={e => e.key === 'Enter' && submitStep1()}
                    placeholder="e.g. Ayush Sharma" className={inputClass(errors, 'name')} />
                  <FieldError message={errors.name} />
                </div>

                {/* Username */}
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
                  <p className="text-slate-600 text-xs mt-0.5">Letters, numbers and underscores only.</p>
                  <FieldError message={errors.username} />
                </div>

                {/* Email */}
                <div className="flex flex-col gap-1">
                  <label className="text-slate-300 text-sm font-semibold flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-primary text-xl">mail</span>Email
                  </label>
                  <input type="email" value={form.email} onChange={set('email')}
                    onKeyDown={e => e.key === 'Enter' && submitStep1()}
                    placeholder="example@email.com" className={inputClass(errors, 'email')} />
                  <FieldError message={errors.email} />
                </div>

                {/* Password */}
                <div className="flex flex-col gap-1">
                  <label className="text-slate-300 text-sm font-semibold flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-primary text-xl">lock</span>Password
                  </label>
                  <div className="relative">
                    <input type={showPwd ? 'text' : 'password'} value={form.password} onChange={set('password')}
                      onKeyDown={e => e.key === 'Enter' && submitStep1()}
                      placeholder="Min 8 chars, include a number or symbol"
                      className={inputClass(errors, 'password', 'pr-12')} />
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
                  <span className="bg-[#0f172a] px-4 text-slate-500 font-medium">Or sign up with</span>
                </div>
              </div>

              <button
                onClick={signInWithGoogle}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 h-12 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors mb-8"
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

              <button onClick={submitStep1} disabled={loading}
                className="w-full h-14 bg-primary hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 group">
                {loading ? (
                  <><span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>Creating account…</>
                ) : (
                  <>Continue<span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span></>
                )}
              </button>

              <p className="text-center text-slate-500 text-xs mt-4">
                By continuing, you agree to our{' '}
                <Link to="/terms" className="text-primary hover:underline">Terms</Link> and{' '}
                <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
              </p>

              <p className="text-center text-slate-500 text-sm mt-5">
                Already have an account?{' '}
                <Link to="/login" className="text-primary font-bold hover:underline">Log in</Link>
              </p>
            </div>
          )}

          {/* ── STEP 2: Verify Email OTP ─────────────────────────────────────── */}
          {step === 2 && (
            <div>
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-4xl">mark_email_unread</span>
                </div>
              </div>

              <div className="mb-8 text-center">
                <h1 className="text-white text-4xl font-extrabold leading-tight tracking-tight">Verify your email</h1>
                <p className="text-slate-400 text-base mt-3 leading-relaxed">
                  We sent an 8-digit verification code to
                </p>
                <p className="text-primary font-bold text-base mt-1">{form.email}</p>
              </div>

              <div className="mb-4">
                <OtpInput
                  digits={otpDigits}
                  onChange={d => { setOtpDigits(d); setOtpError('') }}
                  hasError={!!otpError}
                />
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
                  Can't find it? Check your <span className="text-slate-300 font-semibold">spam or junk folder</span>. The code expires in <span className="text-slate-300 font-semibold">10 minutes</span>.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button onClick={verifyEmail} disabled={loading || otpDigits.join('').length < OTP_LENGTH}
                  className="w-full h-14 bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2">
                  {loading ? (
                    <><span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>Verifying…</>
                  ) : (
                    <><span className="material-symbols-outlined">mark_email_read</span>Verify Email</>
                  )}
                </button>

                <div className="flex items-center justify-center gap-2 py-2">
                  {resendTimer > 0 ? (
                    <p className="text-slate-500 text-sm">
                      Resend in <span className="text-slate-300 font-bold font-mono">{resendTimer}s</span>
                    </p>
                  ) : (
                    <button onClick={resendEmailCode} disabled={resending}
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
                  Wrong email? Go back
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Body Metrics ─────────────────────────────────────────── */}
          {step === 3 && (
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

              {/* Unit toggle */}
              <div className="flex mb-8">
                <div className="flex h-12 w-full items-center rounded-xl bg-slate-800/50 p-1.5">
                  {[
                    { value: 'metric',   label: 'Metric (kg, cm)' },
                    { value: 'imperial', label: 'Imperial (lb, ft)' },
                  ].map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => switchUnitSystem(opt.value)}
                      className={`flex cursor-pointer h-full grow items-center justify-center rounded-lg px-4 transition-all text-base font-semibold ${
                        form.unit_system === opt.value
                          ? 'bg-slate-700 text-primary'
                          : 'text-slate-400 hover:text-slate-300'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-5">
                {/* Gender */}
                <div className="flex flex-col gap-1">
                  <label className="text-slate-300 text-base font-semibold flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-primary text-xl">wc</span>Gender
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'M', label: 'Male',   emoji: '♂️' },
                      { value: 'F', label: 'Female', emoji: '♀️' },
                    ].map(opt => (
                      <button key={opt.value} type="button"
                        onClick={() => {
                          setForm(f => ({ ...f, gender: opt.value }))
                          if (errors.gender) setErrors(er => ({ ...er, gender: '' }))
                        }}
                        className={`h-12 rounded-xl border-2 text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                          form.gender === opt.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-600'
                        }`}>
                        <span>{opt.emoji}</span> {opt.label}
                      </button>
                    ))}
                  </div>
                  <FieldError message={errors.gender} />
                </div>

                {/* Age */}
                <div className="flex flex-col gap-1">
                  <label className="text-slate-300 text-base font-semibold flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-primary text-xl">calendar_today</span>Age
                  </label>
                  <input type="number" min="10" max="120" value={form.age}
                    onChange={setPositiveNum('age')} onKeyDown={blockNegativeKeys}
                    placeholder="e.g. 27" className={inputClass(errors, 'age')} />
                  <FieldError message={errors.age} />
                </div>

                {/* Height + Weight */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-300 text-base font-semibold flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-primary text-xl">height</span>Height
                    </label>
                    {form.unit_system === 'imperial' ? (
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input type="number" min="0" max="9" value={form.heightFt}
                            onChange={setPositiveNum('heightFt')} onKeyDown={blockNegativeKeys}
                            placeholder="5"
                            className={inputClass(errors, 'height', 'pr-8')} />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">ft</span>
                        </div>
                        <div className="relative flex-1">
                          <input type="number" min="0" max="11" value={form.heightIn}
                            onChange={setPositiveNum('heightIn')} onKeyDown={blockNegativeKeys}
                            placeholder="7"
                            className={inputClass(errors, 'height', 'pr-8')} />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">in</span>
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <input type="number" min="0" value={form.height}
                          onChange={setPositiveNum('height')} onKeyDown={blockNegativeKeys}
                          placeholder="175"
                          className={inputClass(errors, 'height', 'pr-14')} />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">cm</span>
                      </div>
                    )}
                    <FieldError message={errors.height} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-300 text-base font-semibold flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-primary text-xl">monitor_weight</span>Weight
                    </label>
                    <div className="relative">
                      <input type="number" min="0" value={form.weight}
                        onChange={setPositiveNum('weight')} onKeyDown={blockNegativeKeys}
                        placeholder={form.unit_system === 'metric' ? '70' : '154'}
                        className={inputClass(errors, 'weight', 'pr-14')} />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">
                        {form.unit_system === 'metric' ? 'kg' : 'lb'}
                      </span>
                    </div>
                    <FieldError message={errors.weight} />
                  </div>
                </div>

                {/* Country — searchable dropdown (optional) */}
                <div className="flex flex-col gap-1">
                  <label className="text-slate-300 text-base font-semibold flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-primary text-xl">location_on</span>
                    Country <span className="text-slate-600 font-normal text-xs">(optional)</span>
                  </label>
                  <div className="relative" ref={countryRef}>
                    <div className="relative">
                      <input
                        type="text"
                        value={countryOpen ? countrySearch : form.country}
                        onChange={(e) => {
                          setCountrySearch(e.target.value)
                          setCountryIdx(-1)
                          if (!countryOpen) setCountryOpen(true)
                        }}
                        onFocus={() => {
                          setCountrySearch('')
                          setCountryOpen(true)
                          setCountryIdx(-1)
                        }}
                        onKeyDown={(e) => {
                          if (!countryOpen) return
                          if (e.key === 'ArrowDown') {
                            e.preventDefault()
                            setCountryIdx(i => Math.min(i + 1, filteredCountries.length - 1))
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault()
                            setCountryIdx(i => Math.max(i - 1, 0))
                          } else if (e.key === 'Enter' && countryIdx >= 0) {
                            e.preventDefault()
                            setForm(f => ({ ...f, country: filteredCountries[countryIdx] }))
                            setCountryOpen(false)
                            setCountrySearch('')
                            if (errors.country) setErrors(er => ({ ...er, country: '' }))
                          } else if (e.key === 'Escape') {
                            setCountryOpen(false)
                            setCountrySearch('')
                          }
                        }}
                        placeholder="Search country…"
                        autoComplete="off"
                        className={inputClass(errors, 'country')}
                      />
                      {form.country && !countryOpen && (
                        <button
                          type="button"
                          onClick={() => {
                            setForm(f => ({ ...f, country: '' }))
                            setCountrySearch('')
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      )}
                    </div>
                    {countryOpen && (
                      <ul
                        ref={countryListRef}
                        className="absolute z-50 w-full mt-1 max-h-52 overflow-y-auto bg-slate-800 border border-slate-700 rounded-xl shadow-xl"
                      >
                        {filteredCountries.length === 0 ? (
                          <li className="px-4 py-3 text-slate-500 text-sm">No results</li>
                        ) : (
                          filteredCountries.map((c, i) => (
                            <li
                              key={c}
                              onMouseDown={() => {
                                setForm(f => ({ ...f, country: c }))
                                setCountryOpen(false)
                                setCountrySearch('')
                                if (errors.country) setErrors(er => ({ ...er, country: '' }))
                              }}
                              onMouseEnter={() => setCountryIdx(i)}
                              className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                                i === countryIdx
                                  ? 'bg-primary/20 text-white'
                                  : 'text-slate-300 hover:bg-slate-700/50'
                              } ${(c === 'United States' || c === 'India') && i < 2 ? 'font-semibold' : ''}`}
                            >
                              {c}
                              {i === 1 && <hr className="border-slate-700 mt-2.5 -mx-4" />}
                            </li>
                          ))
                        )}
                      </ul>
                    )}
                  </div>
                  <FieldError message={errors.country} />
                </div>

                {/* Phone number (optional) */}
                <div className="flex flex-col gap-1">
                  <label className="text-slate-300 text-base font-semibold flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-primary text-xl">phone</span>
                    Phone Number <span className="text-slate-600 font-normal text-xs">(optional)</span>
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => {
                      setForm(f => ({ ...f, phone: e.target.value }))
                      if (errors.phone) setErrors(er => ({ ...er, phone: '' }))
                    }}
                    placeholder="+1 555 000 0000"
                    className={inputClass(errors, 'phone')}
                  />
                  <FieldError message={errors.phone} />
                </div>
              </div>

              {/* Live BMI preview */}
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
                <button onClick={submitMetrics} disabled={loading}
                  className="w-full h-14 bg-primary hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 group">
                  {loading ? (
                    <><span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>Saving…</>
                  ) : (
                    <>Continue<span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span></>
                  )}
                </button>
                <button onClick={() => goTo(1)}
                  className="w-full h-12 text-slate-400 rounded-xl font-semibold text-base hover:bg-slate-800 transition-colors">
                  Back
                </button>
              </div>

              <div className="mt-6 p-4 bg-slate-900 border border-slate-800 rounded-xl flex gap-3">
                <span className="material-symbols-outlined text-primary flex-shrink-0">info</span>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Your data is stored securely and only used to personalise your nutrition and health goals.
                </p>
              </div>
            </div>
          )}

          {/* ── STEP 5: Fitness Goal ──────────────────────────────────────── */}
          {step === 5 && (
            <div>
              <div className="mb-8">
                <h1 className="text-white text-4xl font-extrabold leading-tight tracking-tight">What's your goal?</h1>
                <p className="text-slate-400 text-lg mt-2">We'll adjust your daily calorie target to match.</p>
              </div>

              {serverError && (
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl mb-6">
                  <span className="material-symbols-outlined text-red-400">warning</span>
                  <p className="text-red-400 text-sm font-semibold">{serverError}</p>
                </div>
              )}

              {/* Goal cards */}
              <div className="flex flex-col gap-3">
                {GOAL_OPTIONS.map(opt => (
                  <label key={opt.value}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      form.fitness_goal === opt.value
                        ? 'border-primary bg-primary/10'
                        : errors.fitness_goal
                          ? 'border-red-500/50 bg-slate-900 hover:border-red-500/70'
                          : 'border-slate-800 bg-slate-900 hover:border-primary/50'
                    }`}
                    onClick={() => {
                      setForm(f => ({ ...f, fitness_goal: opt.value }))
                      if (errors.fitness_goal) setErrors(er => ({ ...er, fitness_goal: '' }))
                    }}>
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-xl flex-shrink-0">
                      {opt.emoji}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-100">{opt.label}</p>
                      <p className="text-slate-500 text-sm">{opt.sub}</p>
                    </div>
                    <span className={`material-symbols-outlined text-primary transition-opacity ${form.fitness_goal === opt.value ? 'opacity-100' : 'opacity-0'}`}>
                      check_circle
                    </span>
                  </label>
                ))}
              </div>

              <FieldError message={errors.fitness_goal} />

              {/* Weekly rate selector — only for Lose / Gain */}
              {(form.fitness_goal === 'lose' || form.fitness_goal === 'gain') && (
                <div className="mt-6">
                  <p className="text-slate-300 text-base font-semibold mb-3">
                    How fast do you want to {form.fitness_goal === 'lose' ? 'lose' : 'gain'} weight?
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {(form.unit_system === 'imperial' ? RATE_OPTIONS_LB : RATE_OPTIONS_KG).map(opt => (
                      <button key={opt.value} type="button"
                        onClick={() => {
                          setForm(f => ({ ...f, weekly_rate_kg: opt.value }))
                          if (errors.weekly_rate_kg) setErrors(er => ({ ...er, weekly_rate_kg: '' }))
                        }}
                        className={`py-3 px-2 rounded-xl border-2 text-center transition-all ${
                          form.weekly_rate_kg === opt.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-600'
                        }`}>
                        <p className="text-sm font-bold">{opt.label.split('/')[0]}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{opt.sub}</p>
                      </button>
                    ))}
                  </div>
                  <FieldError message={errors.weekly_rate_kg} />
                </div>
              )}

              {/* Goal weight input — only for Lose / Gain */}
              {(form.fitness_goal === 'lose' || form.fitness_goal === 'gain') && (() => {
                // Compute estimated weeks live
                const imperial = form.unit_system === 'imperial'
                const gwNum     = parseFloat(form.goal_weight)
                const cwNum     = parseFloat(form.weight)
                const rateKg    = parseFloat(form.weekly_rate_kg) || 0
                const goalKg    = imperial && gwNum > 0 ? gwNum * 0.453592 : gwNum
                const currentKg = imperial && cwNum > 0 ? cwNum * 0.453592 : cwNum
                const diff      = Math.abs(currentKg - goalKg)
                const weeks     = gwNum > 0 && cwNum > 0 && rateKg > 0 ? Math.ceil(diff / rateKg) : null

                let estimate = null
                if (weeks !== null && weeks > 0) {
                  if (weeks < 12) estimate = `~${weeks} week${weeks === 1 ? '' : 's'}`
                  else {
                    const m = Math.floor(weeks / 4.33)
                    const w = Math.round(weeks % 4.33)
                    estimate = `~${m} month${m === 1 ? '' : 's'}${w > 0 ? `, ${w} week${w === 1 ? '' : 's'}` : ''}`
                  }
                }

                return (
                  <div className="mt-6">
                    <label className="text-slate-300 text-base font-semibold flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-primary text-xl">flag</span>
                      What's your goal weight?
                    </label>
                    <div className="relative">
                      <input type="number" min="0"
                        value={form.goal_weight}
                        onChange={setPositiveNum('goal_weight')}
                        onKeyDown={blockNegativeKeys}
                        placeholder={imperial ? '154' : '65'}
                        className={inputClass(errors, 'goal_weight', 'pr-14')}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">
                        {imperial ? 'lb' : 'kg'}
                      </span>
                    </div>
                    <FieldError message={errors.goal_weight} />

                    {/* Live estimated time to goal */}
                    {estimate && !errors.goal_weight && (
                      <div className="mt-3 flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-xl">
                        <span className="material-symbols-outlined text-primary text-base">schedule</span>
                        <p className="text-sm text-slate-300">
                          <span className="font-semibold text-white">{estimate}</span> to reach your goal
                        </p>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* "How we calculate" collapsible info box */}
              <details className="mt-6 group">
                <summary className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-300 text-sm font-semibold transition-colors">
                  <span className="material-symbols-outlined text-primary text-base">info</span>
                  How we calculate your Daily Calorie Goal
                  <span className="material-symbols-outlined text-xs transition-transform group-open:rotate-180">expand_more</span>
                </summary>
                <div className="mt-3 p-4 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400 leading-relaxed space-y-2">
                  <p><span className="text-slate-300 font-semibold">1. BMR</span> (Basal Metabolic Rate) — calories your body burns at rest.</p>
                  <p className="font-mono text-[11px] text-slate-500">Male: 10W + 6.25H - 5A + 5 &nbsp;|&nbsp; Female: 10W + 6.25H - 5A - 161</p>
                  <p><span className="text-slate-300 font-semibold">2. TDEE</span> = BMR × activity multiplier (1.2 – 1.9)</p>
                  <p><span className="text-slate-300 font-semibold">3. Goal adjustment</span> — 1 kg of body fat ≈ 7,700 kcal</p>
                  <ul className="list-disc list-inside space-y-1 ml-1">
                    <li><span className="text-green-400">Lose:</span> TDEE - (rate × 1,100 kcal/day)</li>
                    <li><span className="text-blue-400">Maintain:</span> TDEE (no change)</li>
                    <li><span className="text-purple-400">Gain:</span> TDEE + (rate × 1,100 kcal/day)</li>
                  </ul>
                  <p className="text-slate-500 italic">Minimum floor: 1,200 kcal/day for safety.</p>
                </div>
              </details>

              <div className="mt-10 flex flex-col gap-3">
                <button onClick={submitFitnessGoal} disabled={loading}
                  className="w-full h-14 bg-primary hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 group">
                  {loading ? (
                    <><span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>Saving…</>
                  ) : (
                    <>Continue<span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span></>
                  )}
                </button>
                <button onClick={() => goTo(3)}
                  className="w-full h-12 text-slate-400 rounded-xl font-semibold text-base hover:bg-slate-800 transition-colors">
                  Back
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 6: Activity Level ───────────────────────────────────────── */}
          {step === 6 && (
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
                    onClick={() => {
                      setForm(f => ({ ...f, activity: opt.value }))
                      if (errors.activity) setErrors(er => ({ ...er, activity: '' }))
                    }}>
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-xl flex-shrink-0">
                      {opt.emoji}
                    </div>
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
                <button onClick={submitActivity} disabled={loading}
                  className="w-full h-14 bg-primary hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2">
                  {loading ? (
                    <><span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>Finishing up…</>
                  ) : 'Create My Account 🎉'}
                </button>
                <button onClick={() => goTo(5)}
                  className="w-full h-12 text-slate-400 rounded-xl font-semibold text-base hover:bg-slate-800 transition-colors">
                  Back
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

      <footer className="py-6 px-6 text-center">
        <p className="text-slate-700 text-xs">© {new Date().getFullYear()} Healtho. All rights reserved.</p>
      </footer>
    </div>
  )
}
