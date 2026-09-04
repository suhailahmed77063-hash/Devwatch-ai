import { LandingNav } from "@/components/landing/landing-nav";
import { LandingHero } from "@/components/landing/landing-hero";
import {
  FeaturesSection,
  HowItWorksSection,
  TemplatesSection,
  AiShowcaseSection,
  PricingSection,
  TestimonialsSection,
  FinalCtaSection,
  LandingFooter,
} from "@/components/landing/sections";

export default function LandingPage() {
  return (
    <main className="bg-ink">
      <LandingNav />
      <LandingHero />
      <FeaturesSection />
      <HowItWorksSection />
      <TemplatesSection />
      <AiShowcaseSection />
      <PricingSection />
      <TestimonialsSection />
      <FinalCtaSection />
      <LandingFooter />
    </main>
  );
}
