import BackgroundMedia from './BackgroundMedia'

const features = [
  {
    icon: 'restaurant',
    title: 'Calorie Tracking',
    desc: 'Log meals in seconds with our smart food database. Track breakfast, lunch, dinner, and snacks effortlessly.',
  },
  {
    icon: 'monitoring',
    title: 'Macro Breakdown',
    desc: 'See your protein, carbs, and fat at a glance. Understand exactly what fuels your body every day.',
  },
  {
    icon: 'local_fire_department',
    title: 'Streak System',
    desc: 'Build consistency with daily streaks. Stay motivated and never miss a day of logging.',
  },
  {
    icon: 'water_drop',
    title: 'Water Intake',
    desc: 'Track your hydration with a simple tap. Hit your daily water goal and feel the difference.',
  },
  {
    icon: 'calendar_month',
    title: 'Historical Logs',
    desc: 'Navigate through 30 days of food history. Review past meals and spot patterns over time.',
  },
  {
    icon: 'person',
    title: 'Smart Profile',
    desc: 'Personalized calorie goals based on your age, weight, height, and activity level.',
  },
]

export default function FeaturesSection() {
  return (
    <section id="features-section" className="relative py-24 overflow-hidden">
      {/* Image background — z-0 */}
      <BackgroundMedia
        type="image"
        src="/features-bg.jpg"
        opacity={0.6}
      />

      {/* Content — z-10, above overlay */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-3 block">Features</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Everything you need to stay on track</h2>
          <p className="text-white max-w-lg mx-auto">
            Powerful tools designed to make nutrition tracking simple, insightful, and actually enjoyable.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ icon, title, desc }) => (
            <div
              key={title}
              className="group bg-black/40 backdrop-blur-md border border-white/[0.08] rounded-2xl p-6 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center mb-4 group-hover:bg-primary/25 transition-colors duration-300">
                <span className="material-symbols-outlined text-primary text-xl">{icon}</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-white leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
