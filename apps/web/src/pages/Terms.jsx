import { Link } from 'react-router-dom'
import { MaterialIcon } from '@healtho/ui'
import Header from '../components/Header'

const SECTIONS = [
  {
    title: 'Acceptance of Terms',
    body: `By creating an account or using Healtho, you agree to be bound by these Terms of Service. If you do not agree, please do not use the app.`,
  },
  {
    title: 'Use of the Service',
    body: `Healtho is a personal health and nutrition tracking tool. You agree to use it only for lawful purposes and in accordance with these terms. You must be at least 13 years of age to use Healtho.`,
  },
  {
    title: 'Your Account',
    body: `You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. Notify us immediately at support@healtho.app if you suspect any unauthorised use.`,
  },
  {
    title: 'Health Disclaimer',
    body: `Healtho provides general nutrition and calorie information for informational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider before making changes to your diet or exercise routine.`,
  },
  {
    title: 'User Content',
    body: `Any data you log (meals, weight, activity) is yours. You grant Healtho a limited licence to store and display that data solely to provide you with the service. We do not sell your personal data.`,
  },
  {
    title: 'Prohibited Conduct',
    body: `You may not attempt to reverse-engineer, scrape, or disrupt the service; create accounts by automated means; or use the service to distribute spam or malware.`,
  },
  {
    title: 'Intellectual Property',
    body: `All content, design, logos, and code that make up Healtho are owned by or licenced to Healtho. You may not reproduce or distribute them without written permission.`,
  },
  {
    title: 'Termination',
    body: `We reserve the right to suspend or terminate accounts that violate these terms or that have been inactive for an extended period, with or without notice.`,
  },
  {
    title: 'Limitation of Liability',
    body: `To the maximum extent permitted by law, Healtho and its owners shall not be liable for any indirect, incidental, or consequential damages arising out of your use of the service.`,
  },
  {
    title: 'Changes to These Terms',
    body: `We may update these Terms from time to time. We will notify you of material changes via email or an in-app notice. Continued use of Healtho after changes constitutes acceptance of the new terms.`,
  },
  {
    title: 'Contact',
    body: `Questions about these Terms? Email us at support@healtho.app.`,
  },
]

export default function Terms() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 px-4 py-12">
        <div className="w-full max-w-[720px] mx-auto">

          {/* Heading */}
          <div className="mb-10">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-4">
              <MaterialIcon name="gavel" size={16} className="text-primary" />
              <span className="text-primary text-xs font-bold uppercase tracking-wider">Legal</span>
            </div>
            <h1 className="text-white text-4xl font-extrabold leading-tight tracking-tight">
              Terms of Service
            </h1>
            <p className="text-slate-400 text-base mt-2">
              Last updated: March 2025 · Effective immediately
            </p>
          </div>

          {/* Intro */}
          <p className="text-slate-400 text-base leading-relaxed mb-10 p-5 bg-slate-900 border border-slate-800 rounded-xl">
            Please read these terms carefully before using Healtho. They govern your access to and use of our app and services.
          </p>

          {/* Sections */}
          <div className="space-y-6">
            {SECTIONS.map((s, i) => (
              <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="flex items-start gap-3 mb-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <h2 className="text-white text-lg font-bold">{s.title}</h2>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed pl-10">{s.body}</p>
              </div>
            ))}
          </div>

          {/* Back link */}
          <div className="mt-12 text-center">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 text-primary text-sm font-semibold hover:underline"
            >
              <MaterialIcon name="arrow_back" size={16} />
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
