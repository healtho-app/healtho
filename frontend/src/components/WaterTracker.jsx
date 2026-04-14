import { useState, useEffect } from 'react'

const TOTAL_DOTS   = 8
const ML_PER_DOT   = 2500 / 8   // 312.5 ml per dot
const STORAGE_KEY  = 'healtho_water_manual'

// Local date string (YYYY-MM-DD) in user's timezone — same helper as Dashboard
const localDateStr = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export default function WaterTracker({ waterLevel = 0, goalMet = false, onLevelChange, isToday = true }) {
  // waterLevel  — float 0–8 driven by food_logs (logged drinks) — persists via DB
  // manualDots  — integer 0–8 set by tapping — persists via localStorage (date-keyed)
  //               Only used for today. Past dates show logged water only.
  const [manualDots, setManualDots] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
      return saved.date === localDateStr() ? (saved.dots ?? 0) : 0
    } catch { return 0 }
  })

  // Persist manual dots to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: localDateStr(), dots: manualDots }))
    } catch { /* localStorage unavailable — silently ignore */ }
  }, [manualDots])

  // Past dates: only show logged water level, ignore manual dots
  const totalLevel = isToday
    ? Math.min(TOTAL_DOTS, Math.max(waterLevel, manualDots))
    : Math.min(TOTAL_DOTS, waterLevel)
  const liters = ((totalLevel * ML_PER_DOT) / 1000).toFixed(1)

  // Notify parent of level changes (for celebration triggers)
  useEffect(() => {
    onLevelChange?.(totalLevel)
  }, [totalLevel, onLevelChange])

  const handleDot = (idx) => {
    if (!isToday) return // read-only on past dates
    const desired = idx < totalLevel ? idx : idx + 1  // toggle: unfill to idx, or fill to idx+1
    if (desired <= waterLevel) {
      // Can't go below logged level — reset manual so waterLevel takes over naturally
      setManualDots(0)
    } else {
      // Desired level is above logged water — store as manual override
      setManualDots(desired)
    }
  }

  // Can manual dots be reduced? (only when manualDots > waterLevel floor, today only)
  const canReset = isToday && manualDots > 0 && manualDots > Math.ceil(waterLevel)

  // Subtitle text
  const subtitle = isToday
    ? `${liters} / 2.5 L — tap to update`
    : totalLevel > 0
      ? `${liters} / 2.5 L logged`
      : 'No water logged this day'

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4 transition-all duration-500${goalMet ? ' water-goal-glow' : ''}`}>
      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
        <span className="material-symbols-outlined text-water text-xl">water_drop</span>
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold text-white">Water Intake</p>
        <p className="text-xs text-slate-500 mt-0.5">
          {subtitle}
          {canReset && (
            <button
              onClick={() => setManualDots(Math.ceil(waterLevel))}
              className="ml-2 text-water/70 hover:text-water underline transition-colors"
            >
              Reset
            </button>
          )}
        </p>
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: TOTAL_DOTS }).map((_, i) => {
          const fillFrac = Math.min(1, Math.max(0, totalLevel - i))
          const fillPct  = Math.round(fillFrac * 100)
          const isEmpty  = fillPct === 0

          return (
            <button
              key={i}
              onClick={() => handleDot(i)}
              disabled={!isToday}
              className={`relative w-5 h-5 rounded-full border-2 overflow-hidden transition-all${isToday ? ' hover:scale-110 cursor-pointer' : ' cursor-default opacity-60'}`}
              style={{ borderColor: isEmpty ? '#334155' : '#60b8d4', backgroundColor: '#1e293b' }}
            >
              {fillPct > 0 && (
                <div
                  className="absolute bottom-0 left-0 right-0 transition-all duration-300"
                  style={{ height: `${fillPct}%`, backgroundColor: '#60b8d4' }}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
