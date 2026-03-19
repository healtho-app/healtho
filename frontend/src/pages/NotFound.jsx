import { Link } from 'react-router-dom'
import Header from '../components/Header'

export default function NotFound() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header rightLabel="Go to Dashboard" rightTo="/dashboard" rightIcon="dashboard" />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[520px] text-center">

          {/* Big 404 */}
          <p className="text-[120px] font-extrabold leading-none text-slate-800 select-none">
            404
          </p>

          {/* Icon */}
          <div className="flex justify-center mb-6 -mt-4">
            <div className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-4xl">search_off</span>
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-white text-3xl font-extrabold tracking-tight">
            Page not found
          </h1>
          <p className="text-slate-400 text-base mt-3 leading-relaxed">
            The page you're looking for doesn't exist or has been moved.
            Let's get you back on track.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col gap-3 mt-10">
            <Link
              to="/dashboard"
              className="w-full h-14 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold text-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 group"
            >
              <span className="material-symbols-outlined">home</span>
              Go to Dashboard
            </Link>
            <Link
              to="/login"
              className="w-full h-12 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-base transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-xl">login</span>
              Back to Login
            </Link>
          </div>

          {/* Quick links */}
          <div className="mt-10 p-4 bg-slate-900 border border-slate-800 rounded-xl text-left">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-3">Quick links</p>
            <div className="flex flex-col gap-2">
              {[
                { to: '/dashboard', icon: 'dashboard',  label: 'Dashboard' },
                { to: '/login',     icon: 'login',       label: 'Log In' },
                { to: '/register',  icon: 'person_add',  label: 'Create Account' },
                { to: '/profile',   icon: 'person',      label: 'My Profile' },
              ].map(({ to, icon, label }) => (
                <Link
                  key={to} to={to}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors group"
                >
                  <span className="material-symbols-outlined text-primary text-base">{icon}</span>
                  <span className="text-slate-300 text-sm font-semibold group-hover:text-white transition-colors">{label}</span>
                  <span className="material-symbols-outlined text-slate-700 text-sm ml-auto group-hover:text-slate-500 transition-colors">arrow_forward</span>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </main>

      <footer className="py-6 px-6 text-center">
        <p className="text-slate-700 text-xs">© 2025 Healtho. All rights reserved.</p>
      </footer>
    </div>
  )
}
