import { useState, useEffect } from 'react'

const TOTAL_DOTS = 8
const ML_PER_DOT = 2500 / 8   // 312.5 ml per dot

export default function WaterTracker({ waterLevel = 0 }) {
  // waterLevel is a float 0–8 from logged water (e.g. 0.8 for one 250ml glass)
  // manualDots lets the user tap to set whole-dot additions above the logged amount
  const [manualDots, setManualDots] = useState(0)

  // When logged water changes, drop any manual additions that are now below it
  useEffect(() => {
    setManualDots(prev => (prev < Math.ceil(waterLevel) ? 0 : prev))
  }, [waterLevel])

  const totalLevel = Math.min(TOTAL_DOTS, Math.max(waterLevel, manualDots))
  const liters = ((totalLevel * ML_PER_DOT) / 1000).toFixed(1)

  const handleDot = (idx) => {
    if (idx < totalLevel) {
      // Tapping inside the filled region → unfill to this dot, but never below logged amount
      setManualDots(Math.max(idx, Math.ceil(waterLevel)))
    } else {
      // Tapping an empty dot → fill up to and including it
      setManualDots(idx + 1)
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
        <span className="material-symbols-outlined text-water text-xl">water_drop</span>
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold text-white">Water Intake</p>
        <p className="text-xs text-slate-500 mt-0.5">{liters} / 2.5 L — tap to update</p>
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: TOTAL_DOTS }).map((_, i) => {
          // How much of this dot is filled: 0 = empty, 1 = full, 0.5 = half, etc.
          const fillFrac = Math.min(1, Math.max(0, totalLevel - i))
          const fillPct  = Math.round(fillFrac * 100)
          const isEmpty  = fillPct === 0

          return (
            <button
              key={i}
              onClick={() => handleDot(i)}
              className="relative w-5 h-5 rounded-full border-2 overflow-hidden transition-all hover:scale-110"
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
