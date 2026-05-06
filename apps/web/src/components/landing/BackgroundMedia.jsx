import { useEffect, useRef, useState } from 'react'

/**
 * Reusable background media component.
 * Supports video (with poster fallback) or image backgrounds.
 * Always renders a dark overlay for text readability.
 *
 * Reduce-motion: when `prefers-reduced-motion: reduce` is set, video
 * autoplay is suppressed and the poster image is rendered instead. This
 * mirrors the SKILL.md non-negotiable §15 ("respect prefers-reduced-motion")
 * and Phase 1's --dur-* token-based motion budget.
 *
 * @param {'video'|'image'} type
 * @param {string} src        — path to video or image
 * @param {string} poster     — poster image (video only, also used as fallback)
 * @param {number} opacity    — overlay opacity, 0–1 (default 0.65)
 */
export default function BackgroundMedia({ type = 'image', src, poster, opacity = 0.65 }) {
  const videoRef = useRef(null)
  const [videoFailed, setVideoFailed] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  // Live-track changes to the user's motion preference (e.g., toggling the
  // OS-level Reduce Motion setting while the page is open).
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (e) => setReduceMotion(e.matches)
    if (mql.addEventListener) {
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    }
    // Older Safari fallback
    mql.addListener(onChange)
    return () => mql.removeListener(onChange)
  }, [])

  // Treat reduce-motion as "video unavailable" — falls through to the poster
  // image rendering branch below.
  const showVideo = type === 'video' && !videoFailed && !reduceMotion

  useEffect(() => {
    if (!showVideo || !videoRef.current) return

    // Attempt play — browsers may block even muted autoplay in rare cases
    const playPromise = videoRef.current.play()
    if (playPromise !== undefined) {
      playPromise.catch(() => setVideoFailed(true))
    }
  }, [showVideo])

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      {/* Video or image layer */}
      {showVideo ? (
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster={poster}
          onError={() => setVideoFailed(true)}
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={src} type="video/mp4" />
        </video>
      ) : (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${type === 'video' ? poster : src})` }}
        />
      )}

      {/* Dark overlay — always present for readability */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: `rgba(0, 0, 0, ${opacity})` }}
      />
    </div>
  )
}
