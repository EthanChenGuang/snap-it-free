import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AppThemeProvider } from '@/components/providers/AppThemeProvider';
import { AppSerwistProvider } from '@/components/providers/SerwistProvider';
import { FavoritesMergeProvider } from '@/components/providers/FavoritesMergeProvider';
import { PwaOnboardingProvider } from '@/components/providers/PwaOnboardingProvider';
import { AppChrome } from '@/components/shell/AppChrome';
import { Toaster } from '@/components/ui/toaster';
import { APPEARANCE_INIT_SCRIPT } from '@/lib/settings/resolve-appearance';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: '手慢无 — Map Explorer',
  description: 'Venice free finds on a map',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: APPEARANCE_INIT_SCRIPT }} />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
          rel="stylesheet"
        />
      </head>
      <body
        className="overflow-hidden bg-background text-on-background"
        suppressHydrationWarning
      >
        <AppThemeProvider>
          <AppSerwistProvider>
            <FavoritesMergeProvider>
              <PwaOnboardingProvider>
                <AppChrome>
                  {children}
                </AppChrome>
                <Toaster />
              </PwaOnboardingProvider>
            </FavoritesMergeProvider>
          </AppSerwistProvider>
        </AppThemeProvider>
      </body>
    </html>
  );
}
