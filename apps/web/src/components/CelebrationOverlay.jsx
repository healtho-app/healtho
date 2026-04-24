import { useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'

const BRAND_COLORS = ['#8b5cf6', '#e879f9', '#22d3ee', '#60b8d4']
const AUTO_DISMISS_MS = 5000

const VARIANTS = {
  water: {
    icon: 'water_drop',
    iconColor: 'text-water',
    badgeBg: 'bg-water/20',
    ringColor: 'ring-water/30',
    title: 'Hydration Goal Complete!',
    subtitle: 'You hit 2.5L today. Great work staying hydrated.',
  },
  meals: {
    icon: 'emoji_events',
    iconColor: 'text-primary',
    badgeBg: 'bg-primary/20',
    ringColor: 'ring-primary/30',
    title: 'Daily Goal Met!',
    subtitle: 'All meals logged and under your calorie target. Nice work!',
  },
}

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

    // Confetti burst 1
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.55 },
      colors: BRAND_COLORS,
      disableForReducedMotion: true,
    })

    // Confetti burst 2 (layered, delayed)
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

    // Auto-dismiss
    timerRef.current = setTimeout(() => onDismiss?.(), AUTO_DISMISS_MS)

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [visible, onDismiss])

  if (!visible) return null

  const v = VARIANTS[variant] || VARIANTS.water

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4"
      onClick={onDismiss}
    >
      <div
        className="celebration-enter max-w-sm w-full rounded-2xl border border-slate-700/50 bg-surface p-8 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Badge icon */}
        <div className={`mx-auto w-20 h-20 rounded-full ${v.badgeBg} ring-4 ${v.ringColor} flex items-center justify-center mb-5`}>
          <span className={`material-symbols-outlined text-4xl ${v.iconColor}`}>{v.icon}</span>
        </div>

        {/* Title */}
        <h2 className="text-white text-2xl font-extrabold tracking-tight">{v.title}</h2>

        {/* Subtitle */}
        <p className="text-slate-400 text-sm mt-2 leading-relaxed">{v.subtitle}</p>

        {/* Dismiss hint */}
        <button
          onClick={onDismiss}
          className="mt-6 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          Tap anywhere to dismiss
        </button>
      </div>
    </div>
  )
}
