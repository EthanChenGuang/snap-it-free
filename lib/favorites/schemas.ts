import { z } from 'zod';

export const FavoriteListingIdSchema = z.object({
  listingId: z.string().uuid(),
});

export const MergeFavoritesSchema = z.object({
  listingIds: z.array(z.string().uuid()).max(500),
});

export type FavoriteListingIdInput = z.infer<typeof FavoriteListingIdSchema>;
export type MergeFavoritesInput = z.infer<typeof MergeFavoritesSchema>;
