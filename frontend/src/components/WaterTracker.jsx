import { useState } from 'react'

const TOTAL_DOTS  = 8
const LITERS_EACH = 0.3125  // 2.5L / 8 dots

export default function WaterTracker({ initialFilled = 5 }) {
  const [filled, setFilled] = useState(initialFilled)

  const handleDot = (idx) => {
    // Tap a filled dot → unfill from there; tap empty → fill up to there
    setFilled(idx < filled ? idx : idx + 1)
  }

  const liters = (filled * LITERS_EACH).toFixed(1)

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
        {Array.from({ length: TOTAL_DOTS }).map((_, i) => (
          <button
            key={i}
            onClick={() => handleDot(i)}
            className={`w-5 h-5 rounded-full border-2 transition-all hover:scale-110 ${
              i < filled
                ? 'bg-water border-water'
                : 'bg-slate-800 border-slate-700'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
