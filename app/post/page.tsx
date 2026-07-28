import Link from 'next/link';
import { messages } from '@/messages/it';

export default function PostPage() {
  return (
    <main className="mx-auto flex h-full max-w-container-max flex-col px-gutter py-space-lg pb-28">
      <div className="mb-space-lg border-b border-outline-variant pb-space-md">
        <p className="text-label-sm text-on-surface-variant">{messages.nav.post}</p>
        <h1 className="text-h2 font-bold text-on-surface">{messages.post.title}</h1>
      </div>

      <section className="flex flex-1 flex-col items-center justify-center gap-space-md rounded border border-outline-variant bg-surface px-gutter py-space-xl text-center">
        <span className="material-symbols-outlined text-4xl text-on-surface-variant">add_box</span>
        <div className="max-w-md space-y-space-sm">
          <h2 className="text-h3 font-bold text-on-surface">{messages.post.stubTitle}</h2>
          <p className="text-body-md text-on-surface-variant">{messages.post.stubDescription}</p>
          <p className="text-label-sm text-on-surface-variant">{messages.post.phaseNote}</p>
        </div>
        <Link
          href="/"
          className="mt-space-md rounded border border-primary bg-primary px-space-md py-space-sm text-label-md font-medium text-on-primary hover:bg-primary-container"
        >
          {messages.favorites.browseMap}
        </Link>
      </section>
    </main>
  );
}
