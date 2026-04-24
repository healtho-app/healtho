import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.06] py-10">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <img src="/healtho-icon.svg" alt="Healtho" className="w-6 h-6 rounded-lg" />
          <span className="text-sm text-white">
            &copy; {new Date().getFullYear()} Healtho. All rights reserved.
          </span>
        </div>
        <div className="flex items-center gap-6 text-sm text-white">
          <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
          <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
        </div>
      </div>
    </footer>
  )
}
