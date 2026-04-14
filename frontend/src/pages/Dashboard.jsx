import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
// Drinks that count toward water tracker, mapped to ml per serving
const WATER_SERVING_ML = {
  'Water':           250,
  'Sparkling Water': 355,
  'Coconut Water':   240,
  'Nimbu Pani':      250,
}
import { useProfile }  from '../contexts/ProfileContext'
import Header            from '../components/Header'
import CalorieRing       from '../components/CalorieRing'
import MacroCard         from '../components/MacroCard'
import WaterTracker      from '../components/WaterTracker'
import MealSection       from '../components/MealSection'
import LogFoodModal      from '../components/LogFoodModal'
import ProfileLoadError  from '../components/ProfileLoadError'
import CelebrationOverlay from '../components/CelebrationOverlay'
import { useCelebration } from '../hooks/useCelebration'

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
  const { weight_kg, height_cm, age, activity_level, gender } = profile || {}
  if (!weight_kg || !height_cm || !age || !activity_level) return null
  const genderOffset = gender === 'M' ? 5 : gender === 'F' ? -161 : -78
  const bmr  = 10 * weight_kg + 6.25 * height_cm - 5 * parseInt(age) + genderOffset
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

// Returns YYYY-MM-DD in the user's LOCAL timezone (not UTC)
// Fixes a bug where toISOString() gives UTC date, which can be off by ±1 day
const localDateStr = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const MAX_HISTORY_DAYS = 30   // how far back the user can navigate

export default function Dashboard() {
  // Profile comes from the shared ProfileContext (HLTH-586/588). Dashboard
  // previously had its own fetchProfile — removed in HLTH-585 so there's a
  // single source of truth for profile data + error handling across Header
  // and Dashboard.
  const {
    profile,
    loading,
    errorType: profileErrorType,
    retrying: profileRetrying,
    retryProfile,
  } = useProfile()

  const [logOpen,      setLogOpen]      = useState(false)
  const [logMeal,      setLogMeal]      = useState(null)
  const [logs,         setLogs]         = useState([])
  const [streak,       setStreak]       = useState(0)
  const [selectedDate, setSelectedDate] = useState(() => localDateStr())
  const [editEntry,    setEditEntry]    = useState(null)   // item being edited
  const [waterTotalLevel, setWaterTotalLevel] = useState(0) // from WaterTracker callback

  // Is the dashboard still usable in the current state?
  // - network / unknown errors: partial fallback (keep food logs, show banner)
  // - auth / notfound: full blocking fallback (nothing useful to show)
  const profileErrorBlocks  = profileErrorType === 'auth' || profileErrorType === 'notfound'
  const profileErrorPartial = profileErrorType === 'network' || profileErrorType === 'unknown'

  // ── Date navigation ────────────────────────────────────────────────────────
  const today   = localDateStr()
  const isToday = selectedDate === today

  // Earliest navigable date = today minus MAX_HISTORY_DAYS
  const earliestDate = (() => {
    const d = new Date()
    d.setDate(d.getDate() - MAX_HISTORY_DAYS)
    return localDateStr(d)
  })()
  const isAtEarliest = selectedDate <= earliestDate

  const goBack = () => {
    if (isAtEarliest) return
    const d = new Date(selectedDate + 'T00:00:00')
    d.setDate(d.getDate() - 1)
    setSelectedDate(localDateStr(d))
  }
  const goForward = () => {
    if (isToday) return
    const d = new Date(selectedDate + 'T00:00:00')
    d.setDate(d.getDate() + 1)
    setSelectedDate(localDateStr(d))
  }

  // Human-readable label for the selected date
  const dateLabel = (() => {
    const yesterday = localDateStr(new Date(Date.now() - 86400000))
    const d = new Date(selectedDate + 'T00:00:00')
    const long = d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    if (selectedDate === today)     return `Today · ${long}`
    if (selectedDate === yesterday) return `Yesterday · ${long}`
    return long
  })()

  // Profile is now provided by ProfileContext — no local fetch here. This
  // eliminates the duplicate fetch bug where Dashboard and Header could be
  // out of sync on the same page (HLTH-585/586).

  // ── Fetch food logs for selectedDate ─────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data, error } = await supabase
      .from('food_logs')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('date', selectedDate)
      .order('created_at', { ascending: true })
    if (error) console.error('[Dashboard] food_logs fetch error:', error.message)
    setLogs(data || [])
  }, [selectedDate])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  // ── Streak — count consecutive days with ≥1 food log ──────────────────────
  useEffect(() => {
    async function fetchStreak() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data, error } = await supabase
        .from('food_logs')
        .select('date')
        .eq('user_id', session.user.id)
        .order('date', { ascending: false })

      if (error || !data) return

      // Deduplicate dates
      const dates = [...new Set(data.map(r => r.date))].sort((a, b) => b.localeCompare(a))
      if (dates.length === 0) { setStreak(0); return }

      const today     = localDateStr()
      const yesterday = localDateStr(new Date(Date.now() - 86400000))

      // Streak is alive if there's a log today OR yesterday (user may still log today)
      if (dates[0] !== today && dates[0] !== yesterday) { setStreak(0); return }

      let count = 0
      let expected = dates[0]
      for (const d of dates) {
        if (d === expected) {
          count++
          const prev = new Date(expected + 'T00:00:00')
          prev.setDate(prev.getDate() - 1)
          expected = localDateStr(prev)
        } else {
          break
        }
      }
      setStreak(count)
    }
    fetchStreak()
  }, [logs]) // re-run whenever today's logs change

  // ── Delete a log entry ─────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    const { error } = await supabase.from('food_logs').delete().eq('id', id)
    if (!error) fetchLogs()
    else console.error('[Dashboard] delete error:', error.message)
  }

  // ── Edit a log entry ───────────────────────────────────────────────────────
  const handleEdit = (item) => {
    setEditEntry(item)
    setLogOpen(true)
  }

  // ── Derived totals ─────────────────────────────────────────────────────────
  const totalCalories = logs.reduce((s, l) => s + (l.calories  || 0), 0)
  const totalProtein  = logs.reduce((s, l) => s + (l.protein_g || 0), 0)
  const totalCarbs    = logs.reduce((s, l) => s + (l.carbs_g   || 0), 0)
  const totalFat      = logs.reduce((s, l) => s + (l.fat_g     || 0), 0)
  const totalFiber    = logs.reduce((s, l) => s + (l.fiber_g   || 0), 0)

  const calorieGoal = profile?.daily_calorie_goal ?? computeTDEE(profile) ?? 0

  // Water dots — 8 dots, each = 312.5 ml (2500 ml / 8)
  // Case-insensitive name lookup so minor DB variations don't break matching
  const waterLogs = logs.filter(l => {
    const name = l.food_name?.trim() ?? ''
    return Object.keys(WATER_SERVING_ML).some(k => k.toLowerCase() === name.toLowerCase())
  })
  const totalWaterMl = waterLogs.reduce((s, l) => {
    const name  = l.food_name?.trim() ?? ''
    const key   = Object.keys(WATER_SERVING_ML).find(k => k.toLowerCase() === name.toLowerCase())
    const mlPer = WATER_SERVING_ML[key] ?? 0
    const qty   = parseFloat(l.quantity) || 1
    return s + mlPer * qty
  }, 0)
  // Float level 0–8 (e.g. 0.8 for 1 glass of water = 250ml out of 312.5ml/dot)
  const waterLevel = Math.min(8, totalWaterMl / (2500 / 8))

  // ── Celebration triggers ─────────────────────────────────────────────────
  const waterGoalMet  = waterTotalLevel >= 8
  const hasBreakfast  = logs.some(l => l.meal_type === 'breakfast')
  const hasLunch      = logs.some(l => l.meal_type === 'lunch')
  const hasDinner     = logs.some(l => l.meal_type === 'dinner')
  const mealGoalMet   = hasBreakfast && hasLunch && hasDinner && totalCalories > 0 && totalCalories < calorieGoal

  const waterCelebration = useCelebration('water', waterGoalMet && isToday, selectedDate)
  const mealCelebration  = useCelebration('meals', mealGoalMet && isToday, selectedDate)

  // Macro % of total calories (protein/carbs = 4 kcal/g, fat = 9 kcal/g)
  const totalMacroKcal = totalProtein * 4 + totalCarbs * 4 + totalFat * 9 || 1
  const macros = [
    { label: 'Protein', amount: Math.round(totalProtein), pct: Math.round((totalProtein * 4 / totalMacroKcal) * 100), color: 'bg-protein' },
    { label: 'Carbs',   amount: Math.round(totalCarbs),   pct: Math.round((totalCarbs   * 4 / totalMacroKcal) * 100), color: 'bg-carbs'   },
    { label: 'Fat',     amount: Math.round(totalFat),     pct: Math.round((totalFat     * 9 / totalMacroKcal) * 100), color: 'bg-fat'     },
    { label: 'Fiber',   amount: Math.round(totalFiber),   pct: 0,                                                     color: 'bg-fiber'   },
  ]

  // Group logs by meal_type — items include unit macros so the edit modal can recalculate
  const meals = MEAL_META.map(m => ({
    ...m,
    calories: Math.round(logs.filter(l => l.meal_type === m.id).reduce((s, l) => s + (l.calories || 0), 0)),
    items: logs
      .filter(l => l.meal_type === m.id)
      .map(l => {
        const qty = parseFloat(l.quantity) || 1
        return {
          id:          l.id,
          name:        l.food_name,
          portion:     l.portion,
          calories:    Math.round(l.calories),
          meal_type:   l.meal_type,
          quantity:    qty,
          unitCalories: (l.calories  || 0) / qty,
          unitProtein:  (l.protein_g || 0) / qty,
          unitCarbs:    (l.carbs_g   || 0) / qty,
          unitFat:      (l.fat_g     || 0) / qty,
          unitFiber:    (l.fiber_g   || 0) / qty,
        }
      }),
  }))

  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const username  = profile?.username ? `@${profile.username}` : null

  // ── Blocking error fallback ────────────────────────────────────────────────
  // For auth/notfound errors there's no meaningful dashboard to render — the
  // user must re-auth or finish onboarding. Short-circuit with a fullpage card
  // (Header + footer still render for navigation).
  if (profileErrorBlocks) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header rightLabel="My Profile" rightTo="/profile" rightIcon="person" showLogout />
        <main className="flex-1 flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-[520px]">
            <ProfileLoadError
              errorType={profileErrorType}
              onRetry={retryProfile}
              retrying={profileRetrying}
              variant="fullpage"
            />
          </div>
        </main>
        <footer className="py-6 px-6 text-center">
          <p className="text-slate-700 text-xs">© {new Date().getFullYear()} Healtho. All rights reserved.</p>
        </footer>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header rightLabel="My Profile" rightTo="/profile" rightIcon="person" showLogout />

      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-[520px] space-y-4">

          {/* Non-blocking profile error banner — for network / unknown errors.
              Food logs / water / streak continue to render below so the user's
              tracked data is never held hostage by a flaky profile fetch. */}
          {profileErrorPartial && (
            <ProfileLoadError
              errorType={profileErrorType}
              onRetry={retryProfile}
              retrying={profileRetrying}
              variant="banner"
            />
          )}

          {/* Greeting */}
          <div className="mb-2">
            {/* Date navigator */}
            <div className="flex items-center gap-2 mb-1">
              <button
                onClick={goBack}
                disabled={isAtEarliest}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${isAtEarliest ? 'text-slate-700 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700 text-white'}`}
                aria-label="Previous day"
                title={isAtEarliest ? `History limited to ${MAX_HISTORY_DAYS} days` : 'Previous day'}
              >
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              <p className="text-slate-400 text-sm font-medium flex-1 truncate">{dateLabel}</p>
              {/* "Today" quick-jump — only shown when not on today */}
              {!isToday && (
                <button
                  onClick={() => setSelectedDate(localDateStr())}
                  className="text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2 py-1 rounded-lg transition-colors flex-shrink-0"
                >
                  Today
                </button>
              )}
              <button
                onClick={goForward}
                disabled={isToday}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${isToday ? 'text-slate-700 cursor-not-allowed opacity-0 pointer-events-none' : 'bg-slate-800 hover:bg-slate-700 text-white'}`}
                aria-label="Next day"
              >
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>

            {loading ? <Skeleton className="h-10 w-64 mt-1" /> : (
              <h1 className="text-white text-4xl font-extrabold leading-tight tracking-tight mt-1">
                {greeting(profile?.timezone)}, <span className="text-primary">{firstName}</span> 👋
              </h1>
            )}
            <p className="text-slate-500 text-base mt-1">
              {isToday ? "Here's your nutrition summary for today." : `Viewing logs for ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}.`}
              {username && <span className="ml-2 text-slate-600 font-mono text-sm">{username}</span>}
            </p>
          </div>

          {/* Calorie goal banner */}
          {loading ? (
            <Skeleton className="h-16 w-full" />
          ) : profileErrorPartial ? (
            // Partial error: showing "0 kcal" would be misleading. Hide the
            // banner entirely — the alert banner above already explains.
            null
          ) : (
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

          {/* Calorie ring — live consumed from food_logs. Hidden during a
              partial profile error since the goal would be 0 and misleading. */}
          {!profileErrorPartial && (
            <CalorieRing consumed={Math.round(totalCalories)} goal={calorieGoal} burned={0} />
          )}

          {/* Macro strip */}
          <div className="grid grid-cols-4 gap-3">
            {macros.map(m => <MacroCard key={m.label} {...m} />)}
          </div>

          {/* Water */}
          <WaterTracker waterLevel={waterLevel} goalMet={waterGoalMet} onLevelChange={setWaterTotalLevel} isToday={isToday} />

          {/* Meals header */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
              {isToday ? "Today's Meals" : new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
            <button onClick={() => { setLogMeal(null); setLogOpen(true) }} className="text-primary text-xs font-semibold hover:underline">
              + Log food
            </button>
          </div>

          {/* Meal sections — real data */}
          {logs.length === 0 && !loading && !isToday ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-slate-300 text-sm font-semibold">No entries for this day</p>
              <p className="text-slate-600 text-xs mt-1">Nothing was logged on {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}.</p>
              <button
                onClick={() => { setLogMeal(null); setLogOpen(true) }}
                className="mt-3 text-primary text-xs font-semibold hover:underline"
              >
                + Add an entry for this day
              </button>
            </div>
          ) : (
            meals.map(meal => (
              <MealSection
                key={meal.id}
                emoji={meal.emoji}
                name={meal.name}
                calories={meal.calories}
                items={meal.items}
                defaultOpen={meal.defaultOpen}
                onAdd={() => { setLogMeal(meal.id); setLogOpen(true) }}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            ))
          )}

          {/* Streak */}
          <div className="relative group">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4 cursor-default">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-2xl flex-shrink-0">🔥</div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white flex items-center gap-2">
                  {streak === 0 ? 'No streak yet' : `Day ${streak} streak`}
                  {!isToday && (
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">current</span>
                  )}
                </p>
                <p className="text-xs font-semibold mt-0.5 text-green-400">
                  {streak === 0 && 'Log a meal today to start your streak!'}
                  {streak === 1 && "Great start — log tomorrow to keep it going!"}
                  {streak >= 2 && streak < 7  && `${streak} days in a row — keep it up!`}
                  {streak >= 7 && streak < 30 && `🎯 ${streak} day streak — you're on fire!`}
                  {streak >= 30 && `🏆 ${streak} days — absolute legend!`}
                </p>
              </div>
              <span className="material-symbols-outlined text-primary">emoji_events</span>
            </div>

            {/* Tooltip — z-50 so it renders above all meal cards */}
            <div className="absolute bottom-full left-0 right-0 mb-2 z-50 pointer-events-none
                            opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-xl">
                <p className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                  <span className="text-base">🔥</span> How streaks work
                </p>
                <ul className="space-y-1.5">
                  <li className="flex items-start gap-2 text-xs text-slate-400">
                    <span className="text-green-400 mt-0.5">✓</span>
                    Log <span className="text-white font-semibold mx-1">at least 1 meal</span> per day to grow your streak
                  </li>
                  <li className="flex items-start gap-2 text-xs text-slate-400">
                    <span className="text-green-400 mt-0.5">✓</span>
                    Consecutive days logged = streak count
                  </li>
                  <li className="flex items-start gap-2 text-xs text-slate-400">
                    <span className="text-red-400 mt-0.5">✕</span>
                    Miss a day and your streak resets to 0
                  </li>
                  <li className="flex items-start gap-2 text-xs text-slate-400">
                    <span className="text-yellow-400 mt-0.5">◷</span>
                    You have until midnight to log and keep today's streak alive
                  </li>
                </ul>
              </div>
              {/* Arrow */}
              <div className="w-3 h-3 bg-slate-800 border-r border-b border-slate-700 rotate-45 mx-auto -mt-1.5" />
            </div>
          </div>

          {/* Log Food CTA */}
          <button onClick={() => { setLogMeal(null); setLogOpen(true) }}
            className="w-full h-14 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold text-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 group">
            <span className="material-symbols-outlined">add_circle</span>
            Log Food
          </button>

        </div>
      </main>

      <footer className="py-6 px-6 text-center">
        <p className="text-slate-700 text-xs">© {new Date().getFullYear()} Healtho. All rights reserved.</p>
      </footer>

      <LogFoodModal
        open={logOpen}
        defaultMeal={logMeal}
        logDate={selectedDate}
        editEntry={editEntry}
        onClose={() => { setLogOpen(false); setLogMeal(null); setEditEntry(null) }}
        onLogged={fetchLogs}
      />

      <CelebrationOverlay
        visible={waterCelebration.showCelebration}
        variant="water"
        onDismiss={waterCelebration.dismiss}
      />
      <CelebrationOverlay
        visible={mealCelebration.showCelebration}
        variant="meals"
        onDismiss={mealCelebration.dismiss}
      />
    </div>
  )
}
