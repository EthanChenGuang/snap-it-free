import { messages } from '@/messages/it';

export default function SettingsPage() {
  return (
    <main className="mx-auto flex h-full max-w-container-max flex-col px-gutter py-space-lg pb-28">
      <div className="mb-space-lg border-b border-outline-variant pb-space-md">
        <p className="text-label-sm text-on-surface-variant">{messages.nav.settings}</p>
        <h1 className="text-h2 font-bold text-on-surface">{messages.settings.title}</h1>
      </div>

      <section className="rounded border border-outline-variant bg-surface">
        <div className="border-b border-outline-variant p-space-md">
          <div className="flex items-center gap-space-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-outline-variant bg-surface-container-high">
              <span className="material-symbols-outlined text-on-surface-variant">person</span>
            </div>
            <div>
              <h2 className="text-body-md font-semibold text-on-surface">
                {messages.settings.profileTitle}
              </h2>
              <p className="text-label-sm text-on-surface-variant">
                {messages.settings.profilePlaceholder}
              </p>
            </div>
          </div>
        </div>
        <div className="p-space-md">
          <p className="text-body-md text-on-surface-variant">{messages.settings.profileStub}</p>
        </div>
      </section>
    </main>
  );
}
