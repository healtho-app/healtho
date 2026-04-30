import { Card } from '@healtho/ui'

// MacroCard — single macro chip with label, amount, optional goal, and progress bar.
//
// Props:
//   label         — "Protein" | "Carbs" | "Fat" | "Fiber"
//   amount        — grams consumed today (rounded integer)
//   unit          — default 'g'
//   goal          — target grams for the day (nullable). When null, the goal
//                   text "/ 135g" is hidden and the bar stays empty.
//   pct           — progress toward goal, 0–100+. Capped at 100% for the bar width.
//   color         — tailwind bg class for the dot + default bar fill
//   overWarning   — when true AND amount > goal, switch bar + text color to red.
//                   Only used for carbs & fat (overeating protein/fiber is OK).
//
// Wraps the @healtho/ui Card primitive at radius="xl" (12 px) per the
// chip-card spec in project/preview/comp-macrocards.html. The previous
// raw <div> implementation has been retired in favor of consuming the
// primitive consistently.
export default function MacroCard({
  label,
  amount,
  unit = 'g',
  goal = null,
  pct = 0,
  color = 'bg-primary',
  overWarning = false,
}) {
  const showGoal = goal != null && goal > 0
  const isOver   = showGoal && overWarning && amount > goal

  const barColor  = isOver ? 'bg-red-500' : color
  const textColor = isOver ? 'text-red-300' : 'text-white'
  const goalColor = isOver ? 'text-red-400' : 'text-slate-500'

  return (
    <Card padding="sm" radius="xl">
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
        </div>
        <p className={`font-mono text-sm font-bold ${textColor}`}>
          {amount}{showGoal ? '' : unit}
          {showGoal && <span className={`font-normal ${goalColor}`}> / {goal}{unit}</span>}
        </p>
        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            className={`h-full rounded-full ${barColor} transition-all duration-700`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>
    </Card>
  )
}
