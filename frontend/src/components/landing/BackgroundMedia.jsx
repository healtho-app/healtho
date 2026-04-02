import { useEffect, useRef, useState } from 'react'

/**
 * Reusable background media component.
 * Supports video (with poster fallback) or image backgrounds.
 * Always renders a dark overlay for text readability.
 *
 * @param {'video'|'image'} type
 * @param {string} src        — path to video or image
 * @param {string} poster     — poster image (video only, also used as fallback)
 * @param {number} opacity    — overlay opacity, 0–1 (default 0.65)
 */
export default function BackgroundMedia({ type = 'image', src, poster, opacity = 0.65 }) {
  const videoRef = useRef(null)
  const [videoFailed, setVideoFailed] = useState(false)

  useEffect(() => {
    if (type !== 'video' || !videoRef.current) return

    // Attempt play — browsers may block even muted autoplay in rare cases
    const playPromise = videoRef.current.play()
    if (playPromise !== undefined) {
      playPromise.catch(() => setVideoFailed(true))
    }
  }, [type])

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      {/* Video or image layer */}
      {type === 'video' && !videoFailed ? (
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
