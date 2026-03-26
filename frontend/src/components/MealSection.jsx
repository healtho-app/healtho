import { useState } from 'react'

export default function MealSection({ emoji, name, calories = 0, items = [], defaultOpen = false, onAdd, onDelete }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-4 cursor-pointer select-none" onClick={() => setOpen(o => !o)}>
        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-xl flex-shrink-0">{emoji}</div>
        <div className="flex-1">
          <p className="text-sm font-bold text-white">{name}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {items.length > 0
              ? <>
                  <span className="text-slate-300 font-semibold">{calories}</span> kcal
                  {calories === 0 && items.length > 0 && (
                    <span className="text-slate-600"> (0 cal items)</span>
                  )}
                  {' · '}{items.length} item{items.length !== 1 ? 's' : ''}
                </>
              : 'Not logged yet'
            }
          </p>
        </div>
        <button
          className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all text-lg font-light flex-shrink-0"
          onClick={(e) => { e.stopPropagation(); onAdd?.() }}
        >+</button>
        <span
          className="material-symbols-outlined text-slate-600 text-lg ml-1 transition-transform duration-200 flex-shrink-0"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >expand_more</span>
      </div>

      {open && (
        <div className="border-t border-slate-800 px-4 pb-4 pt-3 space-y-2">
          {items.length > 0 ? items.map(item => (
            <div key={item.id} className="flex items-center gap-3 group">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-700 flex-shrink-0" />
              <p className="text-sm text-slate-300 flex-1">{item.name}</p>
              <p className="text-xs text-slate-600">{item.portion}</p>
              <span className="font-mono text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">{item.calories} kcal</span>
              {onDelete && (
                <button
                  onClick={() => onDelete(item.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all ml-1"
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                </button>
              )}
            </div>
          )) : (
            <p className="text-sm text-slate-600 text-center py-1">No items logged yet</p>
          )}
        </div>
      )}
    </div>
  )
}
