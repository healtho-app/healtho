import { useEffect, useRef, useState } from 'react'
import { Card } from '@healtho/ui'

// CalorieRing — animated SVG donut showing calorie progress.
//
// Visual spec: project/preview/comp-calorie-ring.html (160×160 ring,
// remaining-first visualization where the gradient arc represents
// REMAINING calories, with an inner hairline arc showing consumed for
// context). Tick marks at 12 / 3 / 6 / 9 o'clock. Decorative glow blobs
// in opposite corners.
//
// Behavioral preservation: same prop signature (consumed, goal, burned)
// and same `remaining = goal - consumed + burned` math, including the
// "burned exercise calories add back to remaining" rule from the
// pre-Phase-3 implementation.
//
// Reward state: when consumed transitions from < goal to >= goal, the
// center number runs the rewardPop keyframe (defined in @healtho/ui
// tokens.css) once. The arc shifts to brand-green and the "Remaining"
// label flips to "Goal met". prefers-reduced-motion zeroes the duration
// via the --dur-reward token.
export default function CalorieRing({ consumed = 0, goal = 0, burned = 0 }) {
  const remaining     = Math.max(goal - consumed + burned, 0)
  const remainingFrac = goal > 0 ? Math.min(remaining / goal, 1) : 0
  const consumedFrac  = goal > 0 ? Math.min(consumed / goal, 1) : 0
  const burnedFrac    = goal > 0 ? Math.min(burned   / goal, 1) : 0

  const isMet = goal > 0 && consumed >= goal
  const isLow = goal > 0 && remainingFrac < 0.15 && !isMet

  // Outer arc — remaining as a fraction of the goal, sweeping from 12 o'clock
  const C_OUTER   = 2 * Math.PI * 60                  // ≈ 376.99
  const outerDash = C_OUTER * remainingFrac
  const outerGap  = C_OUTER - outerDash

  // Inner arc — consumed for context (hairline)
  const C_INNER   = 2 * Math.PI * 46                  // ≈ 289.03
  const innerDash = C_INNER * consumedFrac
  const innerGap  = C_INNER - innerDash

  // Reward animation — fires once per goal-met transition
  const [showReward, setShowReward] = useState(false)
  const wasMetRef = useRef(false)
  useEffect(() => {
    if (isMet && !wasMetRef.current) {
      setShowReward(true)
      wasMetRef.current = true
      const t = setTimeout(() => setShowReward(false), 1000)
      return () => clearTimeout(t)
    }
    if (!isMet) wasMetRef.current = false
  }, [isMet])

  // Color tokens for the three states
  const arcStroke   = isMet ? '#4caf7d' : `url(#cr-${isLow ? 'amber' : 'brand'})`
  const trackStroke = isMet ? 'rgba(76,175,125,0.18)' : '#1a1640'
  const arcShadow   = isMet
    ? 'drop-shadow(0 0 8px rgba(76,175,125,0.55))'
    : isLow
      ? 'drop-shadow(0 0 6px rgba(232,180,75,0.5))'
      : 'drop-shadow(0 0 10px rgba(139,92,246,0.55))'

  return (
    <Card padding="lg">
      {/* Decorative glow blobs — pink top-right, cyan bottom-left */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-[60px] -right-[40px] w-[220px] h-[220px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(232,121,249,0.14), transparent 70%)',
          filter: 'blur(30px)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-[60px] -left-[40px] w-[180px] h-[180px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(34,211,238,0.10), transparent 70%)',
          filter: 'blur(30px)',
        }}
      />

      <div className="relative flex items-center gap-6">
        {/* RING */}
        <div className="relative w-40 h-40 flex-shrink-0">
          {/* Tick marks at 12 / 3 / 6 / 9 */}
          <svg className="absolute inset-0" width="160" height="160" viewBox="0 0 160 160">
            <g transform="translate(80 80)" stroke="#2a2447" strokeWidth="1.5" strokeLinecap="round">
              <line x1="0"   y1="-72" x2="0"   y2="-66" />
              <line x1="72"  y1="0"   x2="66"  y2="0"   />
              <line x1="0"   y1="72"  x2="0"   y2="66"  />
              <line x1="-72" y1="0"   x2="-66" y2="0"   />
            </g>
          </svg>

          {/* Track ring */}
          <svg
            className="absolute inset-0"
            width="160" height="160" viewBox="0 0 160 160"
            style={{ transform: 'rotate(-90deg)' }}
          >
            <circle cx="80" cy="80" r="60" fill="none" stroke={trackStroke} strokeWidth="10" />
          </svg>

          {/* Remaining arc — gradient stroke, sweeps from 12 o'clock */}
          <svg
            className="absolute inset-0"
            width="160" height="160" viewBox="0 0 160 160"
            style={{ transform: 'rotate(-90deg)' }}
          >
            <defs>
              <linearGradient id="cr-brand" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor="#e879f9" />
                <stop offset="50%"  stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
              <linearGradient id="cr-amber" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#e8b84b" />
              </linearGradient>
            </defs>
            {goal > 0 && (
              <circle
                cx="80" cy="80" r="60"
                fill="none" stroke={arcStroke} strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${outerDash} ${outerGap}`}
                strokeDashoffset="0"
                className="transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{ filter: arcShadow }}
              />
            )}
          </svg>

          {/* Consumed inner arc — hairline context */}
          <svg
            className="absolute inset-0"
            width="160" height="160" viewBox="0 0 160 160"
            style={{ transform: 'rotate(-90deg)' }}
          >
            <circle cx="80" cy="80" r="46" fill="none" stroke="#1e293b" strokeWidth="3" />
            {goal > 0 && consumed > 0 && (
              <circle
                cx="80" cy="80" r="46"
                fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="3" strokeLinecap="round"
                strokeDasharray={`${innerDash} ${innerGap}`}
                strokeDashoffset="0"
                className="transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
              />
            )}
          </svg>

          {/* Center — remaining number, kcal unit, label */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={
              showReward
                ? { animation: 'rewardPop var(--dur-reward) var(--ease-spring) both' }
                : undefined
            }
          >
            <span
              className={`font-mono text-[34px] font-bold leading-none tracking-tight ${
                isMet ? 'text-fiber' : 'text-white'
              }`}
            >
              {remaining.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 font-display">kcal</span>
            <span
              className={`text-[9px] font-bold uppercase tracking-[0.14em] mt-1 font-display ${
                isMet ? 'text-fiber' : 'text-slate-500'
              }`}
            >
              {isMet ? 'Goal met' : 'Remaining'}
            </span>
          </div>
        </div>

        {/* STATS */}
        <div className="flex-1 flex flex-col gap-0.5">
          <StatRow
            label="Consumed"
            value={consumed.toLocaleString()}
            unit="kcal"
            dotStyle={{ background: 'rgba(255,255,255,0.35)' }}
            barFrac={consumedFrac}
            barStyle={{ background: 'rgba(255,255,255,0.6)' }}
          />
          <Sep />
          <StatRow
            label="Daily goal"
            value={goal.toLocaleString()}
            unit="kcal"
            dotStyle={{ background: 'linear-gradient(135deg,#e879f9,#8b5cf6,#22d3ee)' }}
            barFrac={1}
            barStyle={{ background: 'linear-gradient(90deg,#e879f9,#8b5cf6,#22d3ee)' }}
            labelExtra={<DailyGoalInfo />}
          />
          <Sep />
          <StatRow
            label="Burned"
            value={burned.toLocaleString()}
            unit="kcal"
            dotStyle={{ background: '#334155' }}
            barFrac={burnedFrac}
            barStyle={{ background: '#475569' }}
          />
        </div>
      </div>
    </Card>
  )
}

function Sep() {
  return <div className="h-px bg-slate-800" />
}

function StatRow({ label, labelExtra, value, unit, dotStyle, barFrac, barStyle }) {
  return (
    <div className="flex items-center gap-[10px] py-[10px]">
      <div className="w-2 h-2 rounded-sm flex-shrink-0" style={dotStyle} />
      <div className="flex-1 flex items-center gap-3 min-w-0">
        <div className="flex flex-col min-w-[110px]">
          <div className="flex items-center gap-1.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 font-display">
              {label}
            </p>
            {labelExtra}
          </div>
          <p className="font-mono text-lg font-bold text-white leading-tight mt-0.5">
            {value}{' '}
            <span className="font-display text-[11px] font-normal text-slate-500">{unit}</span>
          </p>
        </div>
        <div className="flex-1 h-1 rounded-full bg-slate-800 overflow-hidden ml-2">
          <div
            className="h-full rounded-full transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ width: `${Math.min(barFrac * 100, 100)}%`, ...barStyle }}
          />
        </div>
      </div>
    </div>
  )
}

// Tooltip preserved from the pre-Phase-3 CalorieRing — surfaces the
// "BMR × activity ± fitness goal" calculation explanation. Spec doesn't
// call for it; we keep it because it's an accessibility-positive
// affordance and the user explicitly said "every prop, every callback,
// every data-flow contract stays the same."
function DailyGoalInfo() {
  return (
    <div className="relative group/info">
      <button
        type="button"
        aria-label="Calculation details"
        aria-describedby="cr-goal-tooltip"
        className="w-3.5 h-3.5 rounded-full border border-slate-600 flex items-center justify-center text-slate-500 hover:text-primary hover:border-primary focus:text-primary focus:border-primary transition-colors outline-none"
      >
        <span className="text-[8px] font-bold leading-none">?</span>
      </button>
      <div
        id="cr-goal-tooltip"
        role="tooltip"
        className="absolute bottom-full left-0 mb-2 z-50 pointer-events-none opacity-0 group-hover/info:opacity-100 group-focus-within/info:opacity-100 transition-opacity duration-200"
      >
        <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 shadow-xl w-fit">
          <p className="text-xs text-slate-300 font-medium whitespace-nowrap font-display">
            How we calculate your Daily Goal
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5 whitespace-nowrap font-display">
            BMR × activity level ± fitness goal
          </p>
        </div>
      </div>
    </div>
  )
}
