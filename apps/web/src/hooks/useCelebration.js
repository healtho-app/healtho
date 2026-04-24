import { useState, useEffect, useRef, useCallback } from 'react'

const STORAGE_PREFIX = 'healtho_celebrated_'

/**
 * Once-per-day celebration trigger.
 *
 * @param {string}  goalKey      – unique key per goal type ('water' | 'meals')
 * @param {boolean} isGoalMet    – live boolean from derived state
 * @param {string}  selectedDate – YYYY-MM-DD currently viewed on Dashboard
 * @returns {{ showCelebration: boolean, dismiss: () => void }}
 */
export function useCelebration(goalKey, isGoalMet, selectedDate) {
  const [showCelebration, setShowCelebration] = useState(false)
  const hasFired = useRef(false)

  // localStorage key for this goal + date
  const storageKey = `${STORAGE_PREFIX}${goalKey}_${selectedDate}`

  useEffect(() => {
    // Only trigger for today — never for historical dates
    // (caller already gates isGoalMet with isToday, but double-check via flag)
    if (!isGoalMet) return
    if (hasFired.current) return

    // Check if already celebrated today (survives page refresh)
    try {
      if (localStorage.getItem(storageKey)) return
    } catch { /* localStorage unavailable */ }

    // Fire!
    hasFired.current = true
    try { localStorage.setItem(storageKey, '1') } catch { /* ignore */ }
    setShowCelebration(true)
  }, [isGoalMet, storageKey])

  // Reset visibility when navigating away from today
  useEffect(() => {
    setShowCelebration(false)
  }, [selectedDate])

  const dismiss = useCallback(() => setShowCelebration(false), [])

  return { showCelebration, dismiss }
}
