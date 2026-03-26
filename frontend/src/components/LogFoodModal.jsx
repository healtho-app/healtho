import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { searchFoods, searchDrinks, POPULAR_FOODS, POPULAR_DRINKS } from '../data/foods'

const MEAL_TYPES = [
  { id: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { id: 'lunch',     label: 'Lunch',     emoji: '☀️' },
  { id: 'dinner',    label: 'Dinner',    emoji: '🌙' },
  { id: 'snacks',    label: 'Snacks',    emoji: '🍎' },
]

const EMPTY_CUSTOM = { name: '', calories: '', protein: '', carbs: '', fat: '', fiber: '', serving: '1 serving' }

export default function LogFoodModal({ open, defaultMeal = null, onClose, onLogged }) {
  const searchRef   = useRef(null)
  const [itemType,    setItemType]    = useState('food')
  const [query,       setQuery]       = useState('')
  const [results,     setResults]     = useState([])
  const [selected,    setSelected]    = useState(null)
  const [meal,        setMeal]        = useState(defaultMeal || '')
  const [qty,         setQty]         = useState(1)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')

  // Custom food mode
  const [customMode,  setCustomMode]  = useState(false)
  const [custom,      setCustom]      = useState(EMPTY_CUSTOM)

  // ── Reset on open/close ───────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setItemType('food')
      setMeal(defaultMeal || '')
      setCustomMode(false)
      setCustom(EMPTY_CUSTOM)
      setTimeout(() => searchRef.current?.focus(), 350)
    } else {
      setTimeout(() => {
        setQuery(''); setResults([]); setSelected(null)
        setItemType('food'); setMeal(''); setQty(1); setError('')
        setCustomMode(false); setCustom(EMPTY_CUSTOM)
      }, 300)
    }
  }, [open, defaultMeal])

  // Re-run search when switching food ↔ drink
  useEffect(() => {
    if (query.trim()) setResults(itemType === 'food' ? searchFoods(query) : searchDrinks(query))
    else setResults([])
    setSelected(null)
    setQuery('')
    setCustomMode(false)
  }, [itemType])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    setResults(itemType === 'food' ? searchFoods(query) : searchDrinks(query))
  }, [query, itemType])

  // ── Helpers ───────────────────────────────────────────────────────────────
  const scaled = (val) => Math.round((parseFloat(val) || 0) * qty * 10) / 10

  const handleSelect = (food) => {
    setSelected(food)
    setQuery(food.name)
    setResults([])
    setQty(1)
    setError('')
    setCustomMode(false)
  }

  const setCustomField = (field) => (e) =>
    setCustom(prev => ({ ...prev, [field]: e.target.value }))

  const enterCustomMode = () => {
    setCustomMode(true)
    setSelected(null)
    setResults([])
    setCustom(prev => ({ ...EMPTY_CUSTOM, name: query.trim() }))
    setQty(1)
    setError('')
  }

  const exitCustomMode = () => {
    setCustomMode(false)
    setCustom(EMPTY_CUSTOM)
    setSelected(null)
  }

  // Custom mode is "ready to log" when name + calories are filled
  const customReady = customMode && custom.name.trim() && custom.calories !== ''

  // ── Log ───────────────────────────────────────────────────────────────────
  const handleLog = async () => {
    if (!customMode && !selected) { setError(`Please select a ${itemType}.`); return }
    if (customMode && !custom.name.trim()) { setError('Food name is required.'); return }
    if (customMode && custom.calories === '') { setError('Calories are required.'); return }
    if (!meal)    { setError('Please select a meal.'); return }
    if (qty <= 0) { setError('Quantity must be greater than 0.'); return }

    setSaving(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not signed in')

      const d     = new Date()
      const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

      const row = customMode
        ? {
            user_id:   session.user.id,
            date:      today,
            meal_type: meal,
            food_name: custom.name.trim(),
            calories:  scaled(custom.calories),
            protein_g: scaled(custom.protein),
            carbs_g:   scaled(custom.carbs),
            fat_g:     scaled(custom.fat),
            fiber_g:   scaled(custom.fiber),
            portion:   `${qty} × ${custom.serving.trim() || '1 serving'}`,
            quantity:  qty,
          }
        : {
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
          }

      const { error: insertError } = await supabase.from('food_logs').insert(row)
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
  const popularList   = itemType === 'food' ? POPULAR_FOODS : POPULAR_DRINKS
  const noResults     = query.trim().length > 1 && results.length === 0 && !selected && !customMode

  return (
    <div
      className={`fixed inset-0 bg-black/60 z-50 flex items-end justify-center transition-opacity duration-200 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      onClick={handleOverlay}
    >
      <div className={`w-full max-w-[520px] bg-[#1a1a1a] border border-slate-800 rounded-t-2xl p-5 pb-10 max-h-[90vh] overflow-y-auto scrollbar-hide transition-transform duration-300 ${open ? 'translate-y-0' : 'translate-y-full'}`}>

        <div className="w-10 h-1 rounded-full bg-slate-700 mx-auto mb-5" />
        <h2 className="text-white text-2xl font-extrabold mb-1">Log Food</h2>
        <p className="text-slate-500 text-sm mb-5">Search an item, set quantity, then pick a meal.</p>

        {/* Food / Drink toggle */}
        <div className="flex gap-2 mb-5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          {[{ id: 'food', emoji: '🍽️', label: 'Food' }, { id: 'drink', emoji: '🥤', label: 'Drinks' }].map(t => (
            <button key={t.id} onClick={() => setItemType(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${itemType === t.id ? 'bg-primary text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}>
              <span className="text-base">{t.emoji}</span> {t.label}
            </button>
          ))}
        </div>

        {/* Search — hidden in custom mode */}
        {!customMode && (
          <>
            <div className="relative mb-1">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xl">search</span>
              <input
                ref={searchRef}
                value={query}
                onChange={e => { setQuery(e.target.value); setSelected(null) }}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-11 pr-10 h-14 text-slate-100 text-base placeholder:text-slate-600 focus:outline-none focus:border-primary transition-colors"
                placeholder={itemType === 'food' ? 'Search food, e.g. dal, banana, roti…' : 'Search drink, e.g. chai, lassi, coffee…'}
              />
              {query.length > 0 && (
                <button className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  onClick={() => { setQuery(''); setSelected(null); setResults([]) }}>
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              )}
            </div>

            {/* Search results */}
            {results.length > 0 && (
              <div className="bg-slate-900 border border-slate-700 rounded-xl mb-4 overflow-hidden">
                {results.map(food => (
                  <div key={food.id} onClick={() => handleSelect(food)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800 cursor-pointer border-b border-slate-800 last:border-0 transition-colors">
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

            {/* No results → offer custom entry */}
            {noResults && (
              <div className="mb-4 p-4 bg-slate-900 border border-slate-800 rounded-xl">
                <p className="text-slate-400 text-sm mb-3">
                  No results for <span className="text-white font-semibold">"{query}"</span> in our database.
                </p>
                <button onClick={enterCustomMode}
                  className="w-full h-11 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-primary text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">add_circle</span>
                  Log "{query}" as custom food
                </button>
              </div>
            )}
          </>
        )}

        {/* ── Custom entry form ─────────────────────────────────────────── */}
        {customMode && (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-4">
              <button onClick={exitCustomMode}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined text-slate-400 text-base">arrow_back</span>
              </button>
              <p className="text-sm font-bold text-white">Custom food entry</p>
            </div>

            <div className="space-y-3">
              {/* Name */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Food name *</label>
                <input
                  value={custom.name}
                  onChange={setCustomField('name')}
                  placeholder="e.g. Lays Classic Chips"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-primary rounded-xl h-12 px-4 text-slate-100 text-sm placeholder:text-slate-600 focus:outline-none transition-colors"
                />
              </div>

              {/* Serving description */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Serving size</label>
                <input
                  value={custom.serving}
                  onChange={setCustomField('serving')}
                  placeholder="e.g. 1 packet (28g)"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-primary rounded-xl h-12 px-4 text-slate-100 text-sm placeholder:text-slate-600 focus:outline-none transition-colors"
                />
              </div>

              {/* Macros grid */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                  Macros per serving <span className="text-slate-600 normal-case font-normal">(* = required)</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { field: 'calories', label: 'Calories (kcal) *', color: 'text-primary',    placeholder: '150' },
                    { field: 'protein',  label: 'Protein (g)',        color: 'text-blue-400',   placeholder: '2'   },
                    { field: 'carbs',    label: 'Carbs (g)',          color: 'text-yellow-400', placeholder: '18'  },
                    { field: 'fat',      label: 'Fat (g)',            color: 'text-red-400',    placeholder: '9'   },
                    { field: 'fiber',    label: 'Fiber (g)',          color: 'text-green-400',  placeholder: '1'   },
                  ].map(({ field, label, color, placeholder }) => (
                    <div key={field} className={`bg-slate-900 border border-slate-800 rounded-xl p-3 ${field === 'calories' ? 'col-span-2' : ''}`}>
                      <label className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${color}`}>{label}</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={custom[field]}
                        onChange={setCustomField(field)}
                        placeholder={placeholder}
                        className="w-full bg-transparent text-white text-base font-mono placeholder:text-slate-700 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Live preview */}
              {customReady && (
                <div className="bg-slate-900 border border-primary/30 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Preview · {qty} serving{qty !== 1 ? 's' : ''}</p>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {[
                      { label: 'Calories', val: scaled(custom.calories),  color: 'text-primary'    },
                      { label: 'Protein',  val: scaled(custom.protein),   color: 'text-blue-400'   },
                      { label: 'Carbs',    val: scaled(custom.carbs),     color: 'text-yellow-400' },
                      { label: 'Fat',      val: scaled(custom.fat),       color: 'text-red-400'    },
                    ].map(m => (
                      <div key={m.label} className="bg-slate-800 rounded-xl py-2 px-1">
                        <p className={`font-mono font-bold text-base ${m.color}`}>{m.val}</p>
                        <p className="text-slate-500 text-[10px] font-semibold mt-0.5">{m.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Selected item card (database item) */}
        {selected && !customMode && (
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

        {/* Qty stepper for custom mode */}
        {customMode && customReady && (
          <div className="flex items-center gap-3 mb-5 px-1">
            <p className="text-slate-400 text-sm font-semibold flex-1">Servings</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setQty(q => Math.max(0.5, parseFloat((q - 0.5).toFixed(1))))} className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center hover:bg-slate-700 transition-colors">−</button>
              <span className="text-white font-mono font-bold w-8 text-center">{qty}</span>
              <button onClick={() => setQty(q => parseFloat((q + 0.5).toFixed(1)))} className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center hover:bg-slate-700 transition-colors">+</button>
            </div>
          </div>
        )}

        {/* Meal selector */}
        {!defaultMeal ? (
          <>
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
          </>
        ) : (
          <div className="flex items-center gap-2 mb-5 px-1">
            <span className="text-lg">{MEAL_TYPES.find(m => m.id === defaultMeal)?.emoji}</span>
            <p className="text-sm text-slate-400">Logging to <span className="text-white font-semibold">{MEAL_TYPES.find(m => m.id === defaultMeal)?.label}</span></p>
          </div>
        )}

        {/* Popular — only show when idle */}
        {!query && !selected && !customMode && (
          <>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">
              {itemType === 'food' ? 'Popular Foods' : 'Popular Drinks'}
            </p>
            <div className="space-y-1">
              {popularList.map(food => (
                <div key={food.id} onClick={() => handleSelect(food)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 cursor-pointer transition-colors border border-transparent hover:border-slate-700">
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

        <button
          onClick={handleLog}
          disabled={saving || (!customMode && (!selected || !meal)) || (customMode && (!customReady || !meal))}
          className="w-full h-14 bg-primary hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-base shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 mt-5">
          {saving
            ? <><span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>Saving…</>
            : <><span className="material-symbols-outlined text-xl">add_circle</span>Log {customMode ? 'Custom Food' : itemType === 'food' ? 'Food' : 'Drink'}</>
          }
        </button>
      </div>
    </div>
  )
}
