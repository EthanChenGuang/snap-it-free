import { MessagesInboxClient } from '@/components/messages/MessagesInboxClient';

export default function MessagesPage() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-container-max flex-col">
      <MessagesInboxClient />
    </main>
  );
}
