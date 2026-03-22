import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { supabase } from '../lib/supabase'

// ── Constants ──────────────────────────────────────────────────────────────────
const ACTIVITY_MAP = {
  sedentary:         { label: 'Sedentary',         sub: 'Little or no exercise, desk job',  emoji: '🪑' },
  lightly_active:    { label: 'Lightly Active',    sub: 'Light exercise 1–3 days/week',     emoji: '🚶' },
  moderately_active: { label: 'Moderately Active', sub: 'Moderate exercise 3–5 days/week',  emoji: '🏃' },
  very_active:       { label: 'Very Active',       sub: 'Hard exercise 6–7 days/week',      emoji: '💪' },
  athlete:           { label: 'Athlete',           sub: 'Very hard exercise, physical job',  emoji: '🏋️' },
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function calcBMI(weight, height) {
  if (!weight || !height || height < 50 || weight < 20) return null
  return (weight / Math.pow(height / 100, 2)).toFixed(1)
}

function calcCalories(weight, height, age, activity) {
  const bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5
  const multipliers = { sedentary: 1.2, lightly_active: 1.375, moderately_active: 1.55, very_active: 1.725, athlete: 1.9 }
  return Math.round(bmr * (multipliers[activity] || 1.55))
}

function getBmiInfo(bmi) {
  const b = parseFloat(bmi)
  if (!b) return null
  if (b < 18.5) return { label: 'Underweight',      color: 'text-blue-400',   bar: 'bg-blue-400',   pct: 20 }
  if (b < 25)   return { label: 'Healthy weight ✓', color: 'text-green-400',  bar: 'bg-green-400',  pct: 50 }
  if (b < 30)   return { label: 'Overweight',        color: 'text-yellow-400', bar: 'bg-yellow-400', pct: 72 }
  return             { label: 'Obese range',         color: 'text-red-400',    bar: 'bg-red-400',    pct: 92 }
}

function validate({ age, height, weight }) {
  const errors = {}
  const a = parseInt(age), h = parseFloat(height), w = parseFloat(weight)
  if (!age || isNaN(a) || a < 13 || a > 120)     errors.age    = 'Enter a valid age (13–120)'
  if (!height || isNaN(h) || h < 50 || h > 300)  errors.height = 'Enter a valid height (50–300 cm)'
  if (!weight || isNaN(w) || w < 20 || w > 500)  errors.weight = 'Enter a valid weight (20–500 kg)'
  return errors
}

function FieldError({ message }) {
  if (!message) return null
  return (
    <p className="flex items-center gap-1 text-red-400 text-xs font-semibold mt-1">
      <span className="material-symbols-outlined text-sm">error</span>
      {message}
    </p>
  )
}

function inputCls(hasError) {
  return `w-full bg-slate-800 border rounded-xl h-12 px-4 text-base text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 transition-all ${
    hasError
      ? 'border-red-500/70 focus:border-red-500 focus:ring-red-500/20'
      : 'border-slate-700 focus:border-primary focus:ring-primary/20'
  }`
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function Profile() {
  const [params]  = useSearchParams()
  const navigate  = useNavigate()

  // Fallback values from URL params (passed by Register flow)
  const fallback = {
    name:     params.get('name')     || '',
    email:    params.get('email')    || '',
    age:      params.get('age')      || '',
    height:   params.get('height')   || '',
    weight:   params.get('weight')   || '',
    activity: params.get('activity') || 'moderately_active',
  }

  const [profile,  setProfile]  = useState(fallback)
  const [loading,  setLoading]  = useState(true)
  const [editing,  setEditing]  = useState(false)
  const [draft,    setDraft]    = useState(fallback)
  const [errors,   setErrors]   = useState({})
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)

  // Fetch profile from Supabase on mount
  useEffect(() => {
    async function fetchProfile() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email, age, height_cm, weight_kg, activity_level, daily_calorie_goal')
        .eq('id', session.user.id)
        .single()

      if (!error && data) {
        const fetched = {
          name:     data.full_name     || fallback.name,
          email:    data.email         || fallback.email,
          age:      String(data.age    ?? fallback.age),
          height:   String(data.height_cm ?? fallback.height),
          weight:   String(data.weight_kg ?? fallback.weight),
          activity: data.activity_level || fallback.activity,
        }
        setProfile(fetched)
        setDraft(fetched)
      }
      setLoading(false)
    }
    fetchProfile()
  }, [])

  // Live-computed values from current profile (or draft while editing)
  const view     = editing ? draft : profile
  const bmi      = calcBMI(parseFloat(view.weight), parseFloat(view.height))
  const calories = calcCalories(parseFloat(view.weight), parseFloat(view.height), parseInt(view.age), view.activity)
  const bmiInfo  = getBmiInfo(bmi)
  const actInfo  = ACTIVITY_MAP[view.activity] || ACTIVITY_MAP.moderately_active
  const initials = profile.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  const setDraftField = (field) => (e) => {
    setDraft(d => ({ ...d, [field]: e.target.value }))
    if (errors[field]) setErrors(er => ({ ...er, [field]: '' }))
  }

  const startEdit = () => {
    setDraft({ ...profile })
    setErrors({})
    setSaved(false)
    setEditing(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => {
    setEditing(false)
    setErrors({})
  }

  const saveEdit = async () => {
    const errs = validate(draft)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not signed in')

      const weight_kg = parseFloat(draft.weight)
      const height_cm = parseFloat(draft.height)
      const age       = parseInt(draft.age)
      const bmi       = calculateBMI(weight_kg, height_cm)

      const { error } = await supabase
        .from('profiles')
        .update({
          age,
          height_cm,
          weight_kg,
          bmi,
          activity_level: draft.activity,
        })
        .eq('id', session.user.id)

      if (error) throw error

      setProfile({ ...profile, ...draft })
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setErrors({ save: err.message || 'Could not save. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  function calculateBMI(weight_kg, height_cm) {
    const height_m = height_cm / 100
    return parseFloat((weight_kg / (height_m * height_m)).toFixed(1))
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header rightLabel="Dashboard" rightTo="/dashboard" rightIcon="dashboard" showLogout />

      <main className="flex-1 flex items-start justify-center px-4 py-10">
        {loading ? (
          <div className="flex flex-col items-center gap-4 pt-20">
            <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
            <p className="text-slate-500 text-sm font-semibold">Loading profile...</p>
          </div>
        ) : (
        <div className="w-full max-w-[520px] space-y-4">

          {/* Saved banner */}
          {saved && (
            <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
              <span className="material-symbols-outlined text-green-400">check_circle</span>
              <p className="text-green-400 font-bold text-sm">Profile updated successfully!</p>
            </div>
          )}

          {/* Avatar + name */}
          <div className="flex flex-col items-center py-4">
            <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-4xl font-extrabold text-white shadow-xl shadow-primary/30 mb-4">
              {initials}
            </div>
            <h1 className="text-white text-3xl font-extrabold tracking-tight">{profile.name}</h1>
            <p className="text-slate-500 text-sm mt-1">{profile.email}</p>

            {/* Edit / Cancel toggle */}
            {!editing ? (
              <button
                onClick={startEdit}
                className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                <span className="material-symbols-outlined text-base">edit</span>
                Edit profile
              </button>
            ) : (
              <button
                onClick={cancelEdit}
                className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors"
              >
                <span className="material-symbols-outlined text-base">close</span>
                Cancel
              </button>
            )}
          </div>

          {/* ── VIEW MODE — stat grid ── */}
          {!editing && (
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: 'calendar_today', label: 'Age',    value: profile.age,    sub: 'years old'   },
                { icon: 'monitor_heart',  label: 'BMI',    value: bmi || '—',     sub: bmiInfo?.label || '—', subColor: bmiInfo?.color },
                { icon: 'height',         label: 'Height', value: profile.height, sub: 'centimetres' },
                { icon: 'monitor_weight', label: 'Weight', value: profile.weight, sub: 'kilograms'   },
              ].map(s => (
                <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    <span className="material-symbols-outlined text-primary text-base">{s.icon}</span>
                    {s.label}
                  </div>
                  <p className="text-white text-3xl font-extrabold font-mono mt-1">{s.value}</p>
                  <p className={`text-xs font-semibold ${s.subColor || 'text-slate-600'}`}>{s.sub}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── EDIT MODE — inline form ── */}
          {editing && (
            <div className="bg-slate-900 border border-primary/30 rounded-xl p-5 space-y-5">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">edit</span>
                Edit your metrics
              </p>

              {/* Age */}
              <div className="flex flex-col gap-1">
                <label className="text-slate-300 text-sm font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">calendar_today</span>
                  Age
                </label>
                <input
                  type="number" min="13" max="120"
                  value={draft.age}
                  onChange={setDraftField('age')}
                  placeholder="e.g. 27"
                  className={inputCls(errors.age)}
                />
                <FieldError message={errors.age} />
              </div>

              {/* Height + Weight */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-300 text-sm font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-base">height</span>
                    Height
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={draft.height}
                      onChange={setDraftField('height')}
                      placeholder="175"
                      className={`${inputCls(errors.height)} pr-10`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">cm</span>
                  </div>
                  <FieldError message={errors.height} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-300 text-sm font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-base">monitor_weight</span>
                    Weight
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={draft.weight}
                      onChange={setDraftField('weight')}
                      placeholder="70"
                      className={`${inputCls(errors.weight)} pr-10`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">kg</span>
                  </div>
                  <FieldError message={errors.weight} />
                </div>
              </div>

              {/* Live BMI preview */}
              {bmi && bmiInfo && (
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-xs font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-primary text-sm">calculate</span>
                      Live BMI preview
                    </span>
                    <span className={`text-lg font-extrabold font-mono ${bmiInfo.color}`}>{bmi}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${bmiInfo.bar}`} style={{ width: `${bmiInfo.pct}%` }} />
                  </div>
                  <p className="text-slate-500 text-xs mt-1">{bmiInfo.label}</p>
                </div>
              )}

              {/* Activity level */}
              <div className="flex flex-col gap-2">
                <label className="text-slate-300 text-sm font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">directions_run</span>
                  Activity Level
                </label>
                {Object.entries(ACTIVITY_MAP).map(([value, opt]) => (
                  <label
                    key={value}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      draft.activity === value
                        ? 'border-primary bg-primary/10'
                        : 'border-slate-800 bg-slate-900/50 hover:border-primary/40'
                    }`}
                    onClick={() => setDraft(d => ({ ...d, activity: value }))}
                  >
                    <span className="text-xl">{opt.emoji}</span>
                    <div className="flex-1">
                      <p className="text-slate-100 text-sm font-bold">{opt.label}</p>
                      <p className="text-slate-500 text-xs">{opt.sub}</p>
                    </div>
                    <span className={`material-symbols-outlined text-primary text-base transition-opacity ${draft.activity === value ? 'opacity-100' : 'opacity-0'}`}>
                      check_circle
                    </span>
                  </label>
                ))}
              </div>

              {/* Save button */}
              <button
                onClick={saveEdit}
                disabled={saving}
                className="w-full h-13 py-3.5 bg-primary hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-bold text-base shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
                    Saving changes…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-xl">save</span>
                    Save changes
                  </>
                )}
              </button>
            </div>
          )}

          {/* Daily calorie goal — updates live in edit mode */}
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
                <span className="material-symbols-outlined text-primary text-base">local_fire_department</span>
                Daily Calorie Goal
                {editing && <span className="text-primary text-xs normal-case font-normal italic">— updating live</span>}
              </div>
              <p className="text-white text-4xl font-extrabold font-mono">{calories.toLocaleString()}</p>
              <p className="text-slate-500 text-xs mt-1">kcal / day · calculated for your profile</p>
            </div>
            <div className="w-16 h-16 rounded-full border-4 border-primary/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-3xl">bolt</span>
            </div>
          </div>

          {/* Activity level — view mode only */}
          {!editing && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-2xl flex-shrink-0">
                {actInfo.emoji}
              </div>
              <div>
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-0.5">Activity Level</p>
                <p className="text-white text-lg font-bold">{actInfo.label}</p>
                <p className="text-slate-500 text-xs">{actInfo.sub}</p>
              </div>
              <span className="material-symbols-outlined text-primary ml-auto">check_circle</span>
            </div>
          )}

          {/* Save error */}
          {errors.save && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <span className="material-symbols-outlined text-red-400">warning</span>
              <p className="text-red-400 text-sm font-semibold">{errors.save}</p>
            </div>
          )}

          {/* CTA */}
          {!editing && (
            <a
              href="/dashboard"
              className="w-full h-14 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold text-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 group"
            >
              Go to my Dashboard
              <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span>
            </a>
          )}

        </div>
        )}
      </main>

      <footer className="py-6 px-6 text-center">
        <p className="text-slate-700 text-xs">© 2025 Healtho. All rights reserved.</p>
      </footer>
    </div>
  )
}
