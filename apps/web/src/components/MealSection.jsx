import { useState } from 'react'
import { Card, MaterialIcon } from '@healtho/ui'

// MealSection — collapsible meal row with item list and inline add.
//
// Visual spec: project/preview/comp-meal-section.html. The
// pre-Phase-3 implementation already matches the spec structurally;
// the only change here is swapping raw `<span class="material-symbols-outlined">`
// for the MaterialIcon primitive so iconography goes through a single
// (XSS-safe) source.
//
// Behavioral preservation: same props, same delete-confirm flow,
// same edit/delete callbacks.
export default function MealSection({
  emoji,
  name,
  calories = 0,
  items = [],
  defaultOpen = false,
  onAdd,
  onDelete,
  onEdit,
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [confirmId, setConfirmId] = useState(null)  // id of item pending delete confirm

  const handleDeleteClick = (id) => setConfirmId(id)
  const handleDeleteConfirm = (id) => {
    setConfirmId(null)
    onDelete?.(id)
  }

  return (
    <Card padding="none" radius="xl">
      <div
        className="flex items-center gap-3 px-4 py-4 cursor-pointer select-none"
        onClick={() => setOpen(o => !o)}
      >
        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-xl flex-shrink-0">
          {emoji}
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-white">{name}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {items.length > 0 ? (
              <>
                <span className="text-slate-300 font-semibold">{calories}</span> kcal
                {calories === 0 && items.length > 0 && (
                  <span className="text-slate-600"> (0 cal items)</span>
                )}
                {' · '}{items.length} item{items.length !== 1 ? 's' : ''}
              </>
            ) : (
              'Not logged yet'
            )}
          </p>
        </div>
        <button
          type="button"
          aria-label={`Add to ${name}`}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all text-lg font-light flex-shrink-0"
          onClick={(e) => { e.stopPropagation(); onAdd?.() }}
        >+</button>
        <MaterialIcon
          name="expand_more"
          size={20}
          className="text-slate-600 ml-1 transition-transform duration-200 flex-shrink-0"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </div>

      {open && (
        <div className="border-t border-slate-800 px-4 pb-4 pt-3 space-y-2">
          {items.length > 0 ? items.map(item => (
            <div key={item.id}>
              {confirmId === item.id ? (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
                  <MaterialIcon name="warning" size={14} className="text-red-400" />
                  <p className="text-xs text-red-400 font-semibold flex-1">
                    Delete &quot;{item.name}&quot;?
                  </p>
                  <button
                    type="button"
                    onClick={() => handleDeleteConfirm(item.id)}
                    className="text-xs font-bold text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-500/20 transition-colors"
                  >Yes, delete</button>
                  <button
                    type="button"
                    onClick={() => setConfirmId(null)}
                    className="text-xs font-bold text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
                  >Cancel</button>
                </div>
              ) : (
                <div className="flex items-center gap-3 group">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-700 flex-shrink-0" />
                  <p className="text-sm text-slate-300 flex-1">{item.name}</p>
                  <p className="text-xs text-slate-600">{item.portion}</p>
                  <span className="font-mono text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
                    {item.calories} kcal
                  </span>

                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => onEdit(item)}
                      aria-label={`Edit ${item.name}`}
                      className="opacity-30 group-hover:opacity-100 text-slate-400 hover:text-primary transition-all"
                      title="Edit serving"
                    >
                      <MaterialIcon name="edit" size={16} />
                    </button>
                  )}

                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(item.id)}
                      aria-label={`Delete ${item.name}`}
                      className="opacity-30 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"
                      title="Delete entry"
                    >
                      <MaterialIcon name="delete" size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>
          )) : (
            <p className="text-sm text-slate-600 text-center py-1">No items logged yet</p>
          )}
        </div>
      )}
    </Card>
  )
}
