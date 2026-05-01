import { Link } from 'react-router-dom'
import { MaterialIcon } from '@healtho/ui'

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    desc: 'Everything you need to start tracking.',
    features: [
      'Unlimited food logging',
      'Calorie & macro tracking',
      'Water intake tracker',
      'Daily streaks',
      '30-day food history',
      'Smart profile & goals',
    ],
    cta: 'Get Started',
    to: '/register',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$4.99',
    period: '/month',
    desc: 'Advanced insights for serious results.',
    features: [
      'Everything in Free',
      'USDA food database (8,000+ foods)',
      'Custom food creation',
      'Weekly progress reports',
      'Export data (CSV)',
      'Priority support',
    ],
    cta: 'Coming Soon',
    to: null,
    highlight: true,
    badge: 'Most Popular',
  },
  {
    name: 'Team',
    price: '$9.99',
    period: '/month',
    desc: 'For coaches, families, and groups.',
    features: [
      'Everything in Pro',
      'Up to 10 member accounts',
      'Coach dashboard',
      'Shared meal plans',
      'Team challenges',
      'Admin controls',
    ],
    cta: 'Coming Soon',
    to: null,
    highlight: false,
  },
]

export default function PricingSection() {
  return (
    <section id="pricing-section" className="py-24 relative">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand-pink/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 lg:px-10 relative">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-pink mb-3 block">Pricing</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Start free. Upgrade when you're ready.</h2>
          <p className="text-white max-w-lg mx-auto">
            No hidden fees, no trials. The free plan gives you everything you need.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {plans.map(({ name, price, period, desc, features, cta, to, highlight, badge }) => (
            <div
              key={name}
              className={`relative rounded-2xl p-6 flex flex-col ${
                highlight
                  ? 'bg-surface border-2 border-primary/40 shadow-lg shadow-primary/10'
                  : 'bg-surface border border-white/[0.06]'
              }`}
            >
              {badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-gradient text-white text-xs font-semibold px-4 py-1 rounded-full">
                  {badge}
                </div>
              )}

              <div className="mb-5">
                <h3 className="text-lg font-semibold text-white mb-1">{name}</h3>
                <p className="text-xs text-white">{desc}</p>
              </div>

              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold text-white">{price}</span>
                <span className="text-sm text-white">{period}</span>
              </div>

              <ul className="flex-1 space-y-3 mb-6">
                {features.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-white">
                    <MaterialIcon name="check_circle" size={16} className="text-primary mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              {to ? (
                <Link
                  to={to}
                  className={`text-center font-semibold py-3 rounded-full transition-all duration-200 ${
                    highlight
                      ? 'bg-brand-gradient text-white hover:opacity-90 shadow-lg shadow-primary/20'
                      : 'border border-white/[0.1] text-white hover:bg-white/[0.04]'
                  }`}
                >
                  {cta}
                </Link>
              ) : (
                <button
                  disabled
                  className={`text-center font-semibold py-3 rounded-full transition-all duration-200 opacity-50 cursor-not-allowed ${
                    highlight
                      ? 'bg-brand-gradient text-white'
                      : 'border border-white/[0.1] text-white'
                  }`}
                >
                  {cta}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
