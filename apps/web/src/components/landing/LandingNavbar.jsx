import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

const navLinks = [
  { label: 'Features', to: '/features' },
  { label: 'Benefits', to: '/benefits' },
  { label: 'Pricing',  to: '/pricing' },
]

export default function LandingNavbar() {
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/60 border-b border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 flex items-center justify-between h-16">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
          <img src="/healtho-icon.svg" alt="Healtho" className="w-9 h-9 rounded-xl" />
          <div className="flex flex-col leading-none">
            <span className="text-xl font-bold tracking-tight text-brand-gradient whitespace-nowrap">Healtho</span>
            <span className="text-[9px] uppercase tracking-[0.2em] text-white font-medium hidden sm:block">Nutrition & Fitness</span>
          </div>
        </Link>

        {/* Center nav links — hidden on mobile */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map(({ label, to }) => (
            <Link
              key={to}
              to={to}
              className={`text-sm font-medium transition-colors duration-200 ${
                pathname === to
                  ? 'text-white'
                  : 'text-white hover:text-white'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="text-sm font-semibold text-white hover:text-white transition-colors duration-200 hidden sm:block"
          >
            Log In
          </Link>
          <Link
            to="/register"
            className="bg-brand-gradient text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity duration-200 shadow-lg shadow-primary/20"
          >
            Get Started Free
          </Link>

          {/* Hamburger — visible below md */}
          <button
            onClick={() => setMenuOpen(prev => !prev)}
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg hover:bg-white/[0.06] transition-colors"
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined text-white text-2xl">
              {menuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/[0.06] bg-black/80 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-3">
            {navLinks.map(({ label, to }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMenuOpen(false)}
                className="text-sm font-medium text-white py-2"
              >
                {label}
              </Link>
            ))}
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="text-sm font-semibold text-white py-2 sm:hidden"
            >
              Log In
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
