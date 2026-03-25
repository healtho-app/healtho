import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import Header       from '../components/Header'
import CalorieRing  from '../components/CalorieRing'
import MacroCard    from '../components/MacroCard'
import WaterTracker from '../components/WaterTracker'
import MealSection  from '../components/MealSection'
import LogFoodModal from '../components/LogFoodModal'

const MEAL_META = [
  { id: 'breakfast', emoji: '🌅', name: 'Breakfast', defaultOpen: true  },
  { id: 'lunch',     emoji: '☀️', name: 'Lunch',     defaultOpen: false },
  { id: 'dinner',    emoji: '🌙', name: 'Dinner',    defaultOpen: false },
  { id: 'snacks',    emoji: '🍎', name: 'Snacks',    defaultOpen: false },
]

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2, lightly_active: 1.375, moderately_active: 1.55,
  very_active: 1.725, athlete: 1.9,
}

function computeTDEE(profile) {
  const { weight_kg, height_cm, age, activity_level } = profile || {}
  if (!weight_kg || !height_cm || !age || !activity_level) return null
  const bmr  = 10 * weight_kg + 6.25 * height_cm - 5 * parseInt(age)
  const mult = ACTIVITY_MULTIPLIERS[activity_level] ?? 1.2
  return Math.round(bmr * mult)
}

function greeting(timezone) {
  const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
  const h  = parseInt(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: tz }))
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
  const [logs,     setLogs]     = useState([])      // today's food_logs rows

  // ── Fetch profile ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchProfile() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, username, timezone, daily_calorie_goal, weight_kg, height_cm, age, bmi, activity_level')
        .eq('id', session.user.id)
        .maybeSingle()
      if (error) console.error('[Dashboard] profile fetch error:', error.message)
      setProfile(data)
      setLoading(false)
    }
    fetchProfile()
  }, [])

  // ── Fetch today's food logs ────────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('food_logs')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('date', today)
      .order('created_at', { ascending: true })
    if (error) console.error('[Dashboard] food_logs fetch error:', error.message)
    setLogs(data || [])
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  // ── Delete a log entry ─────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    const { error } = await supabase.from('food_logs').delete().eq('id', id)
    if (!error) fetchLogs()
    else console.error('[Dashboard] delete error:', error.message)
  }

  // ── Derived totals ─────────────────────────────────────────────────────────
  const totalCalories = logs.reduce((s, l) => s + (l.calories  || 0), 0)
  const totalProtein  = logs.reduce((s, l) => s + (l.protein_g || 0), 0)
  const totalCarbs    = logs.reduce((s, l) => s + (l.carbs_g   || 0), 0)
  const totalFat      = logs.reduce((s, l) => s + (l.fat_g     || 0), 0)
  const totalFiber    = logs.reduce((s, l) => s + (l.fiber_g   || 0), 0)

  const calorieGoal = profile?.daily_calorie_goal ?? computeTDEE(profile) ?? 0

  // Macro % of total calories (protein/carbs = 4 kcal/g, fat = 9 kcal/g)
  const totalMacroKcal = totalProtein * 4 + totalCarbs * 4 + totalFat * 9 || 1
  const macros = [
    { label: 'Protein', amount: Math.round(totalProtein), pct: Math.round((totalProtein * 4 / totalMacroKcal) * 100), color: 'bg-protein' },
    { label: 'Carbs',   amount: Math.round(totalCarbs),   pct: Math.round((totalCarbs   * 4 / totalMacroKcal) * 100), color: 'bg-carbs'   },
    { label: 'Fat',     amount: Math.round(totalFat),     pct: Math.round((totalFat     * 9 / totalMacroKcal) * 100), color: 'bg-fat'     },
    { label: 'Fiber',   amount: Math.round(totalFiber),   pct: 0,                                                     color: 'bg-fiber'   },
  ]

  // Group logs by meal_type
  const meals = MEAL_META.map(m => ({
    ...m,
    calories: Math.round(logs.filter(l => l.meal_type === m.id).reduce((s, l) => s + (l.calories || 0), 0)),
    items: logs
      .filter(l => l.meal_type === m.id)
      .map(l => ({ id: l.id, name: l.food_name, portion: l.portion, calories: Math.round(l.calories) })),
  }))

  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const username  = profile?.username ? `@${profile.username}` : null

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
            {loading ? <Skeleton className="h-10 w-64 mt-1" /> : (
              <h1 className="text-white text-4xl font-extrabold leading-tight tracking-tight mt-1">
                {greeting(profile?.timezone)}, <span className="text-primary">{firstName}</span> 👋
              </h1>
            )}
            <p className="text-slate-500 text-base mt-1">
              Here's your nutrition summary for today.
              {username && <span className="ml-2 text-slate-600 font-mono text-sm">{username}</span>}
            </p>
          </div>

          {/* Calorie goal banner */}
          {loading ? <Skeleton className="h-16 w-full" /> : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl px-5 py-3 flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Daily Calorie Goal</p>
                <p className="text-white text-2xl font-extrabold mt-0.5">
                  {calorieGoal.toLocaleString()} <span className="text-slate-400 text-sm font-medium">kcal</span>
                </p>
              </div>
              <div className="text-right">
                {profile?.bmi    && <p className="text-slate-400 text-xs">BMI <span className="text-white font-bold">{profile.bmi}</span></p>}
                {profile?.weight_kg && <p className="text-slate-400 text-xs mt-0.5">{profile.weight_kg} kg</p>}
              </div>
            </div>
          )}

          {/* Calorie ring — live consumed from food_logs */}
          <CalorieRing consumed={Math.round(totalCalories)} goal={calorieGoal} burned={0} />

          {/* Macro strip */}
          <div className="grid grid-cols-4 gap-3">
            {macros.map(m => <MacroCard key={m.label} {...m} />)}
          </div>

          {/* Water */}
          <WaterTracker initialFilled={0} />

          {/* Meals header */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Today's Meals</p>
            <button onClick={() => setLogOpen(true)} className="text-primary text-xs font-semibold hover:underline">
              + Log food
            </button>
          </div>

          {/* Meal sections — real data */}
          {meals.map(meal => (
            <MealSection
              key={meal.id}
              emoji={meal.emoji}
              name={meal.name}
              calories={meal.calories}
              items={meal.items}
              defaultOpen={meal.defaultOpen}
              onAdd={() => setLogOpen(true)}
              onDelete={handleDelete}
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

          {/* Log Food CTA */}
          <button onClick={() => setLogOpen(true)}
            className="w-full h-14 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold text-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 group">
            <span className="material-symbols-outlined">add_circle</span>
            Log Food
          </button>

        </div>
      </main>

      <footer className="py-6 px-6 text-center">
        <p className="text-slate-700 text-xs">© 2025 Healtho. All rights reserved.</p>
      </footer>

      <LogFoodModal open={logOpen} onClose={() => setLogOpen(false)} onLogged={fetchLogs} />
    </div>
  )
}
