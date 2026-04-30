import { useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'
import { MaterialIcon } from '@healtho/ui'

// CelebrationOverlay — full-screen goal-met celebration moment.
//
// Visual spec: project/ui_kits/app/ProfileCelebration.jsx (CelebrationScreen)
// + project/preview/comp-celebration.html. Dual-ring glow on the badge,
// decorative confetti around the card, custom 20px card radius, soft
// shadow with violet/cyan glow per variant.
//
// Reward animations wired from @healtho/ui tokens.css (Phase 1):
//   - rewardPop      — runs on the badge for the entry pop
//   - rewardBurst    — runs on a decorative radial gradient behind the
//                      badge for the "explosion" feel
//   - rewardShimmer  — sweeps a highlight across the title text
//
// All three durations use var(--dur-reward) so prefers-reduced-motion
// (which sets --dur-reward to 0ms in tokens.css) automatically collapses
// the animations to their final state without extra plumbing.
//
// Behavior preservation: same props (visible, variant, onDismiss), same
// canvas-confetti library calls, same audio chime, same 5s auto-dismiss,
// same click-anywhere-to-dismiss.

const BRAND_COLORS = ['#8b5cf6', '#e879f9', '#22d3ee', '#60b8d4']
const AUTO_DISMISS_MS = 5000

const VARIANTS = {
  water: {
    icon: 'water_drop',
    iconColor: 'text-water',
    badgeBg: 'bg-water/20',
    badgeShadow:
      '0 0 0 5px rgba(96,184,212,0.25), 0 0 30px rgba(96,184,212,0.4)',
    burstGradient:
      'radial-gradient(circle, rgba(96,184,212,0.45) 0%, transparent 60%)',
    cardGlow:
      '0 25px 50px -12px rgba(0,0,0,0.7), 0 0 80px rgba(96,184,212,0.25)',
    title: 'Hydration Goal Complete!',
    subtitle: 'You hit 2.5L today. Great work staying hydrated.',
  },
  meals: {
    icon: 'emoji_events',
    iconColor: 'text-primary',
    badgeBg: 'bg-primary/20',
    badgeShadow:
      '0 0 0 5px rgba(139,92,246,0.25), 0 0 30px rgba(139,92,246,0.4)',
    burstGradient:
      'radial-gradient(circle, rgba(139,92,246,0.45) 0%, transparent 60%)',
    cardGlow:
      '0 25px 50px -12px rgba(0,0,0,0.7), 0 0 80px rgba(139,92,246,0.25)',
    title: 'Daily Goal Met!',
    subtitle: 'All meals logged and under your calorie target. Nice work!',
  },
}

// Static decorative confetti placed around the card per ProfileCelebration
// spec. Pure visual — the canvas-confetti library handles the motion bursts.
// Brand palette only (no rainbow, per SKILL.md non-negotiable).
const STATIC_CONFETTI = [
  { x:  8, y: 15, c: '#e879f9', r:  15, w: 6,  h: 6  },
  { x: 88, y: 22, c: '#22d3ee', r: -10, w: 8,  h: 8  },
  { x: 14, y: 46, c: '#8b5cf6', r:  45, w: 6,  h: 6  },
  { x: 82, y: 18, c: '#60b8d4', r: -30, w: 10, h: 4  },
  { x: 78, y: 52, c: '#e879f9', r:  60, w: 4,  h: 10 },
  { x: 12, y: 64, c: '#22d3ee', r: -45, w: 5,  h: 12 },
  { x: 40, y: 10, c: '#8b5cf6', r:  25, w: 7,  h: 3  },
  { x: 65, y: 72, c: '#e879f9', r: -15, w: 6,  h: 6  },
  { x: 25, y: 80, c: '#60b8d4', r:  50, w: 4,  h: 9  },
  { x: 90, y: 78, c: '#8b5cf6', r: -55, w: 5,  h: 5  },
  { x: 52, y: 86, c: '#22d3ee', r:  30, w: 6,  h: 3  },
  { x: 48, y: 28, c: '#e879f9', r: -40, w: 4,  h: 7  },
]

export default function CelebrationOverlay({ visible, variant = 'water', onDismiss }) {
  const timerRef = useRef(null)
  const hasPlayed = useRef(false)

  useEffect(() => {
    if (!visible) {
      hasPlayed.current = false
      return
    }
    if (hasPlayed.current) return
    hasPlayed.current = true

    // Confetti burst 1 — center
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.55 },
      colors: BRAND_COLORS,
      disableForReducedMotion: true,
    })

    // Confetti burst 2 — layered, delayed, off-center
    setTimeout(() => {
      confetti({
        particleCount: 60,
        spread: 100,
        origin: { y: 0.65, x: 0.35 },
        colors: BRAND_COLORS,
        disableForReducedMotion: true,
      })
    }, 300)

    // Achievement chime
    try {
      const chime = new Audio('/sounds/celebration.wav')
      chime.volume = 0.5
      chime.play().catch(() => {})
    } catch { /* audio unavailable */ }

    // Auto-dismiss after 5s
    timerRef.current = setTimeout(() => onDismiss?.(), AUTO_DISMISS_MS)

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [visible, onDismiss])

  if (!visible) return null

  const v = VARIANTS[variant] || VARIANTS.water

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 overflow-hidden"
      onClick={onDismiss}
      role="dialog"
      aria-modal="true"
      aria-labelledby="celebration-title"
    >
      {/* Static decorative confetti — brand palette only, with subtle glow */}
      {STATIC_CONFETTI.map((p, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="absolute pointer-events-none rounded-sm"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.w,
            height: p.h,
            background: p.c,
            transform: `rotate(${p.r}deg)`,
            boxShadow: `0 0 8px ${p.c}80`,
          }}
        />
      ))}

      {/* Card — celebration-enter handles the fade+scale entry from tokens.css */}
      <div
        className="celebration-enter relative max-w-sm w-full bg-surface border border-slate-700/50 px-7 pt-7 pb-6 text-center"
        style={{
          borderRadius: 20,
          boxShadow: v.cardGlow,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative burst behind badge — runs rewardBurst once */}
        <div className="absolute inset-0 flex items-start justify-center pt-4 pointer-events-none" aria-hidden="true">
          <div
            className="w-32 h-32 rounded-full"
            style={{
              background: v.burstGradient,
              animation: 'rewardBurst var(--dur-reward) cubic-bezier(0.16, 1, 0.3, 1) 100ms 1 both',
            }}
          />
        </div>

        {/* Badge — dual-ring glow + rewardPop entry */}
        <div className="relative mx-auto mb-4 flex items-center justify-center" style={{ width: 80, height: 80 }}>
          <div
            className={`w-20 h-20 rounded-full ${v.badgeBg} flex items-center justify-center`}
            style={{
              boxShadow: v.badgeShadow,
              animation: 'rewardPop var(--dur-reward) var(--ease-spring) both',
            }}
          >
            <MaterialIcon
              name={v.icon}
              size={40}
              fill={1}
              className={v.iconColor}
            />
          </div>
        </div>

        {/* Title — rewardShimmer sweeps a brighter highlight across once */}
        <h2
          id="celebration-title"
          className="relative font-extrabold tracking-[-0.015em] font-display"
          style={{
            fontSize: 26,
            backgroundImage:
              'linear-gradient(90deg, #ffffff 0%, #ffffff 38%, #c4b5fd 50%, #ffffff 62%, #ffffff 100%)',
            backgroundSize: '220% 100%',
            backgroundPosition: '50% 50%',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            color: 'transparent',
            animation: 'rewardShimmer var(--dur-reward) ease-out 400ms 1 both',
          }}
        >
          {v.title}
        </h2>

        {/* Subtitle */}
        <p className="relative mt-2 text-sm text-slate-300 font-display" style={{ lineHeight: 1.55 }}>
          {v.subtitle}
        </p>

        {/* Dismiss hint */}
        <button
          type="button"
          onClick={onDismiss}
          className="relative mt-6 text-xs text-slate-500 hover:text-slate-300 transition-colors font-display focus-visible:outline-none focus-visible:shadow-[var(--tap-ring)] rounded px-2 py-1"
        >
          Tap anywhere to dismiss
        </button>
      </div>
    </div>
  )
}
