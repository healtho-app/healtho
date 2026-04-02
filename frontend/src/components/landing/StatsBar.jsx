const stats = [
  { value: '\u2014',    label: 'Active Users' },
  { value: '\u2014/5',  label: 'User Rating' },
  { value: '\u2014',    label: 'Meals Tracked' },
]

export default function StatsBar() {
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
