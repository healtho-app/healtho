import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const MEAL_TYPES = [
  { id: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { id: 'lunch',     label: 'Lunch',     emoji: '☀️' },
  { id: 'dinner',    label: 'Dinner',    emoji: '🌙' },
  { id: 'snacks',    label: 'Snacks',    emoji: '🍎' },
]

const SERVING_UNITS = ['g', 'oz', 'ml', 'cup', 'tbsp', 'tsp', 'piece', 'serving']

const EMPTY_CUSTOM = {
  id:          null,
  name:        '',
  brand:       '',
  servingSize: '100',
  servingUnit: 'g',
  calories:    '',
  protein:     '',
  carbs:       '',
  fat:         '',
  fiber:       '',
  autoCalc:    true,
}

// Auto-calculate calories from macros (4/4/9 rule)
const calcCalories = (protein, carbs, fat) =>
  Math.round((parseFloat(protein) || 0) * 4 + (parseFloat(carbs) || 0) * 4 + (parseFloat(fat) || 0) * 9)

// Fallback: compute today's local date string if logDate not provided
const localDateStr = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// ── USDA FoodData Central API ────────────────────────────────────────────────
const USDA_API_KEY = import.meta.env.VITE_USDA_API_KEY || ''
const USDA_SEARCH_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search'

// Extract a nutrient value from USDA foodNutrients array by nutrient number
function usdaNutrient(nutrients, number) {
  const n = nutrients?.find(n => n.nutrientNumber === String(number))
  return Math.round((n?.value || 0) * 10) / 10
}

// Search USDA and map to our food schema — use real serving sizes when available
async function searchUSDA(query) {
  if (!USDA_API_KEY || !query.trim()) return []
  try {
    const params = new URLSearchParams({
      query,
      api_key: USDA_API_KEY,
      pageSize: '8',
      dataType: 'Foundation,SR Legacy',
    })
    const res = await fetch(`${USDA_SEARCH_URL}?${params}`)
    if (!res.ok) return []
    const json = await res.json()
    return (json.foods || []).map(f => {
      // USDA nutrients are always per 100g — scale to real serving if available
      const per100 = {
        calories: usdaNutrient(f.foodNutrients, 208),
        protein:  usdaNutrient(f.foodNutrients, 203),
        carbs:    usdaNutrient(f.foodNutrients, 205),
        fat:      usdaNutrient(f.foodNutrients, 204),
        fiber:    usdaNutrient(f.foodNutrients, 291),
      }

      const srvSize = f.servingSize          // e.g. 50 (grams)
      const srvUnit = f.servingSizeUnit       // e.g. "g"
      const srvText = f.householdServingFullText // e.g. "1 large"

      // Build serving label + scale factor
      let serving = '100g'
      let scale   = 1 // 1 = per 100g (no scaling)

      if (srvSize && srvUnit?.toLowerCase() === 'g' && srvSize !== 100) {
        scale = srvSize / 100
        const grams = `${Math.round(srvSize)}g`
        serving = srvText ? `${srvText} (${grams})` : grams
      } else if (srvText) {
        serving = srvText
      }

      const round1 = (v) => Math.round(v * scale * 10) / 10

      return {
        _usda:          true,
        usda_fdc_id:    String(f.fdcId),
        name:           f.description,
        normalized_name: f.description.toLowerCase(),
        emoji:          '🔬',
        type:           'food',
        calories:       round1(per100.calories),
        protein_g:      round1(per100.protein),
        carbs_g:        round1(per100.carbs),
        fat_g:          round1(per100.fat),
        fiber_g:        round1(per100.fiber),
        serving,
        source:         'usda',
        is_verified:    true,
      }
    })
  } catch (err) {
    console.warn('[LogFoodModal] USDA search failed:', err.message)
    return []
  }
}

// ── Debounce hook for search ─────────────────────────────────────────────────
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function LogFoodModal({ open, defaultMeal = null, logDate, editEntry = null, onClose, onLogged }) {
  const searchRef  = useRef(null)
  const savingRef  = useRef(false)
  const isEditing  = !!editEntry

  // ── Core state ─────────────────────────────────────────────────────────────
  const [itemType,    setItemType]    = useState('food')
  const [query,       setQuery]       = useState('')
  const [results,     setResults]     = useState([])
  const [searching,   setSearching]   = useState(false)
  const [selected,    setSelected]    = useState(null)
  const [meal,        setMeal]        = useState(defaultMeal || '')
  const [qty,         setQty]         = useState(1)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')
  const [customMode,  setCustomMode]  = useState(false)
  const [custom,      setCustom]      = useState(EMPTY_CUSTOM)

  // ── Macro editing state ────────────────────────────────────────────────────
  // baseMacros = per-serving reference values from the food DB
  // macros     = live values (qty-scaled + any user overrides)
  // pinnedFields = set of fields the user has manually edited
  const [baseMacros,    setBaseMacros]    = useState(null)
  const [macros,        setMacros]        = useState({ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 })
  const [pinnedFields,  setPinnedFields]  = useState(new Set())

  const debouncedQuery = useDebounce(query, 250)

  // ── Search Supabase foods table ────────────────────────────────────────────
  const searchFoods = useCallback(async (q, type) => {
    if (!q || q.trim().length < 1) return []
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id || null

    // PostgREST .or() uses commas as delimiters — strip commas from the
    // search term so food names like "TACO BELL, Bean Burrito" don't break
    // the filter parser. Replacing with space still matches via ILIKE.
    const safe = q.replace(/,/g, ' ').replace(/\s+/g, ' ').trim()

    const { data, error: searchError } = await supabase
      .from('foods')
      .select('*')
      .eq('type', type)
      .or(`normalized_name.ilike.%${safe.toLowerCase()}%,name.ilike.%${safe}%`)
      .order('is_verified', { ascending: false })
      .limit(10)

    if (searchError) {
      console.error('[LogFoodModal] search error:', searchError.message)
      return []
    }

    // Filter: show global foods + only this user's custom foods
    return (data || []).filter(f => !f.created_by_user_id || f.created_by_user_id === userId)
  }, [])

  // ── Run search when debounced query changes ────────────────────────────────
  // Local DB first, then USDA fallback when < 3 local results
  useEffect(() => {
    if (!debouncedQuery.trim() || selected || customMode || isEditing) {
      if (!debouncedQuery.trim()) setResults([])
      return
    }
    let cancelled = false
    setSearching(true)

    searchFoods(debouncedQuery, itemType).then(async (localData) => {
      if (cancelled) return

      // If local results are enough, skip USDA
      if (localData.length >= 3) {
        setResults(localData)
        setSearching(false)
        return
      }

      // Fallback: query USDA for more results
      const usdaData = await searchUSDA(debouncedQuery)
      if (cancelled) return

      // Dedupe: skip USDA items that match a local name
      const localNames = new Set(localData.map(f => f.name.toLowerCase()))
      const filtered = usdaData.filter(f => !localNames.has(f.name.toLowerCase()))

      setResults([...localData, ...filtered])
      setSearching(false)
    })

    return () => { cancelled = true }
  }, [debouncedQuery, itemType, searchFoods, selected, customMode, isEditing])

  // ── Recalculate unpinned macros when qty changes ───────────────────────────
  useEffect(() => {
    if (!baseMacros) return
    setMacros(prev => {
      const updated = { ...prev }
      for (const key of Object.keys(baseMacros)) {
        if (!pinnedFields.has(key)) {
          updated[key] = Math.round(baseMacros[key] * qty * 10) / 10
        }
      }
      return updated
    })
  }, [qty, baseMacros, pinnedFields])

  // ── Reset on open/close ───────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      if (editEntry) {
        setMeal(editEntry.meal_type || defaultMeal || '')
        setQty(editEntry.quantity || 1)
        setItemType('food')
        setCustomMode(false)
        setQuery('')
        setResults([])
        setSelected(null)
        setError('')
        // Set up macros from the edit entry
        const unitCals = editEntry.unitCalories || 0
        const unitP    = editEntry.unitProtein  || 0
        const unitC    = editEntry.unitCarbs    || 0
        const unitF    = editEntry.unitFat      || 0
        const unitFi   = editEntry.unitFiber    || 0
        const base = { calories: unitCals, protein: unitP, carbs: unitC, fat: unitF, fiber: unitFi }
        setBaseMacros(base)
        setMacros({
          calories: Math.round(unitCals * (editEntry.quantity || 1) * 10) / 10,
          protein:  Math.round(unitP * (editEntry.quantity || 1) * 10) / 10,
          carbs:    Math.round(unitC * (editEntry.quantity || 1) * 10) / 10,
          fat:      Math.round(unitF * (editEntry.quantity || 1) * 10) / 10,
          fiber:    Math.round(unitFi * (editEntry.quantity || 1) * 10) / 10,
        })
        setPinnedFields(new Set())
      } else {
        setItemType('food')
        setMeal(defaultMeal || '')
        setCustomMode(false)
        setCustom(EMPTY_CUSTOM)
        setBaseMacros(null)
        setMacros({ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 })
        setPinnedFields(new Set())
        setTimeout(() => searchRef.current?.focus(), 350)
      }
    } else {
      setTimeout(() => {
        setQuery(''); setResults([]); setSelected(null)
        setItemType('food'); setMeal(''); setQty(1); setError('')
        setCustomMode(false); setCustom(EMPTY_CUSTOM)
        setBaseMacros(null); setMacros({ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 })
        setPinnedFields(new Set())
      }, 300)
    }
  }, [open, defaultMeal, editEntry])

  // Clear results when switching food/drink tab
  useEffect(() => {
    setResults([])
    setSelected(null)
    setQuery('')
    setCustomMode(false)
  }, [itemType])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSelect = async (food) => {
    let finalFood = food

    // If this is a USDA result, cache it in our foods table
    if (food._usda) {
      const { data: { session } } = await supabase.auth.getSession()
      const { data: cached } = await supabase
        .from('foods')
        .insert({
          name:               food.name,
          normalized_name:    food.name.toLowerCase(),
          emoji:              '🔬',
          type:               food.type || 'food',
          calories:           food.calories,
          protein_g:          food.protein_g,
          carbs_g:            food.carbs_g,
          fat_g:              food.fat_g,
          fiber_g:            food.fiber_g,
          serving:            food.serving,
          source:             'usda',
          is_verified:        true,
          usda_fdc_id:        food.usda_fdc_id,
          created_by_user_id: session?.user?.id,
        })
        .select()
        .maybeSingle()

      if (cached) finalFood = cached
    }

    setSelected(finalFood)
    setQuery(finalFood.name)
    setResults([])
    setQty(1)
    setError('')
    setCustomMode(false)
    const base = {
      calories: finalFood.calories,
      protein:  finalFood.protein_g,
      carbs:    finalFood.carbs_g,
      fat:      finalFood.fat_g,
      fiber:    finalFood.fiber_g,
    }
    setBaseMacros(base)
    setMacros({ ...base })
    setPinnedFields(new Set())
  }

  const handleMacroEdit = (field, value) => {
    const num = value === '' ? 0 : parseFloat(value) || 0
    setMacros(prev => ({ ...prev, [field]: num }))
    setPinnedFields(prev => new Set([...prev, field]))
  }

  const resetPins = () => {
    setPinnedFields(new Set())
    if (baseMacros) {
      setMacros({
        calories: Math.round(baseMacros.calories * qty * 10) / 10,
        protein:  Math.round(baseMacros.protein  * qty * 10) / 10,
        carbs:    Math.round(baseMacros.carbs    * qty * 10) / 10,
        fat:      Math.round(baseMacros.fat      * qty * 10) / 10,
        fiber:    Math.round(baseMacros.fiber    * qty * 10) / 10,
      })
    }
  }

  const setField = (field) => (e) =>
    setCustom(prev => ({ ...prev, [field]: e.target.value }))

  const enterCustomMode = () => {
    setCustomMode(true)
    setSelected(null)
    setResults([])
    setCustom({ ...EMPTY_CUSTOM, name: query.trim() })
    setQty(1)
    setError('')
    setBaseMacros(null)
    setMacros({ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 })
    setPinnedFields(new Set())
  }

  const exitCustomMode = () => {
    setCustomMode(false)
    setCustom(EMPTY_CUSTOM)
    setSelected(null)
  }

  // Custom food helpers
  const autoCalories = calcCalories(custom.protein, custom.carbs, custom.fat)
  const displayCalories = custom.autoCalc
    ? (autoCalories > 0 ? String(autoCalories) : '')
    : custom.calories
  const customReady = customMode && custom.name.trim() &&
    (custom.autoCalc ? autoCalories > 0 : custom.calories !== '')

  const customScaled = (val) => Math.round((parseFloat(val) || 0) * qty * 10) / 10

  // ── Log / Save edit ───────────────────────────────────────────────────────
  const handleLog = async () => {
    if (savingRef.current) return
    savingRef.current = true

    if (!isEditing) {
      if (!customMode && !selected) { savingRef.current = false; setError(`Please select a ${itemType}.`); return }
      if (customMode && !custom.name.trim()) { savingRef.current = false; setError('Food name is required.'); return }
      if (customMode && !custom.autoCalc && custom.calories === '') { savingRef.current = false; setError('Calories are required.'); return }
    }
    if (!meal)    { savingRef.current = false; setError('Please select a meal.'); return }
    if (qty <= 0) { savingRef.current = false; setError('Quantity must be greater than 0.'); return }

    setSaving(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not signed in')

      // ── EDIT MODE — UPDATE existing row ─────────────────────────────────
      if (isEditing) {
        const baseLabel = editEntry.portion?.replace(/^[\d.]+\s×\s/, '') || editEntry.name
        const { error: updateError } = await supabase
          .from('food_logs')
          .update({
            quantity:           qty,
            meal_type:          meal,
            calories:           macros.calories,
            protein_g:          macros.protein,
            carbs_g:            macros.carbs,
            fat_g:              macros.fat,
            fiber_g:            macros.fiber,
            original_calories:  baseMacros?.calories  ?? null,
            original_protein_g: baseMacros?.protein   ?? null,
            original_carbs_g:   baseMacros?.carbs     ?? null,
            original_fat_g:     baseMacros?.fat       ?? null,
            original_fiber_g:   baseMacros?.fiber     ?? null,
            portion:            `${qty} × ${baseLabel}`,
          })
          .eq('id', editEntry.id)
        if (updateError) throw updateError
        onLogged?.()
        onClose()
        return
      }

      // ── NEW LOG — INSERT ─────────────────────────────────────────────────
      const dateToLog = logDate || localDateStr()

      if (customMode) {
        const finalCals    = custom.autoCalc ? autoCalories : (parseFloat(custom.calories) || 0)
        const servingLabel = `${custom.servingSize} ${custom.servingUnit}${custom.brand ? ` · ${custom.brand}` : ''}`

        const row = {
          user_id:            session.user.id,
          date:               dateToLog,
          meal_type:          meal,
          food_name:          custom.name.trim(),
          calories:           customScaled(finalCals),
          protein_g:          customScaled(custom.protein),
          carbs_g:            customScaled(custom.carbs),
          fat_g:              customScaled(custom.fat),
          fiber_g:            customScaled(custom.fiber),
          original_calories:  finalCals,
          original_protein_g: parseFloat(custom.protein) || 0,
          original_carbs_g:   parseFloat(custom.carbs)   || 0,
          original_fat_g:     parseFloat(custom.fat)     || 0,
          original_fiber_g:   parseFloat(custom.fiber)   || 0,
          portion:            `${qty} × ${servingLabel}`,
          quantity:           qty,
        }

        const { error: insertError } = await supabase.from('food_logs').insert(row)
        if (insertError) throw insertError

        // Save to foods table as user-created food (skip if already saved)
        if (!custom.id) {
          await supabase.from('foods').insert({
            name:               custom.name.trim(),
            normalized_name:    custom.name.trim().toLowerCase(),
            emoji:              '⭐',
            type:               itemType,
            calories:           finalCals,
            protein_g:          parseFloat(custom.protein) || 0,
            carbs_g:            parseFloat(custom.carbs)   || 0,
            fat_g:              parseFloat(custom.fat)     || 0,
            fiber_g:            parseFloat(custom.fiber)   || 0,
            serving:            `${custom.servingSize} ${custom.servingUnit}`,
            source:             'user',
            is_verified:        false,
            created_by_user_id: session.user.id,
          }).then(({ error: foodErr }) => {
            if (foodErr) console.warn('[LogFoodModal] Could not save to foods table:', foodErr.message)
          })
        }
      } else {
        // Standard food from the foods table
        const row = {
          user_id:            session.user.id,
          date:               dateToLog,
          meal_type:          meal,
          food_name:          selected.name,
          food_id:            selected.id,
          calories:           macros.calories,
          protein_g:          macros.protein,
          carbs_g:            macros.carbs,
          fat_g:              macros.fat,
          fiber_g:            macros.fiber,
          original_calories:  baseMacros.calories,
          original_protein_g: baseMacros.protein,
          original_carbs_g:   baseMacros.carbs,
          original_fat_g:     baseMacros.fat,
          original_fiber_g:   baseMacros.fiber,
          portion:            `${qty} × ${selected.serving}`,
          quantity:           qty,
        }

        const { error: insertError } = await supabase.from('food_logs').insert(row)
        if (insertError) throw insertError
      }

      onLogged?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Could not save. Please try again.')
    } finally {
      setSaving(false)
      savingRef.current = false
    }
  }

  const handleOverlay = (e) => { if (e.target === e.currentTarget) onClose() }
  const noResults = debouncedQuery.trim().length > 1 && results.length === 0 && !selected && !customMode && !searching

  // ── Fetch popular foods for idle state ──────────────────────────────────
  const [popular, setPopular] = useState([])
  useEffect(() => {
    if (!open || isEditing) return
    supabase
      .from('foods')
      .select('*')
      .eq('type', itemType)
      .eq('is_verified', true)
      .order('name')
      .limit(8)
      .then(({ data }) => setPopular(data || []))
  }, [open, itemType, isEditing])

  // ── Macro card component (editable) ────────────────────────────────────────
  const MacroCard = ({ field, label, value, color, unit = '' }) => {
    const isPinned = pinnedFields.has(field)
    return (
      <div className={`rounded-xl py-2 px-1 relative ${isPinned ? 'bg-slate-700 border border-primary/30' : 'bg-slate-800'}`}>
        <input
          type="number"
          min="0"
          step="0.1"
          value={value || 0}
          onChange={(e) => handleMacroEdit(field, e.target.value)}
          onKeyDown={(e) => { if (['-', 'e', 'E', '+'].includes(e.key)) e.preventDefault() }}
          className={`font-mono font-bold text-base text-center w-full bg-transparent focus:outline-none ${color}`}
        />
        <p className="text-slate-500 text-[10px] font-semibold mt-0.5 text-center">{label}{unit && ` (${unit})`}</p>
        {isPinned && (
          <span className="absolute top-1 right-1 text-primary text-[8px]">✏️</span>
        )}
      </div>
    )
  }

  return (
    <div
      className={`fixed inset-0 bg-black/60 z-50 flex items-end justify-center transition-opacity duration-200 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      onClick={handleOverlay}
    >
      <div className={`w-full max-w-[520px] bg-[#1a1a1a] border border-slate-800 rounded-t-2xl p-5 pb-10 max-h-[90vh] overflow-y-auto scrollbar-hide transition-transform duration-300 ${open ? 'translate-y-0' : 'translate-y-full'}`}>

        <div className="w-10 h-1 rounded-full bg-slate-700 mx-auto mb-5" />
        <h2 className="text-white text-2xl font-extrabold mb-1">
          {isEditing ? 'Edit Entry' : customMode ? 'Custom Food' : 'Log Food'}
        </h2>
        <p className="text-slate-500 text-sm mb-4">
          {isEditing
            ? `Editing "${editEntry?.name}" — adjust servings or macros.`
            : customMode
              ? "Fill in the details — it'll be saved to your library for future use."
              : 'Search an item, set quantity, then pick a meal.'
          }
        </p>

        {/* Past-date warning banner */}
        {!isEditing && logDate && logDate !== localDateStr() && (
          <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 mb-5">
            <span className="material-symbols-outlined text-yellow-400 text-base mt-0.5 flex-shrink-0">event</span>
            <div className="flex-1">
              <p className="text-yellow-300 text-xs font-semibold">
                Logging to {new Date(logDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              <p className="text-yellow-500/80 text-[11px] mt-0.5">Not today. Make sure this is the right date.</p>
            </div>
          </div>
        )}

        {/* ── EDIT MODE UI ── */}
        {isEditing && (
          <div className="mb-5 space-y-4">
            {/* Food info card */}
            <div className="bg-slate-900 border border-primary/20 rounded-xl p-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Editing</p>
              <div className="flex items-center gap-3">
                <span className="text-2xl">✏️</span>
                <div>
                  <p className="text-white font-bold text-sm">{editEntry?.name}</p>
                  <p className="text-slate-500 text-xs">
                    {editEntry?.portion?.replace(/^[\d.]+\s×\s/, '') || 'per serving'}
                  </p>
                </div>
              </div>
            </div>

            {/* Qty stepper */}
            <div className="flex items-center gap-3 px-1">
              <p className="text-slate-400 text-sm font-semibold flex-1">Servings</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setQty(q => Math.max(0.5, parseFloat((q - 0.5).toFixed(1))))}
                  className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center hover:bg-slate-700 transition-colors">−</button>
                <span className="text-white font-mono font-bold w-8 text-center">{qty}</span>
                <button onClick={() => setQty(q => parseFloat((q + 0.5).toFixed(1)))}
                  className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center hover:bg-slate-700 transition-colors">+</button>
              </div>
            </div>

            {/* Editable macro cards */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <MacroCard field="calories" label="Calories" value={macros.calories} color="text-primary" unit="kcal" />
              <MacroCard field="protein"  label="Protein"  value={macros.protein}  color="text-blue-400" unit="g" />
              <MacroCard field="carbs"    label="Carbs"    value={macros.carbs}    color="text-yellow-400" unit="g" />
              <MacroCard field="fat"      label="Fat"      value={macros.fat}      color="text-red-400" unit="g" />
            </div>

            {/* Reset overrides */}
            {pinnedFields.size > 0 && (
              <button onClick={resetPins}
                className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1 px-1">
                <span className="material-symbols-outlined text-xs">restart_alt</span>
                Reset to recommended values
              </button>
            )}

            {/* Estimation disclaimer */}
            <div className="flex items-start gap-2 px-1">
              <span className="material-symbols-outlined text-slate-600 text-sm mt-0.5 flex-shrink-0">info</span>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                These values are estimates and may not be 100% precise. Adjust to match your actual portion for better accuracy.
              </p>
            </div>
          </div>
        )}

        {/* Food / Drink toggle */}
        {!customMode && !isEditing && (
          <div className="flex gap-2 mb-5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
            {[{ id: 'food', emoji: '🍽️', label: 'Food' }, { id: 'drink', emoji: '🥤', label: 'Drinks' }].map(t => (
              <button key={t.id} onClick={() => setItemType(t.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${itemType === t.id ? 'bg-primary text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}>
                <span className="text-base">{t.emoji}</span> {t.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Search ── */}
        {!customMode && !isEditing && (
          <>
            <div className="relative mb-1">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xl">search</span>
              <input
                ref={searchRef}
                value={query}
                onChange={e => { setQuery(e.target.value); setSelected(null) }}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-11 pr-10 h-14 text-slate-100 text-base placeholder:text-slate-600 focus:outline-none focus:border-primary transition-colors"
                placeholder={itemType === 'food' ? 'Search food, e.g. dal, chips, roti…' : 'Search drink, e.g. chai, lassi, coffee…'}
              />
              {query.length > 0 && (
                <button className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  onClick={() => { setQuery(''); setSelected(null); setResults([]) }}>
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              )}
            </div>

            {/* Search loading indicator */}
            {searching && (
              <div className="flex items-center gap-2 px-2 py-3 text-slate-500 text-sm">
                <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                Searching…
              </div>
            )}

            {/* Results */}
            {results.length > 0 && (
              <div className="bg-slate-900 border border-slate-700 rounded-xl mb-4 overflow-hidden">
                {results.map(food => (
                  <div key={food.id} onClick={() => handleSelect(food)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800 cursor-pointer border-b border-slate-800 last:border-0 transition-colors">
                    <span className="text-xl w-8 text-center">{food.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white truncate">{food.name}</p>
                        {food.source === 'user' && (
                          <span className="text-[10px] font-bold bg-primary/20 text-primary px-1.5 py-0.5 rounded-full flex-shrink-0">saved</span>
                        )}
                        {food.source === 'usda' && (
                          <span className="text-[10px] font-bold bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full flex-shrink-0">USDA</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{food.serving}</p>
                    </div>
                    <span className="font-mono text-sm text-slate-400 flex-shrink-0">{food.calories} kcal</span>
                  </div>
                ))}
              </div>
            )}

            {/* No results → custom entry */}
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

        {/* ── Custom food form ── */}
        {customMode && (
          <div className="mb-5 space-y-4">
            <button onClick={exitCustomMode}
              className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
              <span className="material-symbols-outlined text-base">arrow_back</span>
              Back to search
            </button>

            {/* Name + Brand */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Food name *</label>
                <input value={custom.name} onChange={setField('name')}
                  placeholder="e.g. Lays Classic Chips"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-primary rounded-xl h-12 px-4 text-slate-100 text-sm placeholder:text-slate-600 focus:outline-none transition-colors" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Brand <span className="text-slate-600 normal-case font-normal">(optional)</span></label>
                <input value={custom.brand} onChange={setField('brand')}
                  placeholder="e.g. Frito-Lay"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-primary rounded-xl h-12 px-4 text-slate-100 text-sm placeholder:text-slate-600 focus:outline-none transition-colors" />
              </div>
            </div>

            {/* Serving size + unit */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Serving size *</label>
              <div className="flex gap-2">
                <input type="number" min="0.1" step="0.1" value={custom.servingSize} onChange={setField('servingSize')}
                  placeholder="100"
                  className="flex-1 bg-slate-900 border border-slate-800 focus:border-primary rounded-xl h-12 px-4 text-slate-100 text-sm placeholder:text-slate-600 focus:outline-none transition-colors" />
                <select value={custom.servingUnit} onChange={setField('servingUnit')}
                  className="w-28 bg-slate-900 border border-slate-800 focus:border-primary rounded-xl h-12 px-3 text-slate-100 text-sm focus:outline-none transition-colors">
                  {SERVING_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>

            {/* Macros */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Macros per serving</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { field: 'protein', label: 'Protein (g)', color: 'text-blue-400',   placeholder: '2'  },
                  { field: 'carbs',   label: 'Carbs (g)',   color: 'text-yellow-400', placeholder: '15' },
                  { field: 'fat',     label: 'Fat (g)',     color: 'text-red-400',    placeholder: '10' },
                  { field: 'fiber',   label: 'Fiber (g)',   color: 'text-green-400',  placeholder: '1'  },
                ].map(({ field, label, color, placeholder }) => (
                  <div key={field} className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                    <label className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${color}`}>{label}</label>
                    <input type="number" min="0" step="0.1" value={custom[field]} onChange={setField(field)}
                      placeholder={placeholder}
                      className="w-full bg-transparent text-white text-sm font-mono placeholder:text-slate-700 focus:outline-none" />
                  </div>
                ))}

                {/* Calories — auto or manual */}
                <div className="col-span-3 bg-slate-900 border border-primary/30 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-primary uppercase tracking-wider">Calories (kcal) *</label>
                    <button
                      onClick={() => setCustom(prev => ({ ...prev, autoCalc: !prev.autoCalc, calories: '' }))}
                      className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors">
                      {custom.autoCalc ? '✎ Enter manually' : '⟳ Auto-calculate'}
                    </button>
                  </div>
                  {custom.autoCalc ? (
                    <p className={`text-base font-mono font-bold ${autoCalories > 0 ? 'text-primary' : 'text-slate-700'}`}>
                      {autoCalories > 0 ? autoCalories : '—'} <span className="text-xs font-normal text-slate-600">from protein + carbs + fat</span>
                    </p>
                  ) : (
                    <input type="number" min="0" step="1" value={custom.calories} onChange={setField('calories')}
                      placeholder="150"
                      className="w-full bg-transparent text-primary text-base font-mono font-bold placeholder:text-slate-700 focus:outline-none" />
                  )}
                </div>
              </div>
            </div>

            {/* Live preview */}
            {customReady && (
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-3">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Preview · {qty} × {custom.servingSize} {custom.servingUnit}
                </p>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: 'Calories', val: customScaled(custom.autoCalc ? autoCalories : custom.calories), color: 'text-primary'    },
                    { label: 'Protein',  val: customScaled(custom.protein),  color: 'text-blue-400'   },
                    { label: 'Carbs',    val: customScaled(custom.carbs),    color: 'text-yellow-400' },
                    { label: 'Fat',      val: customScaled(custom.fat),      color: 'text-red-400'    },
                  ].map(m => (
                    <div key={m.label} className="bg-slate-800 rounded-xl py-2 px-1">
                      <p className={`font-mono font-bold text-base ${m.color}`}>{m.val}</p>
                      <p className="text-slate-500 text-[10px] font-semibold mt-0.5">{m.label}</p>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-600 mt-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">bookmark</span>
                  Will be saved to your food library
                </p>
              </div>
            )}

            {/* Qty stepper */}
            {customReady && (
              <div className="flex items-center gap-3 px-1">
                <p className="text-slate-400 text-sm font-semibold flex-1">Servings</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setQty(q => Math.max(0.5, parseFloat((q - 0.5).toFixed(1))))} className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center hover:bg-slate-700 transition-colors">−</button>
                  <span className="text-white font-mono font-bold w-8 text-center">{qty}</span>
                  <button onClick={() => setQty(q => parseFloat((q + 0.5).toFixed(1)))} className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center hover:bg-slate-700 transition-colors">+</button>
                </div>
              </div>
            )}

            {/* Estimation disclaimer */}
            <div className="flex items-start gap-2 px-1">
              <span className="material-symbols-outlined text-slate-600 text-sm mt-0.5 flex-shrink-0">info</span>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                These values are estimates and may not be 100% precise. Adjust to match your actual portion for better accuracy.
              </p>
            </div>
          </div>
        )}

        {/* ── Selected DB item card with editable macros ── */}
        {selected && !customMode && !isEditing && (
          <div className="bg-slate-900 border border-primary/30 rounded-xl p-4 mb-5">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{selected.emoji}</span>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-white font-bold">{selected.name}</p>
                  {selected.source === 'user' && <span className="text-[10px] font-bold bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">saved</span>}
                </div>
                <p className="text-slate-500 text-xs">{selected.serving} per serving</p>
              </div>
            </div>

            {/* Qty stepper */}
            <div className="flex items-center gap-3 mb-4">
              <p className="text-slate-400 text-sm font-semibold flex-1">Servings</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setQty(q => Math.max(0.5, parseFloat((q - 0.5).toFixed(1))))} className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center hover:bg-slate-700 transition-colors">−</button>
                <span className="text-white font-mono font-bold w-8 text-center">{qty}</span>
                <button onClick={() => setQty(q => parseFloat((q + 0.5).toFixed(1)))} className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center hover:bg-slate-700 transition-colors">+</button>
              </div>
            </div>

            {/* Editable macro cards */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <MacroCard field="calories" label="Calories" value={macros.calories} color="text-primary" unit="kcal" />
              <MacroCard field="protein"  label="Protein"  value={macros.protein}  color="text-blue-400" unit="g" />
              <MacroCard field="carbs"    label="Carbs"    value={macros.carbs}    color="text-yellow-400" unit="g" />
              <MacroCard field="fat"      label="Fat"      value={macros.fat}      color="text-red-400" unit="g" />
            </div>

            {/* Reset overrides */}
            {pinnedFields.size > 0 && (
              <button onClick={resetPins}
                className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1 px-1 mt-3">
                <span className="material-symbols-outlined text-xs">restart_alt</span>
                Reset to recommended values
              </button>
            )}

            {/* Estimation disclaimer */}
            <div className="flex items-start gap-2 px-1 mt-3">
              <span className="material-symbols-outlined text-slate-600 text-sm mt-0.5 flex-shrink-0">info</span>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                These values are estimates and may not be 100% precise. Adjust to match your actual portion for better accuracy.
              </p>
            </div>
          </div>
        )}

        {/* ── Meal selector ── */}
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

        {/* ── Popular — idle state only ── */}
        {!query && !selected && !customMode && !isEditing && (
          <>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">
              {itemType === 'food' ? 'Popular Foods' : 'Popular Drinks'}
            </p>
            <div className="space-y-1">
              {popular.map(food => (
                <div key={food.id} onClick={() => handleSelect(food)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 cursor-pointer transition-colors border border-transparent hover:border-slate-700">
                  <span className="text-xl w-10 text-center">{food.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white truncate">{food.name}</p>
                      {food.source === 'user' && <span className="text-[10px] font-bold bg-primary/20 text-primary px-1.5 py-0.5 rounded-full flex-shrink-0">saved</span>}
                    </div>
                    <p className="text-xs text-slate-500">{`P ${food.protein_g}g · C ${food.carbs_g}g · F ${food.fat_g}g`}</p>
                  </div>
                  <span className="font-mono text-sm text-slate-400 flex-shrink-0">{food.calories} kcal</span>
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
          disabled={saving || (isEditing ? !meal : (!customMode && (!selected || !meal)) || (customMode && (!customReady || !meal)))}
          className="w-full h-14 bg-primary hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-base shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 mt-5">
          {saving
            ? <><span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>Saving…</>
            : isEditing
              ? <><span className="material-symbols-outlined text-xl">check_circle</span>Save Changes</>
              : <><span className="material-symbols-outlined text-xl">add_circle</span>Log {customMode ? 'Custom Food' : itemType === 'food' ? 'Food' : 'Drink'}</>
          }
        </button>

      </div>
    </div>
  )
}
