import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { createAvatar } from '@dicebear/core'
import { dylan } from '@dicebear/collection'
import Header from '../components/Header'
import { supabase } from '../lib/supabase'
import { useProfile } from '../contexts/ProfileContext'

// ── Countries (US + India pinned, then alphabetical) ─────────────────────────
const COUNTRIES = [
  'United States', 'India',
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda',
  'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan',
  'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize',
  'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil',
  'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi',
  'Cabo Verde', 'Cambodia', 'Cameroon', 'Canada', 'Central African Republic', 'Chad',
  'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica', 'Croatia', 'Cuba',
  'Cyprus', 'Czech Republic',
  'Democratic Republic of the Congo', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic',
  'East Timor', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea',
  'Estonia', 'Eswatini', 'Ethiopia',
  'Fiji', 'Finland', 'France',
  'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala',
  'Guinea', 'Guinea-Bissau', 'Guyana',
  'Haiti', 'Honduras', 'Hungary',
  'Iceland', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy',
  'Ivory Coast', 'Jamaica', 'Japan', 'Jordan',
  'Kazakhstan', 'Kenya', 'Kiribati', 'Kosovo', 'Kuwait', 'Kyrgyzstan',
  'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein',
  'Lithuania', 'Luxembourg',
  'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands',
  'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia',
  'Montenegro', 'Morocco', 'Mozambique', 'Myanmar',
  'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger',
  'Nigeria', 'North Korea', 'North Macedonia', 'Norway',
  'Oman',
  'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru',
  'Philippines', 'Poland', 'Portugal',
  'Qatar',
  'Romania', 'Russia', 'Rwanda',
  'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa',
  'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia',
  'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands',
  'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka',
  'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria',
  'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Togo', 'Tonga',
  'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu',
  'UAE', 'Uganda', 'Ukraine', 'United Kingdom', 'Uruguay', 'Uzbekistan',
  'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam',
  'Yemen',
  'Zambia', 'Zimbabwe',
]

// ── Phone validation ─────────────────────────────────────────────────────────
function validatePhone(phone) {
  if (!phone) return '' // optional
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 7) return 'Phone number too short (min 7 digits)'
  if (digits.length > 15) return 'Phone number too long (max 15 digits)'
  if (!/^[+\d\s().-]+$/.test(phone)) return 'Phone contains invalid characters'
  return ''
}

// ── Constants ──────────────────────────────────────────────────────────────────
const ACTIVITY_MAP = {
  sedentary:         { label: 'Sedentary',         sub: 'Little or no exercise, desk job',  emoji: '🪑' },
  lightly_active:    { label: 'Lightly Active',    sub: 'Light exercise 1–3 days/week',     emoji: '🚶' },
  moderately_active: { label: 'Moderately Active', sub: 'Moderate exercise 3–5 days/week',  emoji: '🏃' },
  very_active:       { label: 'Very Active',       sub: 'Hard exercise 6–7 days/week',      emoji: '💪' },
  athlete:           { label: 'Athlete',           sub: 'Very hard exercise, physical job',  emoji: '🏋️' },
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function calcBMI(weight, height) {
  if (!weight || !height || height < 50 || weight < 20) return null
  return (weight / Math.pow(height / 100, 2)).toFixed(1)
}

function calcCalories(weight, height, age, activity) {
  if (!weight || !height || !age || isNaN(weight) || isNaN(height) || isNaN(age)) return null
  const bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5
  const multipliers = { sedentary: 1.2, lightly_active: 1.375, moderately_active: 1.55, very_active: 1.725, athlete: 1.9 }
  return Math.round(bmr * (multipliers[activity] || 1.55))
}

function getBmiInfo(bmi) {
  const b = parseFloat(bmi)
  if (!b) return null
  if (b < 18.5) return { label: 'Underweight',      color: 'text-blue-400',   bar: 'bg-blue-400',   pct: 20 }
  if (b < 25)   return { label: 'Healthy weight ✓', color: 'text-green-400',  bar: 'bg-green-400',  pct: 50 }
  if (b < 30)   return { label: 'Overweight',        color: 'text-yellow-400', bar: 'bg-yellow-400', pct: 72 }
  return             { label: 'Obese range',         color: 'text-red-400',    bar: 'bg-red-400',    pct: 92 }
}

function validate({ age, height, weight, unit_system }) {
  const errors = {}
  const a = parseInt(age), h = parseFloat(height), w = parseFloat(weight)
  const imperial = unit_system === 'imperial'
  if (!age || isNaN(a) || a < 13 || a > 120) errors.age = 'Enter a valid age (13–120)'
  if (!height || isNaN(h) || h <= 0) {
    errors.height = 'Enter a valid height'
  } else if (imperial ? (h < 20 || h > 108) : (h < 50 || h > 300)) {
    errors.height = imperial ? 'Enter a valid height (20–108 in)' : 'Enter a valid height (50–300 cm)'
  }
  if (!weight || isNaN(w) || w <= 0) {
    errors.weight = 'Enter a valid weight'
  } else if (imperial ? (w < 44 || w > 1100) : (w < 20 || w > 500)) {
    errors.weight = imperial ? 'Enter a valid weight (44–1100 lb)' : 'Enter a valid weight (20–500 kg)'
  }
  return errors
}

function FieldError({ message }) {
  if (!message) return null
  return (
    <p className="flex items-center gap-1 text-red-400 text-xs font-semibold mt-1">
      <span className="material-symbols-outlined text-sm">error</span>
      {message}
    </p>
  )
}

function inputCls(hasError) {
  return `w-full bg-slate-800 border rounded-xl h-12 px-4 text-base text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 transition-all ${
    hasError
      ? 'border-red-500/70 focus:border-red-500 focus:ring-red-500/20'
      : 'border-slate-700 focus:border-primary focus:ring-primary/20'
  }`
}

// ── Component ──────────────────────────────────────────────────────────────────
const AVATAR_MAX_SIZE = 2 * 1024 * 1024 // 2 MB
const AVATAR_TYPES   = ['image/jpeg', 'image/png', 'image/webp']

// ── DiceBear (Dylan) helpers ─────────────────────────────────────────────────
function dylanDataUri(seed) {
  return createAvatar(dylan, { seed, size: 256, radius: 50 }).toDataUri()
}

function dylanSvg(seed) {
  return createAvatar(dylan, { seed, size: 256, radius: 50 }).toString()
}

function randomSeed() {
  return Math.random().toString(36).substring(2, 12)
}

// Convert SVG string to PNG Blob via canvas (avoids storing SVG which can contain JS).
// Uses a data URL instead of a blob URL because Vercel/strict CSPs block blob: in <img src>.
async function svgToPngBlob(svgString) {
  // unescape() handles non-ASCII chars before btoa()
  const dataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)))
  const img = new Image()
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = () => reject(new Error('Failed to load generated SVG'))
    img.src = dataUrl
  })
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, 512, 512)
  return await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
}

export default function Profile() {
  const [params]  = useSearchParams()
  const navigate  = useNavigate()
  const { refreshProfile } = useProfile()

  // Fallback values from URL params (passed by Register flow)
  const fallback = {
    name:     params.get('name')     || '',
    username: params.get('username') || '',
    email:    params.get('email')    || '',
    age:      params.get('age')      || '',
    height:   params.get('height')   || '',
    weight:   params.get('weight')   || '',
    activity: params.get('activity') || 'moderately_active',
    country:     params.get('country')     || '',
    phone:       params.get('phone')       || '',
    avatar:      '',
    unit_system: params.get('unit_system') || 'metric',
  }

  const [profile,  setProfile]  = useState(fallback)
  const [loading,  setLoading]  = useState(true)
  const [editing,  setEditing]  = useState(false)
  const [draft,    setDraft]    = useState(fallback)
  const [errors,   setErrors]   = useState({})
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [countrySearch, setCountrySearch] = useState('')
  const [countryOpen,   setCountryOpen]   = useState(false)
  const [countryIdx,    setCountryIdx]    = useState(-1)
  const countryRef = useRef(null)
  const countryListRef = useRef(null)
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerSeeds, setPickerSeeds] = useState(() => Array.from({ length: 8 }, randomSeed))

  // Close country dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (countryRef.current && !countryRef.current.contains(e.target)) setCountryOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Scroll active country into view on keyboard nav
  useEffect(() => {
    if (countryIdx >= 0 && countryListRef.current) {
      const item = countryListRef.current.children[countryIdx]
      if (item) item.scrollIntoView({ block: 'nearest' })
    }
  }, [countryIdx])

  // Filtered country list based on search
  const filteredCountries = countrySearch
    ? COUNTRIES.filter(c => c.toLowerCase().includes(countrySearch.toLowerCase()))
    : COUNTRIES

  // Fetch profile from Supabase on mount
  useEffect(() => {
    async function fetchProfile() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, username, email, age, height_cm, weight_kg, activity_level, daily_calorie_goal, country, phone_number, avatar_url, unit_system')
        .eq('id', session.user.id)
        .maybeSingle()

      if (error) {
        console.error('[Profile] Supabase fetch error:', error.message, error)
        setLoading(false)
        return
      }

      // No profile row yet — send them back to finish registration
      if (!data) {
        navigate('/register?google=1')
        return
      }
      if (data) {
        const imperial = data.unit_system === 'imperial'
        const heightDisplay = data.height_cm != null
          ? (imperial ? String(parseFloat((data.height_cm / 2.54).toFixed(1))) : String(data.height_cm))
          : fallback.height
        const weightDisplay = data.weight_kg != null
          ? (imperial ? String(parseFloat((data.weight_kg / 0.453592).toFixed(1))) : String(data.weight_kg))
          : fallback.weight
        const fetched = {
          name:        data.full_name     || fallback.name,
          username:    data.username      || '',
          email:       data.email         || fallback.email,
          age:         data.age != null   ? String(data.age) : fallback.age,
          height:      heightDisplay,
          weight:      weightDisplay,
          activity:    data.activity_level || fallback.activity,
          country:     data.country        || '',
          phone:       data.phone_number   || '',
          avatar:      data.avatar_url     || '',
          unit_system: data.unit_system    || 'metric',
        }
        setProfile(fetched)
        setDraft(fetched)
      }
      setLoading(false)
    }
    fetchProfile()
  }, [])

  // Live-computed values from current profile (or draft while editing)
  const view     = editing ? draft : profile
  const imperial = profile.unit_system === 'imperial'
  const viewWeightKg = imperial ? parseFloat(view.weight) * 0.453592 : parseFloat(view.weight)
  const viewHeightCm = imperial ? parseFloat(view.height) * 2.54     : parseFloat(view.height)
  const bmi      = calcBMI(viewWeightKg, viewHeightCm)
  const calories = calcCalories(viewWeightKg, viewHeightCm, parseInt(view.age), view.activity)
  const bmiInfo  = getBmiInfo(bmi)
  const actInfo  = ACTIVITY_MAP[view.activity] || ACTIVITY_MAP.moderately_active
  const initials = profile.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  const setDraftField = (field) => (e) => {
    setDraft(d => ({ ...d, [field]: e.target.value }))
    if (errors[field]) setErrors(er => ({ ...er, [field]: '' }))
  }

  const startEdit = () => {
    setDraft({ ...profile })
    setErrors({})
    setSaved(false)
    setEditing(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => {
    setEditing(false)
    setErrors({})
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset input so same file can be re-selected
    e.target.value = ''
    setAvatarError('')

    if (!AVATAR_TYPES.includes(file.type)) {
      setAvatarError('Only JPG, PNG, and WebP images are allowed')
      return
    }
    if (file.size > AVATAR_MAX_SIZE) {
      setAvatarError('Image must be under 2 MB')
      return
    }

    setUploading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not signed in')

      const ext = file.name.split('.').pop().toLowerCase()
      const filePath = `${session.user.id}/avatar.${ext}`

      // Upload (upsert) to avatars bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true, contentType: file.type })
      if (uploadError) throw uploadError

      // Get public URL and append cache-busting timestamp
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`

      // Save URL to profiles table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', session.user.id)
      if (updateError) throw updateError

      // Update local state + global context
      setProfile(p => ({ ...p, avatar: publicUrl }))
      setDraft(d => ({ ...d, avatar: publicUrl }))
      await refreshProfile()
    } catch (err) {
      setAvatarError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleAvatarRemove = async () => {
    setAvatarError('')
    setUploading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not signed in')

      // List files in user's avatar folder to delete them
      const { data: files } = await supabase.storage
        .from('avatars')
        .list(session.user.id)

      if (files && files.length > 0) {
        const paths = files.map(f => `${session.user.id}/${f.name}`)
        await supabase.storage.from('avatars').remove(paths)
      }

      // Clear avatar_url in profiles
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', session.user.id)
      if (error) throw error

      setProfile(p => ({ ...p, avatar: '' }))
      setDraft(d => ({ ...d, avatar: '' }))
      await refreshProfile()
    } catch (err) {
      setAvatarError(err.message || 'Could not remove photo')
    } finally {
      setUploading(false)
    }
  }

  const openPicker = () => {
    setPickerSeeds(Array.from({ length: 8 }, randomSeed))
    setPickerOpen(true)
    setAvatarError('')
  }

  const shufflePicker = () => {
    setPickerSeeds(Array.from({ length: 8 }, randomSeed))
  }

  const handleDicebearSelect = async (seed) => {
    setPickerOpen(false)
    setUploading(true)
    setAvatarError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not signed in')

      const svg = dylanSvg(seed)
      const pngBlob = await svgToPngBlob(svg)
      if (!pngBlob) throw new Error('Could not generate avatar image')

      const filePath = `${session.user.id}/avatar.png`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, pngBlob, { upsert: true, contentType: 'image/png' })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', session.user.id)
      if (updateError) throw updateError

      setProfile(p => ({ ...p, avatar: publicUrl }))
      setDraft(d => ({ ...d, avatar: publicUrl }))
      await refreshProfile()
    } catch (err) {
      setAvatarError(err.message || 'Could not save generated avatar')
    } finally {
      setUploading(false)
    }
  }

  const saveEdit = async () => {
    const errs = validate({ ...draft, unit_system: profile.unit_system })
    // Phone validation
    const phoneErr = validatePhone(draft.phone)
    if (phoneErr) errs.phone = phoneErr
    // Country validation — must be from the list or empty
    if (draft.country && !COUNTRIES.includes(draft.country)) errs.country = 'Please select a country from the list'
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not signed in')

      const imperial  = profile.unit_system === 'imperial'
      const weight_kg = imperial ? parseFloat((parseFloat(draft.weight) * 0.453592).toFixed(2)) : parseFloat(draft.weight)
      const height_cm = imperial ? parseFloat((parseFloat(draft.height) * 2.54).toFixed(2))     : parseFloat(draft.height)
      const age       = parseInt(draft.age)
      const bmi       = calculateBMI(weight_kg, height_cm)

      const newCalories = calcCalories(weight_kg, height_cm, age, draft.activity)

      const { error } = await supabase
        .from('profiles')
        .update({
          age,
          height_cm,
          weight_kg,
          bmi,
          activity_level:     draft.activity,
          daily_calorie_goal: newCalories,
          country:            draft.country.trim()  || null,
          phone_number:       draft.phone.trim()    || null,
        })
        .eq('id', session.user.id)

      if (error) throw error

      setProfile({ ...profile, ...draft })
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      refreshProfile()
    } catch (err) {
      setErrors({ save: err.message || 'Could not save. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  function calculateBMI(weight_kg, height_cm) {
    const height_m = height_cm / 100
    return parseFloat((weight_kg / (height_m * height_m)).toFixed(1))
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header rightLabel="Dashboard" rightTo="/dashboard" rightIcon="dashboard" showLogout />

      <main className="flex-1 flex items-start justify-center px-4 py-10">
        {loading ? (
          <div className="flex flex-col items-center gap-4 pt-20">
            <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
            <p className="text-slate-500 text-sm font-semibold">Loading profile...</p>
          </div>
        ) : (
        <div className="w-full max-w-[520px] space-y-4">

          {/* Saved banner */}
          {saved && (
            <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
              <span className="material-symbols-outlined text-green-400">check_circle</span>
              <p className="text-green-400 font-bold text-sm">Profile updated successfully!</p>
            </div>
          )}

          {/* Avatar + name */}
          <div className="flex flex-col items-center py-4">
            <div className="relative mb-4">
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt={profile.name}
                  className="w-24 h-24 rounded-full object-cover shadow-xl shadow-primary/30 border-2 border-primary/40"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-4xl font-extrabold text-white shadow-xl shadow-primary/30">
                  {initials}
                </div>
              )}
              {/* Upload photo button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center hover:bg-slate-700 hover:border-primary/50 transition-colors disabled:opacity-50"
                title={profile.avatar ? 'Change photo' : 'Upload photo'}
              >
                {uploading ? (
                  <span className="material-symbols-outlined text-primary text-base animate-spin">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-slate-400 text-base">photo_camera</span>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            {/* Avatar actions */}
            <div className="flex items-center gap-3 mb-3 flex-wrap justify-center">
              <button
                onClick={openPicker}
                disabled={uploading}
                className="text-primary text-xs font-semibold hover:text-primary/80 transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                Generate avatar
              </button>
              {profile.avatar && !uploading && (
                <button
                  onClick={handleAvatarRemove}
                  className="text-red-400 text-xs font-semibold hover:text-red-300 transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                  Remove photo
                </button>
              )}
            </div>
            {avatarError && (
              <p className="flex items-center gap-1 text-red-400 text-xs font-semibold mb-2">
                <span className="material-symbols-outlined text-sm">error</span>
                {avatarError}
              </p>
            )}

            {/* DiceBear picker — inline grid */}
            {pickerOpen && (
              <div className="w-full bg-slate-900 border border-primary/30 rounded-xl p-4 mb-3">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-slate-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-base">auto_awesome</span>
                    Pick an avatar
                  </p>
                  <button
                    onClick={() => setPickerOpen(false)}
                    className="text-slate-500 hover:text-slate-300"
                    title="Close"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {pickerSeeds.map(seed => (
                    <button
                      key={seed}
                      onClick={() => handleDicebearSelect(seed)}
                      className="aspect-square rounded-full overflow-hidden border-2 border-slate-700 hover:border-primary transition-all hover:scale-105"
                      title="Select this avatar"
                    >
                      <img src={dylanDataUri(seed)} alt="" className="w-full h-full" />
                    </button>
                  ))}
                </div>
                <button
                  onClick={shufflePicker}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">shuffle</span>
                  Shuffle
                </button>
                <p className="text-slate-600 text-[10px] mt-2 text-center">
                  Avatars by Natalia Spivak · <a href="https://www.dicebear.com/styles/dylan/" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400 underline">Dylan</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400 underline">CC BY 4.0</a>
                </p>
              </div>
            )}
            <h1 className="text-white text-3xl font-extrabold tracking-tight">{profile.name}</h1>
            {profile.username && (
              <p className="text-primary font-mono font-semibold text-base mt-1">@{profile.username}</p>
            )}
            <p className="text-slate-500 text-sm mt-0.5">{profile.email}</p>
            {/* Country + phone in view mode under email */}
            {!editing && (profile.country || profile.phone) && (
              <div className="flex items-center gap-3 mt-1.5 flex-wrap justify-center">
                {profile.country && (
                  <span className="text-slate-500 text-xs flex items-center gap-1">
                    <span className="material-symbols-outlined text-slate-600 text-sm">location_on</span>
                    {profile.country}
                  </span>
                )}
                {profile.phone && (
                  <span className="text-slate-500 text-xs flex items-center gap-1">
                    <span className="material-symbols-outlined text-slate-600 text-sm">phone</span>
                    {profile.phone}
                  </span>
                )}
              </div>
            )}

            {/* Edit / Cancel toggle */}
            {!editing ? (
              <button
                onClick={startEdit}
                className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                <span className="material-symbols-outlined text-base">edit</span>
                Edit profile
              </button>
            ) : (
              <button
                onClick={cancelEdit}
                className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors"
              >
                <span className="material-symbols-outlined text-base">close</span>
                Cancel
              </button>
            )}
          </div>

          {/* ── VIEW MODE — stat grid ── */}
          {!editing && (
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: 'calendar_today', label: 'Age',    value: profile.age,    sub: 'years old'   },
                { icon: 'monitor_heart',  label: 'BMI',    value: bmi || '—',     sub: bmiInfo?.label || '—', subColor: bmiInfo?.color },
                { icon: 'height',         label: 'Height', value: profile.height, sub: profile.unit_system === 'imperial' ? 'inches' : 'centimetres' },
                { icon: 'monitor_weight', label: 'Weight', value: profile.weight, sub: profile.unit_system === 'imperial' ? 'pounds' : 'kilograms'   },
              ].map(s => (
                <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    <span className="material-symbols-outlined text-primary text-base">{s.icon}</span>
                    {s.label}
                  </div>
                  <p className="text-white text-3xl font-extrabold font-mono mt-1">{s.value}</p>
                  <p className={`text-xs font-semibold ${s.subColor || 'text-slate-600'}`}>{s.sub}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── EDIT MODE — inline form ── */}
          {editing && (
            <div className="bg-slate-900 border border-primary/30 rounded-xl p-5 space-y-5">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">edit</span>
                Edit your metrics
              </p>

              {/* Age */}
              <div className="flex flex-col gap-1">
                <label className="text-slate-300 text-sm font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">calendar_today</span>
                  Age
                </label>
                <input
                  type="number" min="13" max="120"
                  value={draft.age}
                  onChange={setDraftField('age')}
                  placeholder="e.g. 27"
                  className={inputCls(errors.age)}
                />
                <FieldError message={errors.age} />
              </div>

              {/* Height + Weight */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-300 text-sm font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-base">height</span>
                    Height
                  </label>
                  <div className="relative">
                    <input
                      type="number" min="0"
                      value={draft.height}
                      onChange={setDraftField('height')}
                      placeholder={profile.unit_system === 'imperial' ? '69' : '175'}
                      className={`${inputCls(errors.height)} pr-10`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">{profile.unit_system === 'imperial' ? 'in' : 'cm'}</span>
                  </div>
                  <FieldError message={errors.height} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-300 text-sm font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-base">monitor_weight</span>
                    Weight
                  </label>
                  <div className="relative">
                    <input
                      type="number" min="0"
                      value={draft.weight}
                      onChange={setDraftField('weight')}
                      placeholder={profile.unit_system === 'imperial' ? '154' : '70'}
                      className={`${inputCls(errors.weight)} pr-10`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">{profile.unit_system === 'imperial' ? 'lb' : 'kg'}</span>
                  </div>
                  <FieldError message={errors.weight} />
                </div>
              </div>

              {/* Live BMI preview */}
              {bmi && bmiInfo && (
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-xs font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-primary text-sm">calculate</span>
                      Live BMI preview
                    </span>
                    <span className={`text-lg font-extrabold font-mono ${bmiInfo.color}`}>{bmi}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${bmiInfo.bar}`} style={{ width: `${bmiInfo.pct}%` }} />
                  </div>
                  <p className="text-slate-500 text-xs mt-1">{bmiInfo.label}</p>
                </div>
              )}

              {/* Activity level */}
              <div className="flex flex-col gap-2">
                <label className="text-slate-300 text-sm font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">directions_run</span>
                  Activity Level
                </label>
                {Object.entries(ACTIVITY_MAP).map(([value, opt]) => (
                  <label
                    key={value}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      draft.activity === value
                        ? 'border-primary bg-primary/10'
                        : 'border-slate-800 bg-slate-900/50 hover:border-primary/40'
                    }`}
                    onClick={() => setDraft(d => ({ ...d, activity: value }))}
                  >
                    <span className="text-xl">{opt.emoji}</span>
                    <div className="flex-1">
                      <p className="text-slate-100 text-sm font-bold">{opt.label}</p>
                      <p className="text-slate-500 text-xs">{opt.sub}</p>
                    </div>
                    <span className={`material-symbols-outlined text-primary text-base transition-opacity ${draft.activity === value ? 'opacity-100' : 'opacity-0'}`}>
                      check_circle
                    </span>
                  </label>
                ))}
              </div>

              {/* Country — searchable dropdown */}
              <div className="flex flex-col gap-1">
                <label className="text-slate-300 text-sm font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">location_on</span>
                  Country <span className="text-slate-600 font-normal text-xs">(optional)</span>
                </label>
                <div className="relative" ref={countryRef}>
                  <div className="relative">
                    <input
                      type="text"
                      value={countryOpen ? countrySearch : draft.country}
                      onChange={(e) => {
                        setCountrySearch(e.target.value)
                        setCountryIdx(-1)
                        if (!countryOpen) setCountryOpen(true)
                      }}
                      onFocus={() => {
                        setCountrySearch('')
                        setCountryOpen(true)
                        setCountryIdx(-1)
                      }}
                      onKeyDown={(e) => {
                        if (!countryOpen) return
                        if (e.key === 'ArrowDown') {
                          e.preventDefault()
                          setCountryIdx(i => Math.min(i + 1, filteredCountries.length - 1))
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault()
                          setCountryIdx(i => Math.max(i - 1, 0))
                        } else if (e.key === 'Enter' && countryIdx >= 0) {
                          e.preventDefault()
                          setDraft(d => ({ ...d, country: filteredCountries[countryIdx] }))
                          setCountryOpen(false)
                          setCountrySearch('')
                          if (errors.country) setErrors(er => ({ ...er, country: '' }))
                        } else if (e.key === 'Escape') {
                          setCountryOpen(false)
                          setCountrySearch('')
                        }
                      }}
                      placeholder="Search country…"
                      autoComplete="off"
                      className={inputCls(errors.country)}
                    />
                    {draft.country && !countryOpen && (
                      <button
                        type="button"
                        onClick={() => {
                          setDraft(d => ({ ...d, country: '' }))
                          setCountrySearch('')
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    )}
                  </div>
                  {countryOpen && (
                    <ul
                      ref={countryListRef}
                      className="absolute z-50 w-full mt-1 max-h-52 overflow-y-auto bg-slate-800 border border-slate-700 rounded-xl shadow-xl"
                    >
                      {filteredCountries.length === 0 ? (
                        <li className="px-4 py-3 text-slate-500 text-sm">No results</li>
                      ) : (
                        filteredCountries.map((c, i) => (
                          <li
                            key={c}
                            onMouseDown={() => {
                              setDraft(d => ({ ...d, country: c }))
                              setCountryOpen(false)
                              setCountrySearch('')
                              if (errors.country) setErrors(er => ({ ...er, country: '' }))
                            }}
                            onMouseEnter={() => setCountryIdx(i)}
                            className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                              i === countryIdx
                                ? 'bg-primary/20 text-white'
                                : 'text-slate-300 hover:bg-slate-700/50'
                            } ${(c === 'United States' || c === 'India') && i < 2 ? 'font-semibold' : ''}`}
                          >
                            {c}
                            {i === 1 && <hr className="border-slate-700 mt-2.5 -mx-4" />}
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>
                <FieldError message={errors.country} />
              </div>

              {/* Phone number */}
              <div className="flex flex-col gap-1">
                <label className="text-slate-300 text-sm font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">phone</span>
                  Phone Number <span className="text-slate-600 font-normal text-xs">(optional)</span>
                </label>
                <input
                  type="tel"
                  value={draft.phone}
                  onChange={(e) => {
                    setDraft(d => ({ ...d, phone: e.target.value }))
                    if (errors.phone) setErrors(er => ({ ...er, phone: '' }))
                  }}
                  placeholder="+1 555 000 0000"
                  className={inputCls(errors.phone)}
                />
                <FieldError message={errors.phone} />
              </div>

              {/* Save button */}
              <button
                onClick={saveEdit}
                disabled={saving}
                className="w-full h-13 py-3.5 bg-primary hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-bold text-base shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
                    Saving changes…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-xl">save</span>
                    Save changes
                  </>
                )}
              </button>
            </div>
          )}

          {/* Daily calorie goal — updates live in edit mode */}
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
                <span className="material-symbols-outlined text-primary text-base">local_fire_department</span>
                Daily Calorie Goal
                {editing && <span className="text-primary text-xs normal-case font-normal italic">— updating live</span>}
              </div>
              <p className="text-white text-4xl font-extrabold font-mono">{calories != null ? calories.toLocaleString() : '—'}</p>
              <p className="text-slate-500 text-xs mt-1">kcal / day · calculated for your profile</p>
            </div>
            <div className="w-16 h-16 rounded-full border-4 border-primary/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-3xl">bolt</span>
            </div>
          </div>

          {/* Activity level — view mode only */}
          {!editing && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-2xl flex-shrink-0">
                {actInfo.emoji}
              </div>
              <div>
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-0.5">Activity Level</p>
                <p className="text-white text-lg font-bold">{actInfo.label}</p>
                <p className="text-slate-500 text-xs">{actInfo.sub}</p>
              </div>
              <span className="material-symbols-outlined text-primary ml-auto">check_circle</span>
            </div>
          )}

          {/* Save error */}
          {errors.save && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <span className="material-symbols-outlined text-red-400">warning</span>
              <p className="text-red-400 text-sm font-semibold">{errors.save}</p>
            </div>
          )}

          {/* CTA */}
          {!editing && (
            <a
              href="/dashboard"
              className="w-full h-14 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold text-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 group"
            >
              Go to my Dashboard
              <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span>
            </a>
          )}

        </div>
        )}
      </main>

      <footer className="py-6 px-6 text-center">
        <p className="text-slate-700 text-xs">© {new Date().getFullYear()} Healtho. All rights reserved.</p>
      </footer>
    </div>
  )
}
