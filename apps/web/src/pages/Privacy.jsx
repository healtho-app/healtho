import { Link } from 'react-router-dom'
import Header from '../components/Header'

const SECTIONS = [
  {
    icon: 'database',
    title: 'What We Collect',
    body: `When you register, we collect your name, email address, and the health metrics you provide (age, height, weight, activity level). As you use the app, we store the food and drink entries you log, along with dates and quantities.`,
  },
  {
    icon: 'health_and_safety',
    title: 'How We Use Your Data',
    body: `Your data is used solely to provide and improve the Healtho service — calculating your calorie goals, displaying your nutrition history, and personalising your dashboard. We do not use your health data for advertising purposes.`,
  },
  {
    icon: 'share',
    title: 'Data Sharing',
    body: `We do not sell, rent, or trade your personal information to third parties. We use Supabase as our database and authentication provider, and Brevo for transactional emails (OTP, password reset). These providers are bound by their own privacy policies and process your data only on our behalf.`,
  },
  {
    icon: 'lock',
    title: 'Data Security',
    body: `All data is stored in a Supabase PostgreSQL database with row-level security enabled. Connections are encrypted with TLS. Passwords are never stored in plain text — authentication is handled by Supabase Auth.`,
  },
  {
    icon: 'cookie',
    title: 'Cookies & Local Storage',
    body: `Healtho uses browser local storage and session cookies strictly to maintain your logged-in session. We do not use tracking cookies or third-party analytics cookies.`,
  },
  {
    icon: 'manage_accounts',
    title: 'Your Rights',
    body: `You can edit or delete your profile data at any time from the Profile page. To permanently delete your account and all associated data, email us at support@healtho.app and we will process your request within 30 days.`,
  },
  {
    icon: 'child_care',
    title: 'Children\'s Privacy',
    body: `Healtho is not intended for children under 13. We do not knowingly collect personal information from children. If you believe a child has provided us data, contact us and we will delete it promptly.`,
  },
  {
    icon: 'update',
    title: 'Changes to This Policy',
    body: `We may update this Privacy Policy as our practices evolve. We will notify you of material changes via email or an in-app notice at least 7 days before they take effect.`,
  },
  {
    icon: 'mail',
    title: 'Contact Us',
    body: `If you have questions or concerns about how we handle your data, email us at support@healtho.app. We aim to respond within 5 business days.`,
  },
]

export default function Privacy() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 px-4 py-12">
        <div className="w-full max-w-[720px] mx-auto">

          {/* Heading */}
          <div className="mb-10">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-4">
              <span className="material-symbols-outlined text-primary text-base">shield</span>
              <span className="text-primary text-xs font-bold uppercase tracking-wider">Legal</span>
            </div>
            <h1 className="text-white text-4xl font-extrabold leading-tight tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-slate-400 text-base mt-2">
              Last updated: March 2025 · Effective immediately
            </p>
          </div>

          {/* Intro */}
          <p className="text-slate-400 text-base leading-relaxed mb-10 p-5 bg-slate-900 border border-slate-800 rounded-xl">
            Your privacy matters to us. This policy explains what data Healtho collects, why we collect it, and how we protect it. We will never sell your personal data.
          </p>

          {/* Sections */}
          <div className="space-y-6">
            {SECTIONS.map((s, i) => (
              <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mt-0.5">
                    <span className="material-symbols-outlined text-primary text-lg">{s.icon}</span>
                  </div>
                  <h2 className="text-white text-lg font-bold pt-1">{s.title}</h2>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed pl-12">{s.body}</p>
              </div>
            ))}
          </div>

          {/* Back link */}
          <div className="mt-12 text-center">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 text-primary text-sm font-semibold hover:underline"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              Back to registration
            </Link>
          </div>
        </div>
      </main>

      <footer className="py-6 px-6 text-center">
        <p className="text-slate-700 text-xs">© {new Date().getFullYear()} Healtho. All rights reserved.</p>
      </footer>
    </div>
  )
}
