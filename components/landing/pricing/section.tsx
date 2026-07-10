import { Container } from '@/components/ui/container';
import { PricingPlanClient } from './pricing-plans-client';

export function PricingSection() {
  const proMonthlyPrice = 25;

  return (
    <section id="pricing" className="py-12 desktop:py-20">
      <Container>
        <PricingPlanClient proMonthlyPrice={proMonthlyPrice} />
      </Container>
    </section>
  );
}
