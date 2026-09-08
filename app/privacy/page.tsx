import type { Metadata } from 'next';
import { PrivacyPageClient } from '@/components/privacy/PrivacyPageClient';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'ZeroDollar privacy policy — how we collect and use your information.',
};

export default function PrivacyPage() {
  return <PrivacyPageClient />;
}
