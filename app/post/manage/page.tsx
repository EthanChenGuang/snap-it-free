import { redirect } from 'next/navigation';
import { ManageListingsClient } from '@/components/ugc/ManageListingsClient';
import { getOwnerListings } from '@/lib/listings/queries';
import { createClient } from '@/lib/supabase/server';
import { messages } from '@/messages/it';

export default async function ManageListingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/post');
  }

  const listings = await getOwnerListings();

  return (
    <main className="mx-auto flex min-h-full max-w-[800px] flex-col px-gutter py-space-xl">
      <div className="mb-space-lg border-b border-outline-variant pb-space-md">
        <p className="text-label-sm text-on-surface-variant">{messages.nav.post}</p>
        <h1 className="text-h2 font-bold text-on-surface">{messages.manage.pageTitle}</h1>
      </div>

      <ManageListingsClient listings={listings} userId={user.id} />
    </main>
  );
}
