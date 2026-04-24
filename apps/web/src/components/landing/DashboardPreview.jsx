export default function DashboardPreview() {
  const macros = [
    { label: 'Protein', value: '32g', color: 'bg-protein/15 text-protein' },
    { label: 'Carbs',   value: '48g', color: 'bg-carbs/15 text-carbs' },
    { label: 'Fat',     value: '21g', color: 'bg-fat/15 text-fat' },
  ]

  return (
    <div className="relative landing-float">
      {/* Glow behind the card */}
      <div className="absolute -inset-4 bg-brand-gradient opacity-[0.07] blur-3xl rounded-3xl pointer-events-none" />

      <div className="relative bg-surface border border-white/[0.08] rounded-2xl p-6 w-[340px] shadow-2xl shadow-black/40">
        {/* Daily Progress header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-white">Daily Progress</span>
          <span className="text-2xl font-bold text-white">1,847</span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden mb-5">
          <div
            className="h-full bg-brand-gradient rounded-full transition-all duration-1000 ease-out"
            style={{ width: '72%' }}
          />
        </div>

        {/* Macro cards */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {macros.map(({ label, value, color }) => (
            <div key={label} className={`${color} rounded-xl px-3 py-3 text-center`}>
              <div className="text-lg font-bold">{value}</div>
              <div className="text-xs opacity-70 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Streak card */}
        <div className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3">
          <div className="w-10 h-10 rounded-full bg-brand-gradient flex items-center justify-center text-lg">
            <span className="material-symbols-outlined text-white text-xl">local_fire_department</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">7 Day Streak</div>
            <div className="text-xs text-white">Keep it going!</div>
          </div>
        </div>
      </div>
    </div>
  )
}
