// ProfileLoadError — fallback UI shown when profile data fails to load.
//
// HLTH-585. Implements the presentation layer for HLTH-220 (error handling &
// user feedback on profile load failures). Pairs with ProfileContext's error
// taxonomy — consumers pass the `errorType` straight through.
//
// Props:
//   errorType  — 'network' | 'auth' | 'notfound' | 'unknown'
//   onRetry    — () => void   (called when the retry button is clicked)
//   retrying   — boolean      (disables button + shows spinner)
//   variant    — 'banner' | 'card' | 'fullpage'  (default: 'card')
//
// Variants:
//   'banner'   — thin bar across top of page, non-blocking. Food logs etc. still render.
//                Use when some of the page is still usable without profile data.
//   'card'     — boxed card that replaces a specific widget area (e.g., calorie ring).
//                Use when a single region is broken but the rest of the page is fine.
//   'fullpage' — centered full-height card. Use when the whole page is blocked
//                and the only sensible action is retry or re-auth.
import { Link } from 'react-router-dom'
import { MaterialIcon } from '@healtho/ui'

// Copy per error type — user-facing. No stack traces, no Supabase error codes.
// Each entry owns its own headline, body, icon, and primary CTA.
const MESSAGES = {
  network: {
    icon: 'cloud_off',
    iconColor: 'text-amber-400',
    headline: "Can't reach the server",
    body: "We couldn't load your profile. Check your connection and try again.",
    cta: 'Retry',
    action: 'retry',
  },
  auth: {
    icon: 'lock',
    iconColor: 'text-red-400',
    headline: 'Session expired',
    body: 'Your sign-in has expired. Please sign in again to continue.',
    cta: 'Sign in',
    action: 'login',
  },
  notfound: {
    icon: 'account_circle_off',
    iconColor: 'text-primary',
    headline: 'Finish setting up your profile',
    body: "We couldn't find your profile. Complete onboarding to start tracking.",
    cta: 'Complete setup',
    action: 'register',
  },
  unknown: {
    icon: 'error',
    iconColor: 'text-red-400',
    headline: 'Something went wrong',
    body: "We couldn't load your profile right now. Please try again.",
    cta: 'Retry',
    action: 'retry',
  },
}

export default function ProfileLoadError({
  errorType = 'unknown',
  onRetry,
  retrying = false,
  variant = 'card',
}) {
  // Defensive: unknown errorType falls back to the generic 'unknown' copy so
  // the component can never render blank.
  const msg = MESSAGES[errorType] || MESSAGES.unknown

  // ── Action button ──────────────────────────────────────────────────────────
  // All variants render the same action, styled to match their size.
  // For 'retry' actions, disable the button while a retry is in flight so
  // rapid clicks don't stack multiple fetches.
  const actionButton = (() => {
    if (msg.action === 'retry') {
      return (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white text-sm font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          aria-label={retrying ? 'Retrying' : msg.cta}
        >
          {retrying ? (
            <>
              <MaterialIcon name="progress_activity" size={16} className="animate-spin" />
              Retrying…
            </>
          ) : (
            <>
              <MaterialIcon name="refresh" size={16} />
              {msg.cta}
            </>
          )}
        </button>
      )
    }
    // 'login' and 'register' are route transitions — render as Link
    const to = msg.action === 'login' ? '/login' : '/register'
    return (
      <Link
        to={to}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white text-sm font-bold transition-colors"
      >
        <MaterialIcon name="arrow_forward" size={16} />
        {msg.cta}
      </Link>
    )
  })()

  // ── Banner variant ─────────────────────────────────────────────────────────
  // Thin, non-blocking. Lives at the top of the page. Rest of page renders
  // normally below it. Use for network errors on the dashboard so food logs
  // remain accessible.
  if (variant === 'banner') {
    return (
      <div
        role="alert"
        className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 flex items-center gap-3"
      >
        <MaterialIcon name={msg.icon} size={20} className={`flex-shrink-0 ${msg.iconColor}`} />
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold truncate">{msg.headline}</p>
          <p className="text-slate-400 text-xs mt-0.5 truncate">{msg.body}</p>
        </div>
        <div className="flex-shrink-0">{actionButton}</div>
      </div>
    )
  }

  // ── Fullpage variant ───────────────────────────────────────────────────────
  // Centered, takes over the content area. Use for auth / notfound where
  // the whole dashboard is a dead end without resolution.
  if (variant === 'fullpage') {
    return (
      <div
        role="alert"
        className="flex flex-col items-center justify-center text-center py-16 px-4"
      >
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4">
          <MaterialIcon name={msg.icon} size={28} className={msg.iconColor} />
        </div>
        <h2 className="text-white text-2xl font-extrabold tracking-tight mb-2">
          {msg.headline}
        </h2>
        <p className="text-slate-400 text-sm max-w-sm mb-6">{msg.body}</p>
        {actionButton}
      </div>
    )
  }

  // ── Card variant (default) ─────────────────────────────────────────────────
  // Boxed card that drops into a dashboard region (e.g., where the calorie
  // ring would go). Preserves layout.
  return (
    <div
      role="alert"
      className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4"
    >
      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
        <MaterialIcon name={msg.icon} size={20} className={msg.iconColor} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-bold">{msg.headline}</p>
        <p className="text-slate-500 text-xs mt-0.5">{msg.body}</p>
      </div>
      <div className="flex-shrink-0">{actionButton}</div>
    </div>
  )
}
