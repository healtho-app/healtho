import { Link } from 'react-router-dom'
import BackgroundMedia from './BackgroundMedia'

const benefits = [
  {
    number: '01',
    title: 'Lose weight with clarity',
    desc: 'Know exactly where your calories come from. No more guessing — just data-backed decisions that lead to real results.',
  },
  {
    number: '02',
    title: 'Build healthy habits',
    desc: 'Our streak system and daily reminders help you stay consistent. Small daily actions compound into lasting change.',
  },
  {
    number: '03',
    title: 'Understand your nutrition',
    desc: 'Go beyond calories. See your macro split, hydration levels, and patterns over time to truly understand what your body needs.',
  },
]

export default function BenefitsSection() {
  return (
    <section id="benefits-section" className="relative py-24 overflow-hidden">
      {/* Video background — z-0 */}
      <BackgroundMedia
        type="video"
        src="/benefits-bg.mp4"
        poster="/benefits-poster.jpg"
        opacity={0.7}
      />

      {/* Content — z-10, above overlay */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-cyan mb-3 block">Benefits</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Built for your goals</h2>
          <p className="text-white max-w-lg mx-auto">
            Whether you're losing weight, building muscle, or just eating smarter — Healtho adapts to you.
          </p>
        </div>

        {/* Benefits list */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {benefits.map(({ number, title, desc }) => (
            <div key={number} className="relative">
              <span className="text-5xl font-bold text-white/[0.06] absolute -top-4 -left-2 select-none">{number}</span>
              <div className="relative pt-6 pl-2">
                <h3 className="text-xl font-semibold text-white mb-3">{title}</h3>
                <p className="text-sm text-white leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-20 text-center">
          <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">Ready to take control?</h3>
          <p className="text-white mb-6 max-w-md mx-auto">
            Start tracking smarter today. Free forever — no credit card required.
          </p>
          <Link
            to="/register"
            className="inline-block bg-brand-gradient text-white font-semibold px-8 py-3.5 rounded-full hover:opacity-90 transition-all duration-200 shadow-lg shadow-primary/25 hover:-translate-y-0.5"
          >
            Get Started Free
          </Link>
        </div>
      </div>
    </section>
  )
}
