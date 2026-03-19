// MacroCard — single macro chip with label, amount and progress bar
// Props: label, amount, unit, pct, color (tailwind bg class)
export default function MacroCard({ label, amount, unit = 'g', pct = 0, color = 'bg-primary' }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
      </div>
      <p className="font-mono text-sm font-bold text-white">{amount}{unit}</p>
      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-700`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  )
}
