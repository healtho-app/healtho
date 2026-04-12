import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function StatsBar() {
  const [userCount, setUserCount] = useState(null)

  useEffect(() => {
    async function fetchCount() {
      const { data, error } = await supabase.rpc('get_user_count')
      if (!error && typeof data === 'number') setUserCount(data)
    }
    fetchCount()
  }, [])

  const stats = [
    { value: userCount != null ? userCount.toLocaleString() : '—', label: 'Active Users' },
    { value: '—/5',  label: 'User Rating' },
    { value: '—',    label: 'Meals Tracked' },
  ]

  return (
    <div className="flex items-center gap-8 sm:gap-12 mt-12">
      {stats.map(({ value, label }, i) => (
        <div key={label} className="flex items-center gap-8 sm:gap-12">
          {i > 0 && <div className="w-px h-8 bg-white/10 -ml-4 sm:-ml-6" />}
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-white">{value}</div>
            <div className="text-xs sm:text-sm text-white mt-0.5">{label}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
