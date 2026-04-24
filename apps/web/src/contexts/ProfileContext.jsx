import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

const ProfileContext = createContext(null)

const PROFILE_COLUMNS =
  'full_name, username, email, gender, age, height_cm, weight_kg, bmi, activity_level, fitness_goal, weekly_rate_kg, goal_weight_kg, daily_calorie_goal, timezone, country, phone_number, avatar_url, unit_system'

// Timeout for the profile fetch. Supabase hanging indefinitely is a real failure
// mode (seen on flaky mobile networks). Anything longer than this and we treat it
// as a network error so the user can retry instead of staring at a skeleton.
const FETCH_TIMEOUT_MS = 10_000

// Auto-retry delay for transient network errors. One retry only — anything beyond
// that is the user's decision (manual retry button).
const AUTO_RETRY_DELAY_MS = 2_000

// Error taxonomy — drives which UI variant the caller renders and whether we
// auto-retry. Never let a caller see a raw Supabase error object.
//   'network'  — offline, DNS, CORS, timeout, fetch threw. Transient, auto-retry-able.
//   'auth'     — session expired / JWT invalid / RLS denied. User must re-auth.
//   'notfound' — query succeeded but profile row does not exist. Route to onboarding.
//   'unknown'  — everything else (5xx, parse error). Show retry, don't auto-retry.
function classifyError(err) {
  if (!err) return null
  // Supabase PostgREST auth errors
  if (err.code === 'PGRST301' || err.code === '401' || err.status === 401) return 'auth'
  if (err.message?.toLowerCase().includes('jwt')) return 'auth'
  if (err.message?.toLowerCase().includes('auth')) return 'auth'
  // Network / fetch-level errors
  if (err.name === 'AbortError') return 'network'
  if (err.name === 'TypeError' && err.message?.toLowerCase().includes('fetch')) return 'network'
  if (err.message === 'TIMEOUT') return 'network'
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'network'
  return 'unknown'
}

export function ProfileProvider({ children }) {
  const [profile,   setProfile]   = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)      // error message for UI
  const [errorType, setErrorType] = useState(null)      // 'network' | 'auth' | 'notfound' | 'unknown' | null
  const [retrying,  setRetrying]  = useState(false)     // true while a retry is in flight

  // Sequence guard: every fetch increments this. If a stale fetch resolves after
  // a newer one, it will see its sequence number is no longer current and bail.
  // Prevents races where the initial mount fetch + SIGNED_IN event fetch resolve
  // out of order and overwrite each other.
  const fetchSeqRef    = useRef(0)
  const isMountedRef   = useRef(true)
  const autoRetriedRef = useRef(false)  // auto-retry only fires once per failure
  // Ref mirrors so handlers and the useCallback body can read latest state
  // without stale closures (useCallback has empty deps to stay stable).
  const errorTypeRef   = useRef(null)
  const hasProfileRef  = useRef(false) // true once we've ever successfully loaded

  const fetchProfile = useCallback(async ({ isRetry = false } = {}) => {
    const mySeq = ++fetchSeqRef.current

    // Only show the skeleton spinner when we have nothing to show. Silent
    // background refreshes (e.g., after a profile save) should not flash the
    // Header avatar to blank while the refetch is in flight. Read from a ref
    // so the empty-deps useCallback closure stays correct.
    const isInitialFetch = !hasProfileRef.current && !isRetry

    if (isRetry) setRetrying(true)
    if (isInitialFetch) setLoading(true)

    // Helper: only update state if we're still the latest fetch AND still mounted.
    // Stale writes from a superseded fetch are silently dropped.
    const safeSet = (fn) => {
      if (!isMountedRef.current) return
      if (fetchSeqRef.current !== mySeq) return
      fn()
    }

    try {
      // ── Session check ──────────────────────────────────────────────────────
      // If there's no session, we're not an error — we're logged out. Clear
      // everything. ProtectedRoute handles the redirect; we just surface null.
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) throw sessionError
      if (!session) {
        safeSet(() => {
          setProfile(null)
          setError(null)
          setErrorType(null)
          errorTypeRef.current = null
          setLoading(false)
          setRetrying(false)
        })
        return
      }

      // ── Profile query with timeout ─────────────────────────────────────────
      // Supabase doesn't support AbortController on the JS client directly, so
      // we race the query against a timeout promise. The losing side is ignored.
      const query = supabase
        .from('profiles')
        .select(PROFILE_COLUMNS)
        .eq('id', session.user.id)
        .maybeSingle()

      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), FETCH_TIMEOUT_MS)
      )

      const { data, error: queryError } = await Promise.race([query, timeout])

      if (queryError) throw queryError

      // Profile row doesn't exist — user signed up but onboarding row never
      // landed. Not a transient error; needs routing to /register.
      if (data === null) {
        safeSet(() => {
          setProfile(null)
          setError('Profile not found')
          setErrorType('notfound')
          errorTypeRef.current = 'notfound'
          setLoading(false)
          setRetrying(false)
        })
        return
      }

      // ── Success ────────────────────────────────────────────────────────────
      safeSet(() => {
        setProfile(data)
        hasProfileRef.current = true
        setError(null)
        setErrorType(null)
        errorTypeRef.current = null
        setLoading(false)
        setRetrying(false)
        autoRetriedRef.current = false  // reset auto-retry budget on success
      })
    } catch (err) {
      const type = classifyError(err)
      // Structured log — easier to grep than raw console.error spam.
      console.error('[ProfileContext] profile_fetch_error', {
        errorType: type,
        message: err?.message || String(err),
        code: err?.code,
        sequence: mySeq,
      })

      safeSet(() => {
        setProfile(null)
        setError(err?.message || 'Failed to load profile')
        setErrorType(type)
        errorTypeRef.current = type
        setLoading(false)
        setRetrying(false)
      })

      // Auto-retry once on network errors — transient blips shouldn't make the
      // user click a button. Auth errors are not transient; don't auto-retry.
      if (type === 'network' && !autoRetriedRef.current && !isRetry) {
        autoRetriedRef.current = true
        setTimeout(() => {
          if (isMountedRef.current) fetchProfile({ isRetry: true })
        }, AUTO_RETRY_DELAY_MS)
      }
    }
  }, [])

  // Manual retry — exposed to UI. Resets the auto-retry budget so if the
  // user retries manually and it also fails with a network error, they get
  // another free auto-retry on the next natural refresh.
  const retryProfile = useCallback(() => {
    autoRetriedRef.current = false
    return fetchProfile({ isRetry: true })
  }, [fetchProfile])

  useEffect(() => {
    isMountedRef.current = true
    fetchProfile()

    // Auth state changes — refetch on sign-in, clear on sign-out.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        autoRetriedRef.current = false
        fetchProfile()
      } else if (event === 'SIGNED_OUT') {
        setProfile(null)
        hasProfileRef.current = false
        setError(null)
        setErrorType(null)
        errorTypeRef.current = null
        setLoading(false)
        setRetrying(false)
      }
    })

    // Online event — if the user was offline and reconnects, try once.
    // Read from the ref (not state) so this handler never goes stale.
    const onOnline = () => {
      if (errorTypeRef.current === 'network') {
        autoRetriedRef.current = false
        fetchProfile({ isRetry: true })
      }
    }
    window.addEventListener('online', onOnline)

    return () => {
      isMountedRef.current = false
      subscription.unsubscribe()
      window.removeEventListener('online', onOnline)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchProfile])

  return (
    <ProfileContext.Provider
      value={{
        profile,
        loading,
        error,
        errorType,
        retrying,
        refreshProfile: fetchProfile,
        retryProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider')
  return ctx
}
