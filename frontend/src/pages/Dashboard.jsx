import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Header       from '../components/Header'
import CalorieRing  from '../components/CalorieRing'
import MacroCard    from '../components/MacroCard'
import WaterTracker from '../components/WaterTracker'
import MealSection  from '../components/MealSection'
import LogFoodModal from '../components/LogFoodModal'

const MEALS = [
  { id: 'breakfast', emoji: '🌅', name: 'Breakfast', calories: 0, defaultOpen: true,  items: [] },
  { id: 'lunch',     emoji: '☀️', name: 'Lunch',     calories: 0, defaultOpen: false, items: [] },
  { id: 'dinner',    emoji: '🌙', name: 'Dinner',    calories: 0, defaultOpen: false, items: [] },
  { id: 'snacks',    emoji: '🍎', name: 'Snacks',    calories: 0, defaultOpen: false, items: [] },
]

const MACROS = [
  { label: 'Protein', amount: 0, pct: 0, color: 'bg-protein' },
  { label: 'Carbs',   amount: 0, pct: 0, color: 'bg-carbs'   },
  { label: 'Fat',     amount: 0, pct: 0, color: 'bg-fat'     },
  { label: 'Fiber',   amount: 0, pct: 0, color: 'bg-fiber'   },
]

const ACTIVITY_MULTIPLIERS = {
  sedentary:         1.2,
  lightly_active:    1.375,
  moderately_active: 1.55,
  very_active:       1.725,
  athlete:           1.9,
}

// Mifflin-St Jeor (unisex) — mirrors the formula used in Register.jsx
function computeTDEE(profile) {
  const { weight_kg, height_cm, age, activity_level } = profile || {}
  if (!weight_kg || !height_cm || !age || !activity_level) return null
  const bmr  = 10 * weight_kg + 6.25 * height_cm - 5 * parseInt(age)
  const mult = ACTIVITY_MULTIPLIERS[activity_level] ?? 1.2
  return Math.round(bmr * mult)
}

function greeting(timezone) {
  // Use the user's stored timezone so Papa in India and Ayush in Arizona
  // both get the correct greeting for their local time
  const tz   = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
  const h    = parseInt(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: tz }))
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-slate-800 rounded-lg ${className}`} />
}

export default function Dashboard() {
  const [logOpen,  setLogOpen]  = useState(false)
  const [profile,  setProfile]  = useState(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    async function fetchProfile() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, username, timezone, daily_calorie_goal, weight_kg, height_cm, age, bmi, activity_level')
        .eq('id', session.user.id)
        .maybeSingle()

      if (error) console.error('[Dashboard] Supabase fetch error:', error.message, error)
      setProfile(data)
      setLoading(false)
    }
    fetchProfile()
  }, [])

  const firstName   = profile?.full_name?.split(' ')[0] || 'there'
  const username    = profile?.username ? `@${profile.username}` : null
  const calorieGoal = profile?.daily_calorie_goal ?? computeTDEE(profile) ?? 0

  return (
    <div className="flex flex-col min-h-screen">
      <Header rightLabel="My Profile" rightTo="/profile" rightIcon="person" showLogout />

      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-[520px] space-y-4">

          {/* Greeting */}
          <div className="mb-2">
            <p className="text-slate-400 text-sm font-medium">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            {loading ? (
              <Skeleton className="h-10 w-64 mt-1" />
            ) : (
              <h1 className="text-white text-4xl font-extrabold leading-tight tracking-tight mt-1">
                {greeting(profile?.timezone)}, <span className="text-primary">{firstName}</span> 👋
              </h1>
            )}
            <p className="text-slate-500 text-base mt-1">
              Here's your nutrition summary for today.
              {username && <span className="ml-2 text-slate-600 font-mono text-sm">{username}</span>}
            </p>
          </div>

          {/* Calorie goal banner — real data from profiles */}
          {loading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl px-5 py-3 flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Daily Calorie Goal</p>
                <p className="text-white text-2xl font-extrabold mt-0.5">
                  {calorieGoal.toLocaleString()} <span className="text-slate-400 text-sm font-medium">kcal</span>
                </p>
              </div>
              <div className="text-right">
                {profile?.bmi && (
                  <p className="text-slate-400 text-xs">BMI <span className="text-white font-bold">{profile.bmi}</span></p>
                )}
                {profile?.weight_kg && (
                  <p className="text-slate-400 text-xs mt-0.5">{profile.weight_kg} kg</p>
                )}
              </div>
            </div>
          )}

          {/* Calorie ring — consumed is 0 until meal logging is live */}
          <CalorieRing
            consumed={0}
            goal={calorieGoal}
            burned={0}
          />

          {/* Macro strip */}
          <div className="grid grid-cols-4 gap-3">
            {MACROS.map(m => (
              <MacroCard key={m.label} {...m} />
            ))}
          </div>

          {/* Water */}
          <WaterTracker initialFilled={0} />

          {/* Meals header */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Today's Meals</p>
            <button
              onClick={() => setLogOpen(true)}
              className="text-primary text-xs font-semibold hover:underline"
            >
              + Log food
            </button>
          </div>

          {/* Coming soon banner */}
          <div className="bg-slate-900 border border-dashed border-slate-700 rounded-xl p-4 flex items-center gap-3">
            <span className="material-symbols-outlined text-slate-500">restaurant</span>
            <p className="text-slate-500 text-sm">
              Meal logging coming soon — tap <span className="text-primary font-semibold">+ Log food</span> to get notified.
            </p>
          </div>

          {/* Meal sections */}
          {MEALS.map(meal => (
            <MealSection
              key={meal.id}
              emoji={meal.emoji}
              name={meal.name}
              calories={meal.calories}
              items={meal.items}
              defaultOpen={meal.defaultOpen}
              onAdd={() => setLogOpen(true)}
            />
          ))}

          {/* Streak */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-2xl flex-shrink-0">🔥</div>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">Day 1 streak</p>
              <p className="text-xs text-green-400 font-semibold mt-0.5">Welcome to Healtho — let's build that streak!</p>
            </div>
            <span className="material-symbols-outlined text-primary">emoji_events</span>
          </div>

          {/* Log food CTA */}
          <button
            onClick={() => setLogOpen(true)}
            className="w-full h-14 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold text-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 group"
          >
            <span className="material-symbols-outlined">add_circle</span>
            Log Food
          </button>

        </div>
      </main>

      <footer className="py-6 px-6 text-center">
        <p className="text-slate-700 text-xs">© 2025 Healtho. All rights reserved.</p>
      </footer>

      <LogFoodModal open={logOpen} onClose={() => setLogOpen(false)} />
    </div>
  )
}
