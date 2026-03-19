import { Link } from 'react-router-dom'

export default function Header({ rightLabel, rightTo, rightIcon = 'arrow_forward' }) {
  return (
    <header className="flex items-center justify-between border-b border-slate-800 px-6 py-4 lg:px-10">
      <Link to="/dashboard" className="flex items-center gap-2">
        <span className="text-2xl">🍎</span>
        <h2 className="text-white text-xl font-bold tracking-tight">Healtho</h2>
      </Link>
      {rightLabel && rightTo && (
        <Link to={rightTo} className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
          {rightLabel}
          <span className="material-symbols-outlined text-base">{rightIcon}</span>
        </Link>
      )}
    </header>
  )
}
