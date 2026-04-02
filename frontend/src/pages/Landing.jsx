import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import LandingNavbar from '../components/landing/LandingNavbar'
import HeroSection from '../components/landing/HeroSection'
import FeaturesSection from '../components/landing/FeaturesSection'
import BenefitsSection from '../components/landing/BenefitsSection'
import PricingSection from '../components/landing/PricingSection'
import Footer from '../components/landing/Footer'

export default function Landing() {
  const { pathname } = useLocation()

  // Scroll to the corresponding section when navigating to /features, /benefits, /pricing
  useEffect(() => {
    const sectionMap = {
      '/features': 'features-section',
      '/benefits': 'benefits-section',
      '/pricing':  'pricing-section',
    }
    const targetId = sectionMap[pathname]
    if (targetId) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        const el = document.getElementById(targetId)
        if (el) el.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } else {
      window.scrollTo(0, 0)
    }
  }, [pathname])

  return (
    <div className="min-h-screen bg-background-dark">
      <LandingNavbar />
      <HeroSection />
      <FeaturesSection />
      <BenefitsSection />
      <PricingSection />
      <Footer />
    </div>
  )
}
