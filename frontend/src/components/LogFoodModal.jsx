import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { searchFoods, POPULAR_FOODS } from '../data/foods'

const MEAL_TYPES = [
  { id: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { id: 'lunch',     label: 'Lunch',     emoji: '☀️' },
  { id: 'dinner',    label: 'Dinner',    emoji: '🌙' },
  { id: 'snacks',    label: 'Snacks',    emoji: '🍎' },
]

export default function LogFoodModal({ open, onClose, onLogged }) {
  const searchRef  = useRef(null)
  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState([])
  const [selected, setSelected] = useState(null)
  const [meal,     setMeal]     = useState('')
  const [qty,      setQty]      = useState(1)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 350)
    } else {
      setTimeout(() => {
        setQuery(''); setResults([]); setSelected(null)
        setMeal(''); setQty(1); setError('')
      }, 300)
    }
  }, [open])

  useEffect(() => {
    setResults(query.trim() ? searchFoods(query) : [])
  }, [query])

  const scaled = (val) => Math.round(val * qty * 10) / 10

  const handleSelect = (food) => {
    setSelected(food)
    setQuery(food.name)
    setResults([])
    setQty(1)
    setError('')
  }

  const handleLog = async () => {
    if (!selected) { setError('Please select a food item.'); return }
    if (!meal)     { setError('Please select a meal.'); return }
    if (qty <= 0)  { setError('Quantity must be greater than 0.'); return }

    setSaving(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not signed in')

      const today = new Date().toISOString().split('T')[0]

      const { error: insertError } = await supabase.from('food_logs').insert({
        user_id:   session.user.id,
        date:      today,
        meal_type: meal,
        food_name: selected.name,
        calories:  scaled(selected.calories),
        protein_g: scaled(selected.protein_g),
        carbs_g:   scaled(selected.carbs_g),
        fat_g:     scaled(selected.fat_g),
        fiber_g:   scaled(selected.fiber_g),
        portion:   `${qty} × ${selected.serving}`,
        quantity:  qty,
      })

      if (insertError) throw insertError
      onLogged?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleOverlay = (e) => { if (e.target === e.currentTarget) onClose() }

  return (
    <div
      className={`fixed inset-0 bg-black/60 z-50 flex items-end justify-center transition-opacity duration-200 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      onClick={handleOverlay}
    >
      <div className={`w-full max-w-[520px] bg-[#1a1a1a] border border-slate-800 rounded-t-2xl p-5 pb-10 max-h-[90vh] overflow-y-auto scrollbar-hide transition-transform duration-300 ${open ? 'translate-y-0' : 'translate-y-full'}`}>

        <div className="w-10 h-1 rounded-full bg-slate-700 mx-auto mb-5" />
        <h2 className="text-white text-2xl font-extrabold mb-1">Log Food</h2>
        <p className="text-slate-500 text-sm mb-5">Search a food, set quantity, then pick a meal.</p>

        {/* Search */}
        <div className="relative mb-1">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xl">search</span>
          <input
            ref={searchRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(null) }}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-11 pr-10 h-14 text-slate-100 text-base placeholder:text-slate-600 focus:outline-none focus:border-primary transition-colors"
            placeholder="Search food, e.g. dal, banana, roti…"
          />
          {query.length > 0 && (
            <button className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300" onClick={() => { setQuery(''); setSelected(null); setResults([]) }}>
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          )}
        </div>

        {/* Search results */}
        {results.length > 0 && (
          <div className="bg-slate-900 border border-slate-700 rounded-xl mb-4 overflow-hidden">
            {results.map(food => (
              <div key={food.id} onClick={() => handleSelect(food)} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800 cursor-pointer border-b border-slate-800 last:border-0 transition-colors">
                <span className="text-xl w-8 text-center">{food.emoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{food.name}</p>
                  <p className="text-xs text-slate-500">{food.serving}</p>
                </div>
                <span className="font-mono text-sm text-slate-400">{food.calories} kcal</span>
              </div>
            ))}
          </div>
        )}

        {query.trim().length > 1 && results.length === 0 && !selected && (
          <p className="text-slate-600 text-sm mb-4 px-1">No results for "{query}" — try a different term.</p>
        )}

        {/* Selected food card */}
        {selected && (
          <div className="bg-slate-900 border border-primary/30 rounded-xl p-4 mb-5">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{selected.emoji}</span>
              <div>
                <p className="text-white font-bold">{selected.name}</p>
                <p className="text-slate-500 text-xs">{selected.serving} per serving</p>
              </div>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <p className="text-slate-400 text-sm font-semibold flex-1">Servings</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setQty(q => Math.max(0.5, parseFloat((q - 0.5).toFixed(1))))} className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center hover:bg-slate-700 transition-colors">−</button>
                <span className="text-white font-mono font-bold w-8 text-center">{qty}</span>
                <button onClick={() => setQty(q => parseFloat((q + 0.5).toFixed(1)))} className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center hover:bg-slate-700 transition-colors">+</button>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: 'Calories', val: scaled(selected.calories),  color: 'text-primary'    },
                { label: 'Protein',  val: scaled(selected.protein_g), color: 'text-blue-400'   },
                { label: 'Carbs',    val: scaled(selected.carbs_g),   color: 'text-yellow-400' },
                { label: 'Fat',      val: scaled(selected.fat_g),     color: 'text-red-400'    },
              ].map(m => (
                <div key={m.label} className="bg-slate-800 rounded-xl py-2 px-1">
                  <p className={`font-mono font-bold text-base ${m.color}`}>{m.val}</p>
                  <p className="text-slate-500 text-[10px] font-semibold mt-0.5">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Meal selector */}
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Select Meal</p>
        <div className="grid grid-cols-4 gap-2 mb-5">
          {MEAL_TYPES.map(m => (
            <button key={m.id} onClick={() => setMeal(m.id)}
              className={`flex flex-col items-center py-3 rounded-xl border-2 transition-all ${meal === m.id ? 'border-primary bg-primary/10 text-white' : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-600'}`}>
              <span className="text-2xl mb-1">{m.emoji}</span>
              <span className="text-xs font-semibold">{m.label}</span>
            </button>
          ))}
        </div>

        {/* Popular */}
        {!query && !selected && (
          <>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Popular</p>
            <div className="space-y-1">
              {POPULAR_FOODS.map(food => (
                <div key={food.id} onClick={() => handleSelect(food)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 cursor-pointer transition-colors border border-transparent hover:border-slate-700">
                  <span className="text-xl w-10 text-center">{food.emoji}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{food.name}</p>
                    <p className="text-xs text-slate-500">{`P ${food.protein_g}g · C ${food.carbs_g}g · F ${food.fat_g}g`}</p>
                  </div>
                  <span className="font-mono text-sm text-slate-400">{food.calories} kcal</span>
                </div>
              ))}
            </div>
          </>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl mt-4">
            <span className="material-symbols-outlined text-red-400 text-base">warning</span>
            <p className="text-red-400 text-sm font-semibold">{error}</p>
          </div>
        )}

        <button onClick={handleLog} disabled={saving || !selected || !meal}
          className="w-full h-14 bg-primary hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-base shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 mt-5">
          {saving
            ? <><span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>Saving…</>
            : <><span className="material-symbols-outlined text-xl">add_circle</span>Log Food</>
          }
        </button>
      </div>
    </div>
  )
}
