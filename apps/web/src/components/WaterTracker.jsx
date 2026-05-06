import { useState, useEffect } from 'react'
import { Card, Badge, MaterialIcon } from '@healtho/ui'

const TOTAL_GLASSES = 8
const ML_PER_GLASS  = 2500 / 8   // 312.5 ml per glass
const STORAGE_KEY   = 'healtho_water_manual'

// Local date string (YYYY-MM-DD) in user's timezone — same helper as Dashboard
const localDateStr = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// WaterTracker — daily hydration display, 8 glasses (2.5 L total).
//
// Visual spec: project/preview/comp-water-tracker.html (SVG glass
// silhouettes with gradient water fill, hover lift, goal-met state
// with cyan glow border). The pre-Phase-3 implementation used 8 dots;
// this reskin replaces them with proper glasses.
//
// Behavioral preservation: same prop signature (waterLevel, goalMet,
// onLevelChange, isToday). Same logic for: localStorage manual override,
// past-date read-only mode, reset button availability, parent
// onLevelChange notification.
export default function WaterTracker({
  waterLevel = 0,
  goalMet = false,
  onLevelChange,
  isToday = true,
}) {
  // waterLevel  — float 0–8 driven by food_logs (logged drinks) — persists via DB
  // manualDots  — integer 0–8 set by tapping — persists via localStorage (date-keyed)
  //               Only used for today. Past dates show logged water only.
  const [manualDots, setManualDots] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
      return saved.date === localDateStr() ? (saved.dots ?? 0) : 0
    } catch { return 0 }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: localDateStr(), dots: manualDots }))
    } catch { /* localStorage unavailable — silently ignore */ }
  }, [manualDots])

  const totalLevel = isToday
    ? Math.min(TOTAL_GLASSES, Math.max(waterLevel, manualDots))
    : Math.min(TOTAL_GLASSES, waterLevel)
  const liters = ((totalLevel * ML_PER_GLASS) / 1000).toFixed(1)
  const wholeGlasses = Math.floor(totalLevel)
  const halfFraction = totalLevel - wholeGlasses
  const countLabel = halfFraction >= 0.25 && halfFraction < 0.75
    ? `${wholeGlasses}½`
    : `${Math.round(totalLevel)}`

  useEffect(() => {
    onLevelChange?.(totalLevel)
  }, [totalLevel, onLevelChange])

  const handleGlass = (idx) => {
    if (!isToday) return
    const desired = idx < totalLevel ? idx : idx + 1  // toggle: unfill to idx, or fill to idx+1
    if (desired <= waterLevel) {
      setManualDots(0)
    } else {
      setManualDots(desired)
    }
  }

  const canReset = isToday && manualDots > 0 && manualDots > Math.ceil(waterLevel)

  return (
    <Card
      padding="md"
      className={`transition-all duration-500 ${
        goalMet
          ? 'border-water/[0.55] shadow-[0_0_35px_rgba(96,184,212,0.22),inset_0_0_30px_rgba(96,184,212,0.06)]'
          : ''
      }`}
      style={
        goalMet
          ? { background: 'linear-gradient(135deg, rgba(96,184,212,0.08), #0e0b1e)' }
          : undefined
      }
    >
      {/* Decorative glow blob */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-[60px] -right-[40px] w-[220px] h-[220px] rounded-full"
        style={{
          background: `radial-gradient(circle, rgba(96,184,212,${goalMet ? 0.25 : 0.14}), transparent 70%)`,
          filter: 'blur(30px)',
        }}
      />

      {/* Hidden defs — gradient + clipPath shared across all glass SVGs */}
      <svg width="0" height="0" className="absolute pointer-events-none" aria-hidden="true">
        <defs>
          <linearGradient id="wt-water" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="#60b8d4" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
          <clipPath id="wt-clip">
            <path d="M14 10 Q14 8 16 8 L54 8 Q56 8 56 10 L52 66 Q52 68 50 68 L20 68 Q18 68 18 66 Z" />
          </clipPath>
        </defs>
      </svg>

      {/* Title row */}
      <div className="relative z-10 flex items-center justify-between mb-5 gap-3">
        <div className="flex items-center gap-2.5">
          <MaterialIcon name="water_drop" size={20} className="text-water" />
          <p className="text-[15px] font-bold text-white tracking-tight font-display">Water</p>
          {goalMet && <Badge variant="ok" icon="check_circle">Goal met</Badge>}
        </div>
        <div className="font-mono text-lg font-bold text-white tracking-tight whitespace-nowrap">
          {countLabel}
          <span className="text-slate-400 font-medium font-display">
            {' '}/ {TOTAL_GLASSES} glasses
          </span>
        </div>
      </div>

      {/* Glasses */}
      <div className="relative z-10 grid grid-cols-8 gap-[14px] justify-items-center">
        {Array.from({ length: TOTAL_GLASSES }).map((_, i) => {
          const fillFrac = Math.min(1, Math.max(0, totalLevel - i))
          return (
            <Glass
              key={i}
              fill={fillFrac}
              onClick={() => handleGlass(i)}
              disabled={!isToday}
            />
          )
        })}
      </div>

      {/* Subtitle / reset */}
      <p className="relative z-10 mt-3 text-xs text-slate-500 font-display">
        {isToday ? `${liters} / 2.5 L — tap a glass to update` :
          totalLevel > 0 ? `${liters} / 2.5 L logged` : 'No water logged this day'}
        {canReset && (
          <button
            type="button"
            onClick={() => setManualDots(Math.ceil(waterLevel))}
            className="ml-2 text-water/70 hover:text-water underline transition-colors"
          >
            Reset
          </button>
        )}
      </p>
    </Card>
  )
}

// Glass — tapered tumbler with proportional water fill.
// fill is 0..1; 0 renders an empty grey outline.
function Glass({ fill, onClick, disabled }) {
  const fillPct = Math.round(Math.min(1, Math.max(0, fill)) * 100)
  const isEmpty = fillPct === 0
  // Water rect occupies y=6..66 inside the viewBox at 100% fill (60 units of vertical range)
  const fillTop    = 6 + (1 - fillPct / 100) * 60
  const fillHeight = (fillPct / 100) * 60

  const stroke = isEmpty ? '#334155' : '#60b8d4'
  const topFill = isEmpty ? 'rgba(15,23,42,0.6)' : 'rgba(15,23,42,0.4)'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`Glass ${fillPct === 0 ? 'empty' : fillPct === 100 ? 'full' : `${fillPct}% full`}, tap to ${fillPct === 0 ? 'fill' : 'empty'}`}
      className={`relative w-[54px] h-[70px] flex-shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        disabled
          ? 'cursor-default opacity-60'
          : 'hover:-translate-y-0.5 cursor-pointer focus-visible:outline-none focus-visible:shadow-[var(--tap-ring)] rounded-md'
      }`}
    >
      <svg viewBox="0 0 70 72" className="w-full h-full" fill="none" aria-hidden="true">
        {/* Top ellipse (opening) — back fill */}
        <ellipse cx="35" cy="9" rx="21" ry="4" stroke={stroke} strokeWidth="2" fill={topFill} />

        {/* Water — clipped to glass body shape */}
        {!isEmpty && (
          <g clipPath="url(#wt-clip)">
            <rect x="14" y={fillTop} width="42" height={fillHeight} fill="url(#wt-water)" />
            {fillPct < 100 && fillPct > 0 && (
              <ellipse cx="35" cy={fillTop} rx="19" ry="2.5" fill="rgba(255,255,255,0.35)" />
            )}
          </g>
        )}

        {/* Glass body outline */}
        <path
          d="M14 10 Q14 8 16 8 L54 8 Q56 8 56 10 L52 66 Q52 68 50 68 L20 68 Q18 68 18 66 Z"
          stroke={stroke} strokeWidth="2" fill="none"
        />
        {/* Top ellipse outline */}
        <ellipse cx="35" cy="9" rx="21" ry="4" stroke={stroke} strokeWidth="2" fill="none" />
        {/* Top reflection — only when full */}
        {fillPct === 100 && (
          <ellipse cx="35" cy="9" rx="18" ry="3" fill="rgba(255,255,255,0.3)" />
        )}
      </svg>
    </button>
  )
}
