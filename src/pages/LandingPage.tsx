/**
 * src/pages/LandingPage.tsx
 * Independent Landing Page — /
 * Renders the public landing view with health plans and onboarding CTA buttons.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import PublicLanding from '../components/PublicLanding';
import { InsurancePlan } from '../types';

interface LandingPageProps {
  plans: InsurancePlan[];
}

export default function LandingPage({ plans }: LandingPageProps) {
  const navigate = useNavigate();

  return (
    <PublicLanding
      plans={plans}
      onOpenAuth={() => navigate('/register')}
    />
  );
}
