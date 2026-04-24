import { Link } from 'react-router-dom'
import BackgroundMedia from './BackgroundMedia'
import DashboardPreview from './DashboardPreview'
import StatsBar from './StatsBar'

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
      {/* Video background — z-0 */}
      <BackgroundMedia
        type="video"
        src="/hero-bg.mp4"
        poster="/hero-poster.jpg"
        opacity={0.7}
      />

      {/* Content — z-10, above overlay */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 w-full">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-20">
          {/* Left — copy */}
          <div className="flex-1 max-w-xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/[0.08] border border-white/[0.12] rounded-full px-4 py-1.5 mb-6 backdrop-blur-sm landing-fade-up">
              <span className="text-base">🚀</span>
              <span className="text-xs font-medium text-brand-cyan tracking-wide">Now Available for Web</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight mb-5 landing-fade-up landing-delay-1">
              Your Complete{' '}
              <span className="text-brand-gradient">Health & Fitness</span>{' '}
              Platform
            </h1>

            {/* Subheadline */}
            <p className="text-base sm:text-lg text-white leading-relaxed mb-8 max-w-md landing-fade-up landing-delay-2">
              Track calories, monitor nutrition, and achieve your fitness goals with intelligent insights and personalized recommendations.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 landing-fade-up landing-delay-3">
              <Link
                to="/register"
                className="bg-brand-gradient text-white font-semibold px-7 py-3.5 rounded-full hover:opacity-90 transition-all duration-200 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
              >
                Start Your Journey
              </Link>
            </div>

            {/* Stats */}
            <div className="landing-fade-up landing-delay-4">
              <StatsBar />
            </div>
          </div>

          {/* Right — dashboard preview */}
          <div className="flex-shrink-0 landing-fade-up landing-delay-2 hidden md:block">
            <DashboardPreview />
          </div>
        </div>
      </div>
    </section>
  )
}
