import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Header       from '../components/Header'
import CalorieRing  from '../components/CalorieRing'
import MacroCard    from '../components/MacroCard'
import WaterTracker from '../components/WaterTracker'
import MealSection  from '../components/MealSection'
import LogFoodModal from '../components/LogFoodModal'

// --- Placeholder data (will come from Supabase API later) ---
const DAILY_DATA = {
  consumed: 1309,
  goal:     2200,
  burned:   380,
  macros: [
    { label: 'Protein', amount: 72,  pct: 57, color: 'bg-protein' },
    { label: 'Carbs',   amount: 168, pct: 67, color: 'bg-carbs'   },
    { label: 'Fat',     amount: 38,  pct: 48, color: 'bg-fat'     },
    { label: 'Fiber',   amount: 18,  pct: 72, color: 'bg-fiber'   },
  ],
  meals: [
    {
      id: 'breakfast', emoji: '🌅', name: 'Breakfast', calories: 487, defaultOpen: true,
      items: [
        { name: 'Masala Oats',  portion: '250g',     calories: 210 },
        { name: 'Boiled Eggs',  portion: '2 eggs',   calories: 155 },
        { name: 'Banana',       portion: '1 medium', calories: 122 },
      ],
    },
    {
      id: 'lunch', emoji: '☀️', name: 'Lunch', calories: 612, defaultOpen: false,
      items: [
        { name: 'Dal Rice',    portion: '400g', calories: 450 },
        { name: 'Mixed Salad', portion: '150g', calories: 162 },
      ],
    },
    {
      id: 'dinner', emoji: '🌙', name: 'Dinner', calories: 0, defaultOpen: false,
      items: [],
    },
    {
      id: 'snacks', emoji: '🍎', name: 'Snacks', calories: 210, defaultOpen: false,
      items: [
        { name: 'Greek Yogurt', portion: '200g', calories: 210 },
      ],
    },
  ],
}

export default function Dashboard() {
  const [logOpen, setLogOpen] = useState(false)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    async function fetchUser() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .single()
      if (data?.full_name) setUserName(data.full_name.split(' ')[0])
    }
    fetchUser()
  }, [])

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
            <h1 className="text-white text-4xl font-extrabold leading-tight tracking-tight mt-1">
              Good morning, <span className="text-primary">{userName || 'there'}</span> 👋
            </h1>
            <p className="text-slate-500 text-base mt-1">Here's your nutrition summary for today.</p>
          </div>

          {/* Calorie ring */}
          <CalorieRing
            consumed={DAILY_DATA.consumed}
            goal={DAILY_DATA.goal}
            burned={DAILY_DATA.burned}
          />

          {/* Macro strip */}
          <div className="grid grid-cols-4 gap-3">
            {DAILY_DATA.macros.map(m => (
              <MacroCard key={m.label} {...m} />
            ))}
          </div>

          {/* Water */}
          <WaterTracker initialFilled={5} />

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

          {/* Meal sections */}
          {DAILY_DATA.meals.map(meal => (
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
              <p className="text-sm font-bold text-white">12 day streak</p>
              <p className="text-xs text-green-400 font-semibold mt-0.5">Best streak this month — keep going!</p>
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
