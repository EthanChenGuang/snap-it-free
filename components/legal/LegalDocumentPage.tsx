'use client';

import Link from 'next/link';

type LegalSection = {
  title: string;
  body: string;
};

type LegalDocumentPageProps = {
  title: string;
  lastUpdated: string;
  intro: string;
  sections: readonly LegalSection[];
  backHome: string;
};

export function LegalDocumentPage({
  title,
  lastUpdated,
  intro,
  sections,
  backHome,
}: LegalDocumentPageProps) {
  return (
    <main className="mx-auto flex min-h-full max-w-[720px] flex-col bg-surface px-gutter py-space-xl pb-28">
      <header className="mb-space-lg space-y-space-xs border-b border-outline-variant pb-space-lg">
        <h1 className="text-h2 font-semibold text-primary">{title}</h1>
        <p className="text-label-md text-on-surface-variant">{lastUpdated}</p>
      </header>

      <div className="space-y-space-lg text-body-md text-on-surface">
        <p className="text-secondary">{intro}</p>
        {sections.map((section) => (
          <section key={section.title} className="space-y-space-xs">
            <h2 className="text-body-md font-semibold text-primary">{section.title}</h2>
            <p className="text-secondary">{section.body}</p>
          </section>
        ))}
      </div>

      <Link
        href="/"
        className="mt-space-xl text-label-md text-on-surface-variant transition-colors hover:text-primary"
      >
        ← {backHome}
      </Link>
    </main>
  );
}
