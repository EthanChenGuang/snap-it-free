import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { FavoritesMergeProvider } from '@/components/providers/FavoritesMergeProvider';
import { BottomNav } from '@/components/shell/BottomNav';
import { Header } from '@/components/shell/Header';
import { Toaster } from '@/components/ui/toaster';
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
    <html lang="it" className={inter.variable}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
          rel="stylesheet"
        />
      </head>
      <body className="overflow-hidden bg-background text-on-background">
        <FavoritesMergeProvider>
          <Header />
          <div className="app-main">{children}</div>
          <BottomNav />
          <Toaster />
        </FavoritesMergeProvider>
      </body>
    </html>
  );
}
