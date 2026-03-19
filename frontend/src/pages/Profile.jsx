import { useSearchParams } from 'react-router-dom'
import Header from '../components/Header'

const ACTIVITY_MAP = {
  sedentary:   { label: 'Sedentary',         sub: 'Little or no exercise, desk job',   emoji: '🪑' },
  light:       { label: 'Lightly Active',     sub: 'Light exercise 1–3 days/week',      emoji: '🚶' },
  moderate:    { label: 'Moderately Active',  sub: 'Moderate exercise 3–5 days/week',   emoji: '🏃' },
  active:      { label: 'Very Active',        sub: 'Hard exercise 6–7 days/week',        emoji: '💪' },
  very_active: { label: 'Athlete',            sub: 'Very hard exercise, physical job',   emoji: '🏋️' },
}

function calcBMI(weight, height) {
  return (weight / Math.pow(height / 100, 2)).toFixed(1)
}

function calcCalories(weight, height, age, activity) {
  const bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5
  const multipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 }
  return Math.round(bmr * (multipliers[activity] || 1.55))
}

function getBmiInfo(bmi) {
  const b = parseFloat(bmi)
  if (b < 18.5) return { label: 'Underweight',    color: 'text-blue-400'   }
  if (b < 25)   return { label: 'Healthy weight ✓', color: 'text-green-400' }
  if (b < 30)   return { label: 'Overweight',      color: 'text-yellow-400' }
  return             { label: 'Obese range',       color: 'text-red-400'   }
}

export default function Profile() {
  const [params] = useSearchParams()

  // Read from URL params (passed from Register) or use defaults
  // TODO: replace with Supabase session / user fetch
  const name     = params.get('name')     || 'Ayush Sharma'
  const email    = params.get('email')    || 'ayush@example.com'
  const age      = parseInt(params.get('age'))      || 27
  const height   = parseFloat(params.get('height')) || 175
  const weight   = parseFloat(params.get('weight')) || 72
  const activity = params.get('activity') || 'moderate'

  const bmi      = calcBMI(weight, height)
  const calories = calcCalories(weight, height, age, activity)
  const bmiInfo  = getBmiInfo(bmi)
  const actInfo  = ACTIVITY_MAP[activity] || ACTIVITY_MAP.moderate
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="flex flex-col min-h-screen">
      <Header rightLabel="Go to Dashboard" rightTo="/dashboard" rightIcon="dashboard" />

      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-[520px] space-y-4">

          {/* Success banner */}
          <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
            <span className="material-symbols-outlined text-green-400 text-2xl">check_circle</span>
            <div>
              <p className="text-green-400 font-bold text-sm">Account created successfully!</p>
              <p className="text-slate-500 text-xs mt-0.5">Welcome to Healtho. Here's your profile summary.</p>
            </div>
          </div>

          {/* Avatar */}
          <div className="flex flex-col items-center py-4">
            <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-4xl font-extrabold text-white shadow-xl shadow-primary/30 mb-4">
              {initials}
            </div>
            <h1 className="text-white text-3xl font-extrabold tracking-tight">{name}</h1>
            <p className="text-slate-500 text-sm mt-1">{email}</p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: 'calendar_today', label: 'Age',    value: age,    sub: 'years old'   },
              { icon: 'monitor_heart',  label: 'BMI',    value: bmi,    sub: bmiInfo.label, subColor: bmiInfo.color },
              { icon: 'height',         label: 'Height', value: height, sub: 'centimetres' },
              { icon: 'monitor_weight', label: 'Weight', value: weight, sub: 'kilograms'   },
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

          {/* Daily calorie goal */}
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
                <span className="material-symbols-outlined text-primary text-base">local_fire_department</span>
                Daily Calorie Goal
              </div>
              <p className="text-white text-4xl font-extrabold font-mono">{calories.toLocaleString()}</p>
              <p className="text-slate-500 text-xs mt-1">kcal / day · calculated for your profile</p>
            </div>
            <div className="w-16 h-16 rounded-full border-4 border-primary/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-3xl">bolt</span>
            </div>
          </div>

          {/* Activity level */}
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

          {/* Dev note */}
          <div className="p-4 bg-slate-900 border border-dashed border-slate-700 rounded-xl flex gap-3">
            <span className="material-symbols-outlined text-slate-600 flex-shrink-0 text-sm mt-0.5">code</span>
            <p className="text-slate-600 text-xs leading-relaxed">
              <span className="text-slate-400 font-semibold">Dev note:</span> In production, this page receives its data from Ishaan's{' '}
              <code className="text-primary bg-slate-800 px-1 py-0.5 rounded">POST /api/auth/register</code> response via Supabase.
              BMI and calorie goal are calculated server-side, not here.
            </p>
          </div>

          {/* CTA */}
          <a
            href="/dashboard"
            className="w-full h-14 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold text-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 group"
          >
            Go to my Dashboard
            <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span>
          </a>

        </div>
      </main>

      <footer className="py-6 px-6 text-center">
        <p className="text-slate-700 text-xs">© 2025 Healtho. All rights reserved.</p>
      </footer>
    </div>
  )
}
