import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
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
      <body className="bg-background text-on-background overflow-hidden">
        <header className="sticky top-0 z-50 w-full border-b border-outline-variant bg-surface">
          <div className="mx-auto flex max-w-[1200px] items-center justify-between px-gutter py-space-md">
            <button
              type="button"
              className="flex cursor-pointer items-center gap-space-sm transition-opacity active:opacity-80"
              aria-label="Menu"
            >
              <span className="material-symbols-outlined text-primary">menu</span>
            </button>
            <div className="text-h3 font-bold text-primary">手慢无</div>
            <button
              type="button"
              className="flex cursor-pointer items-center gap-space-sm transition-opacity active:opacity-80"
              aria-label="Cerca"
            >
              <span className="material-symbols-outlined text-primary">search</span>
            </button>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
