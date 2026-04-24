import { createClient } from '@supabase/supabase-js'

// These values come from your Supabase project settings
// → supabase.com → your project → Settings → API
// Store them in a .env file — NEVER hardcode real keys here
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.warn(
    '[Healtho] Supabase env vars not set. ' +
    'Create a .env file in frontend/ with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  )
}

export const supabase = createClient(
  SUPABASE_URL  || 'https://placeholder.supabase.co',
  SUPABASE_ANON || 'placeholder-anon-key',
  {
    auth: {
      // sessionStorage expires when the tab closes — safer than localStorage
      // which persists forever and is readable by any JS on the page.
      // Upgrade to httpOnly cookies via @supabase/ssr before public launch.
      storage:          window.sessionStorage,
      autoRefreshToken: true,
      persistSession:   true,
      detectSessionInUrl: true,
    }
  }
)

// ─── Auth helpers (ready to use when Ishaan connects Supabase) ───

export const signUp = async ({ email, password, name, age, weight_kg, height_cm, activity_level }) => {
  // Step 1 — create auth user
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error

  // Step 2 — insert profile row (links to Ishaan's users table)
  const { error: profileError } = await supabase
    .from('users')
    .insert({
      id:             data.user.id,
      name,
      email,
      age,
      weight_kg,
      height_cm,
      activity_level,
    })
  if (profileError) throw profileError

  return data
}

export const signIn = async ({ email, password }) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export const getSession = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}
