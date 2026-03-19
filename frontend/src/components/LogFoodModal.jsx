import { useEffect, useRef } from 'react'

const POPULAR_FOODS = [
  { emoji: '🍚', name: 'Dal Rice',        meta: 'Protein 12g · Carbs 68g · Fat 5g',  calories: 450 },
  { emoji: '🥣', name: 'Masala Oats',     meta: 'Protein 7g · Carbs 35g · Fat 4g',   calories: 210 },
  { emoji: '🫓', name: 'Roti (Wheat)',     meta: 'Protein 3g · Carbs 18g · Fat 1g',   calories: 95  },
  { emoji: '🥛', name: 'Paneer (100g)',    meta: 'Protein 18g · Carbs 1g · Fat 20g',  calories: 265 },
  { emoji: '🍌', name: 'Banana (medium)', meta: 'Protein 1g · Carbs 27g · Fat 0g',   calories: 122 },
]

const RECENT = ['Masala Oats', 'Dal Rice', 'Boiled Egg', 'Banana']

export default function LogFoodModal({ open, onClose }) {
  const searchRef = useRef(null)

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 350)
  }, [open])

  // Close on overlay click
  const handleOverlay = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className={`fixed inset-0 bg-black/60 z-50 flex items-end justify-center transition-opacity duration-200 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      onClick={handleOverlay}
    >
      <div
        className={`w-full max-w-[520px] bg-[#1a1a1a] border border-slate-800 rounded-t-2xl p-5 pb-10 max-h-[85vh] overflow-y-auto scrollbar-hide transition-transform duration-300 ${open ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-slate-700 mx-auto mb-5" />

        <h2 className="text-white text-2xl font-extrabold mb-1">Log Food</h2>
        <p className="text-slate-500 text-sm mb-5">Search or pick from recent & popular items.</p>

        {/* Search */}
        <div className="relative mb-5">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xl">search</span>
          <input
            ref={searchRef}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-11 pr-4 h-14 text-slate-100 text-base placeholder:text-slate-600 focus:outline-none focus:border-primary transition-colors"
            placeholder="Search food, e.g. dal, banana, roti…"
          />
        </div>

        {/* Recent */}
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Recent</p>
        <div className="flex flex-wrap gap-2 mb-5">
          {RECENT.map(r => (
            <span key={r} className="bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold px-3 py-1.5 rounded-full cursor-pointer hover:border-primary hover:text-primary transition-colors">
              {r}
            </span>
          ))}
        </div>

        {/* Popular */}
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Popular in India 🇮🇳</p>
        <div className="space-y-1">
          {POPULAR_FOODS.map(food => (
            <div
              key={food.name}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 cursor-pointer transition-colors border border-transparent hover:border-slate-700"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-xl flex-shrink-0">
                {food.emoji}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">{food.name}</p>
                <p className="text-xs text-slate-500">{food.meta}</p>
              </div>
              <span className="font-mono text-sm text-slate-400">{food.calories} kcal</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
