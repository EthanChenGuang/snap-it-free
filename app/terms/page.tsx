import type { Metadata } from 'next';
import { TermsPageClient } from '@/components/terms/TermsPageClient';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'ZeroDollar terms of service.',
};

export default function TermsPage() {
  return <TermsPageClient />;
}
