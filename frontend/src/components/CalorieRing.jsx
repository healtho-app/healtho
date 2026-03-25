// CalorieRing — animated SVG donut showing calorie progress
// Props: consumed, goal, burned
export default function CalorieRing({ consumed = 0, goal = 0, burned = 0 }) {
  const remaining  = Math.max(goal - consumed + burned, 0)
  const pct        = Math.min(consumed / goal, 1)
  const circumference = 339.3
  const offset     = circumference - pct * circumference

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
      {/* Glow blob */}
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary/5 blur-2xl pointer-events-none" />

      <div className="flex items-center gap-6">
        {/* Ring */}
        <div className="relative flex-shrink-0">
          <svg width="130" height="130" viewBox="0 0 130 130" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="65" cy="65" r="54" fill="none" stroke="#1a1640" strokeWidth="11" />
            <circle
              cx="65" cy="65" r="54"
              fill="none"
              stroke="url(#ringGradient)"
              strokeWidth="11"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="ring-animate"
              style={{ filter: 'drop-shadow(0 0 8px rgba(139,92,246,0.5))' }}
            />
            <defs>
              <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor="#e879f9" />
                <stop offset="50%"  stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="font-mono text-3xl font-bold text-white leading-none">{remaining.toLocaleString()}</span>
            <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider mt-1">remaining</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 space-y-3">
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Consumed</p>
            <p className="font-mono text-2xl font-bold text-white">{consumed.toLocaleString()} <span className="text-sm text-slate-500 font-normal">kcal</span></p>
          </div>
          <div className="h-px bg-slate-800" />
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Daily Goal</p>
            <p className="font-mono text-2xl font-bold text-white">{goal.toLocaleString()} <span className="text-sm text-slate-500 font-normal">kcal</span></p>
          </div>
          <div className="h-px bg-slate-800" />
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Exercise Burned</p>
            <p className="font-mono text-2xl font-bold text-white">{burned.toLocaleString()} <span className="text-sm text-slate-500 font-normal">kcal</span></p>
          </div>
        </div>
      </div>
    </div>
  )
}
