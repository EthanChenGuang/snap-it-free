import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { InlineScript } from '@/components/InlineScript';
import { getMessages } from '@/messages';
import { getSiteUrl } from '@/lib/listings/listing-metadata';
import { BrowseCenterProvider } from '@/lib/browse-center/context';
import { AppThemeProvider } from '@/components/providers/AppThemeProvider';
import { AppSerwistProvider } from '@/components/providers/SerwistProvider';
import { FavoritesMergeProvider } from '@/components/providers/FavoritesMergeProvider';
import { PwaOnboardingProvider } from '@/components/providers/PwaOnboardingProvider';
import { AppChrome } from '@/components/shell/AppChrome';
import { DocumentLang } from '@/components/shell/DocumentLang';
import { AuthErrorFromUrl } from '@/components/auth/AuthErrorFromUrl';
import { Toaster } from '@/components/ui/toaster';
import { APPEARANCE_INIT_SCRIPT } from '@/lib/settings/resolve-appearance';
import { SUPPRESS_REACT_DEVTOOLS_SUSPENSE_WARNING_SCRIPT } from '@/lib/dev/suppress-react-devtools-suspense-warning-script';
import { DEV_UNREGISTER_SW_SCRIPT } from '@/lib/pwa/dev-unregister-sw-script';
import './globals.css';
import './theme-dark.css';

const isDev = process.env.NODE_ENV === 'development';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const defaultMessages = getMessages('zh');

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: defaultMessages.app.title,
  description: defaultMessages.app.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh" className={inter.variable} suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
          rel="stylesheet"
        />
        <link rel="dns-prefetch" href="https://images.sbito.it" />
        <link rel="preconnect" href="https://images.sbito.it" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://images1.vinted.net" />
        <link rel="preconnect" href="https://images1.vinted.net" crossOrigin="anonymous" />
      </head>
      <body
        className="overflow-hidden bg-background text-on-background"
        suppressHydrationWarning
      >
        {isDev ? (
          <>
            <InlineScript
              id="dev-suppress-react-devtools-suspense"
              html={SUPPRESS_REACT_DEVTOOLS_SUSPENSE_WARNING_SCRIPT}
            />
            <InlineScript id="dev-unregister-sw" html={DEV_UNREGISTER_SW_SCRIPT} />
          </>
        ) : null}
        <InlineScript id="appearance-init" html={APPEARANCE_INIT_SCRIPT} />
        <AppThemeProvider>
          <BrowseCenterProvider>
            <DocumentLang />
            <AppSerwistProvider>
              <FavoritesMergeProvider>
                <PwaOnboardingProvider>
                  <AppChrome>
                    {children}
                  </AppChrome>
                  <AuthErrorFromUrl />
                  <Toaster />
                </PwaOnboardingProvider>
              </FavoritesMergeProvider>
            </AppSerwistProvider>
          </BrowseCenterProvider>
        </AppThemeProvider>
      </body>
    </html>
  );
}
